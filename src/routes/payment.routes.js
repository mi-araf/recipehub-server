import express from "express";
import Stripe from "stripe";
import mongoose from "mongoose";

import Payment from "../models/payment.model.js";
import Recipe from "../models/recipe.model.js";
import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const RECIPE_PRICE_CENTS = 299;

const plans = {
    plus: {
        name: "RecipeHub Plus Membership",
        amount: 499,
        description: "Plus membership for active recipe lovers.",
    },
    premium: {
        name: "RecipeHub Premium Membership",
        amount: 999,
        description:
            "Premium membership with profile badge and unlimited recipe publishing.",
    },
};

const getEmail = (req) => req.user.email.toLowerCase();
const getUserId = (req) => req.user.id || req.user._id || "";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ------------------------ PREMIUM CHECKOUT ------------------------ */

router.post(
    "/payments/create-premium-checkout-session",
    verifyToken,
    async (req, res) => {
        try {
            const email = getEmail(req);
            const { plan = "premium" } = req.body;

            const selectedPlan = plans[plan];

            if (!selectedPlan) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid premium plan",
                });
            }

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            if (user.isPremium && user.premiumPlan === plan) {
                return res.status(200).json({
                    success: true,
                    alreadyPremium: true,
                    message: "You already have this membership plan",
                });
            }

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                customer_email: email,

                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            unit_amount: selectedPlan.amount,
                            product_data: {
                                name: selectedPlan.name,
                                description: selectedPlan.description,
                            },
                        },
                        quantity: 1,
                    },
                ],

                success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${CLIENT_URL}/dashboard/premium?payment=cancelled`,

                metadata: {
                    paymentType: "premium",
                    plan,
                    userEmail: email,
                    userId: getUserId(req),
                },
            });

            res.status(200).json({
                success: true,
                url: session.url,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to create premium checkout session",
                error: error.message,
            });
        }
    }
);

/* ------------------------ RECIPE PURCHASE CHECKOUT ------------------------ */

router.post(
    "/payments/create-recipe-checkout-session/:recipeId",
    verifyToken,
    async (req, res) => {
        try {
            const { recipeId } = req.params;
            const email = getEmail(req);

            if (!isValidObjectId(recipeId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid recipe id",
                });
            }

            const recipe = await Recipe.findById(recipeId);

            if (!recipe || recipe.status !== "active") {
                return res.status(404).json({
                    success: false,
                    message: "Recipe not found",
                });
            }

            if (recipe.authorEmail?.toLowerCase() === email) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot purchase your own recipe",
                });
            }

            const existingPayment = await Payment.findOne({
                userEmail: email,
                recipeId,
                paymentType: "recipe",
                paymentStatus: "paid",
            });

            if (existingPayment) {
                return res.status(200).json({
                    success: true,
                    alreadyPurchased: true,
                    message: "You already purchased this recipe",
                });
            }

            const session = await stripe.checkout.sessions.create({
                mode: "payment",
                payment_method_types: ["card"],
                customer_email: email,

                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            unit_amount: RECIPE_PRICE_CENTS,
                            product_data: {
                                name: recipe.recipeName,
                                description: `Recipe by ${recipe.authorName}`,
                                images: recipe.recipeImage ? [recipe.recipeImage] : [],
                            },
                        },
                        quantity: 1,
                    },
                ],

                success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${CLIENT_URL}/recipes/${recipeId}?payment=cancelled`,

                metadata: {
                    paymentType: "recipe",
                    recipeId: recipe._id.toString(),
                    userEmail: email,
                    userId: getUserId(req),
                },
            });

            res.status(200).json({
                success: true,
                url: session.url,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Failed to create recipe checkout session",
                error: error.message,
            });
        }
    }
);

/* ------------------------ VERIFY PAYMENT SUCCESS ------------------------ */

router.get("/payments/verify-session", verifyToken, async (req, res) => {
    try {
        const { session_id } = req.query;

        if (!session_id) {
            return res.status(400).json({
                success: false,
                message: "Missing Stripe session id",
            });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status !== "paid") {
            return res.status(400).json({
                success: false,
                message: "Payment is not completed yet",
            });
        }

        const metadata = session.metadata || {};
        const email = getEmail(req);

        if (metadata.userEmail?.toLowerCase() !== email) {
            return res.status(403).json({
                success: false,
                message: "This payment does not belong to your account",
            });
        }

        const amount = (session.amount_total || 0) / 100;
        const transactionId = session.payment_intent || session.id;

        const payment = await Payment.findOneAndUpdate(
            { stripeSessionId: session.id },
            {
                $setOnInsert: {
                    userEmail: email,
                    userId: metadata.userId || getUserId(req),
                    paymentType: metadata.paymentType,
                    plan: metadata.plan || "",
                    amount,
                    currency: session.currency || "usd",
                    recipeId: metadata.recipeId || null,
                    stripeSessionId: session.id,
                    stripePaymentIntentId: session.payment_intent || "",
                    transactionId,
                    paymentStatus: "paid",
                    paidAt: new Date(),
                },
            },
            {
                upsert: true,
                new: true,
            }
        );

        if (metadata.paymentType === "premium") {
            await User.findOneAndUpdate(
                { email },
                {
                    isPremium: true,
                    premiumPlan: metadata.plan || "premium",
                    premiumSince: new Date(),
                },
                { new: true }
            );
        }

        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            data: payment,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to verify payment",
            error: error.message,
        });
    }
});

export default router;