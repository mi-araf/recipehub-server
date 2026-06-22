import express from "express";
import mongoose from "mongoose";

import Recipe from "../models/recipe.model.js";
import Favorite from "../models/favorite.model.js";
import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import Payment from "../models/payment.model.js";

const router = express.Router();

const FREE_RECIPE_LIMIT = 2;
const PLUS_RECIPE_LIMIT = 40;

const getPlan = (user) => {
    if (user?.role === "admin") return "admin";
    if (user?.premiumPlan === "premium") return "premium";
    if (user?.premiumPlan === "plus") return "plus";
    return "free";
};

const getRecipeLimit = (plan) => {
    if (plan === "admin") return "Unlimited";
    if (plan === "premium") return "Unlimited";
    if (plan === "plus") return PLUS_RECIPE_LIMIT;
    return FREE_RECIPE_LIMIT;
};

const getPlanLabel = (plan) => {
    if (plan === "admin") return "Admin";
    if (plan === "premium") return "Premium Chef";
    if (plan === "plus") return "Plus Chef";
    return "Free Chef";
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getEmail = (req) => req.user.email.toLowerCase();

router.use("/dashboard", verifyToken);

// Dashboard overview
router.get("/dashboard/overview", async (req, res) => {
    try {
        const email = getEmail(req);

        const [
            user,
            totalRecipes,
            validFavoritesAggregation,
            likesAggregation,
            recentRecipes,
        ] = await Promise.all([
            User.findOne({ email }).select("-password"),

            Recipe.countDocuments({ authorEmail: email }),

            Favorite.aggregate([
                {
                    $match: {
                        userEmail: email,
                    },
                },
                {
                    $lookup: {
                        from: "recipes",
                        localField: "recipeId",
                        foreignField: "_id",
                        as: "recipe",
                    },
                },
                {
                    $unwind: "$recipe",
                },
                {
                    $match: {
                        "recipe.status": "active",
                    },
                },
                {
                    $count: "totalFavorites",
                },
            ]),

            Recipe.aggregate([
                { $match: { authorEmail: email } },
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: "$likesCount" },
                    },
                },
            ]),

            Recipe.find({ authorEmail: email })
                .sort({ createdAt: -1 })
                .limit(4)
                .select("recipeName recipeImage category likesCount status createdAt"),
        ]);

        const totalFavorites =
            validFavoritesAggregation[0]?.totalFavorites || 0;

        const totalLikesReceived = likesAggregation[0]?.totalLikes || 0;

        const plan = getPlan(user);
        const recipeLimit = getRecipeLimit(plan);
        const isUnlimited = recipeLimit === "Unlimited";

        res.status(200).json({
            success: true,
            data: {
                user,

                stats: {
                    totalRecipes,
                    totalFavorites,
                    totalLikesReceived,
                    purchasedRecipes: 0,
                },

                membership: {
                    plan,
                    label: getPlanLabel(plan),
                    isPaidMember: plan === "plus" || plan === "premium",
                    isPlus: plan === "plus",
                    isPremium: plan === "premium",
                },

                limits: {
                    plan,
                    planLabel: getPlanLabel(plan),
                    recipeLimit,
                    freeRecipeLimit: FREE_RECIPE_LIMIT,
                    plusRecipeLimit: PLUS_RECIPE_LIMIT,
                    remainingRecipeSlots: isUnlimited
                        ? "Unlimited"
                        : Math.max(0, recipeLimit - totalRecipes),
                    canAddRecipe: isUnlimited || totalRecipes < recipeLimit,
                },

                recentRecipes,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard overview",
            error: error.message,
        });
    }
});

// My recipes
router.get("/dashboard/my-recipes", async (req, res) => {
    try {
        const recipes = await Recipe.find({ authorEmail: getEmail(req) })
            .sort({ createdAt: -1 })
            .select(
                "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount isFeatured status createdAt"
            );

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load your recipes",
            error: error.message,
        });
    }
});

// Single own recipe
router.get("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipe = await Recipe.findOne({
            _id: id,
            authorEmail: getEmail(req),
        });

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found or you do not own it",
            });
        }

        res.status(200).json({
            success: true,
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load recipe",
            error: error.message,
        });
    }
});

// Update own recipe
router.patch("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const allowedFields = [
            "recipeName",
            "recipeImage",
            "category",
            "cuisineType",
            "difficultyLevel",
            "preparationTime",
            "ingredients",
            "instructions",
        ];

        const updateData = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (typeof updateData.ingredients === "string") {
            updateData.ingredients = updateData.ingredients
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
        }

        const recipe = await Recipe.findOneAndUpdate(
            {
                _id: id,
                authorEmail: getEmail(req),
            },
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found or you do not own it",
            });
        }

        res.status(200).json({
            success: true,
            message: "Recipe updated successfully",
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update recipe",
            error: error.message,
        });
    }
});

// Delete own recipe
router.delete("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipe = await Recipe.findOneAndDelete({
            _id: id,
            authorEmail: getEmail(req),
        });

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found or you do not own it",
            });
        }

        await Favorite.deleteMany({ recipeId: id });

        res.status(200).json({
            success: true,
            message: "Recipe deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete recipe",
            error: error.message,
        });
    }
});

// Favorites
router.get("/dashboard/favorites", async (req, res) => {
    try {
        const email = getEmail(req);

        const favorites = await Favorite.find({ userEmail: email })
            .sort({ addedAt: -1, createdAt: -1 })
            .populate({
                path: "recipeId",
                select:
                    "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName authorEmail status createdAt",
            })
            .lean();

        const recipes = favorites.filter(
                (favorite) =>
                    favorite.recipeId && favorite.recipeId.status === "active"
            ).map((favorite) => ({
                favoriteId: favorite._id,
                addedAt: favorite.addedAt || favorite.createdAt,
                _id: favorite.recipeId._id,
                recipeName: favorite.recipeId.recipeName,
                recipeImage: favorite.recipeId.recipeImage,
                category: favorite.recipeId.category,
                cuisineType: favorite.recipeId.cuisineType,
                difficultyLevel: favorite.recipeId.difficultyLevel,
                preparationTime: favorite.recipeId.preparationTime,
                likesCount: favorite.recipeId.likesCount || 0,
                authorName: favorite.recipeId.authorName,
                authorEmail: favorite.recipeId.authorEmail,
                status: favorite.recipeId.status || "active",
            }));

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load favorites",
            error: error.message,
        });
    }
});

// Remove favorite
router.delete("/dashboard/favorites/:recipeId", async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        await Favorite.deleteOne({
            recipeId,
            userEmail: getEmail(req),
        });

        res.status(200).json({
            success: true,
            message: "Recipe removed from favorites",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to remove favorite",
            error: error.message,
        });
    }
});

router.get("/dashboard/purchased-recipes", async (req, res) => {
    try {
        const email = getEmail(req);

        const payments = await Payment.find({
            userEmail: email,
            paymentType: "recipe",
            paymentStatus: "paid",
            recipeId: { $ne: null },
        })
            .sort({ paidAt: -1, createdAt: -1 })
            .populate(
                "recipeId",
                "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName authorEmail status"
            )
            .lean();

        const recipes = payments
            .filter((payment) => payment.recipeId)
            .map((payment) => ({
                paymentId: payment._id,
                amount: payment.amount,
                currency: payment.currency,
                transactionId: payment.transactionId,
                paidAt: payment.paidAt,
                _id: payment.recipeId._id,
                recipeName: payment.recipeId.recipeName,
                recipeImage: payment.recipeId.recipeImage,
                category: payment.recipeId.category,
                cuisineType: payment.recipeId.cuisineType,
                difficultyLevel: payment.recipeId.difficultyLevel,
                preparationTime: payment.recipeId.preparationTime,
                likesCount: payment.recipeId.likesCount || 0,
                authorName: payment.recipeId.authorName,
                authorEmail: payment.recipeId.authorEmail,
                status: payment.recipeId.status || "active",
            }));

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load purchased recipes",
            error: error.message,
        });
    }
});

export default router;