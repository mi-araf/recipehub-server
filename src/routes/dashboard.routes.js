import express from "express";
import mongoose from "mongoose";

import Recipe from "../models/recipe.model.js";
import Favorite from "../models/favorite.model.js";
import Like from "../models/like.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import Payment from "../models/payment.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const NORMAL_RECIPE_LIMIT = 2;
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getEmail = (req) => req.user.email.toLowerCase();

router.use("/dashboard", verifyToken);

router.get("/dashboard/overview", async (req, res) => {
    try {
        const email = getEmail(req);

        const [
            user,
            totalRecipes,
            totalFavorites,
            likesAggregation,
            purchasedRecipes,
            recentRecipes,
        ] = await Promise.all([
            User.findOne({ email }).select("-password"),
            Recipe.countDocuments({ authorEmail: email }),
            Favorite.countDocuments({ userEmail: email }),
            Recipe.aggregate([
                { $match: { authorEmail: email } },
                { $group: { _id: null, totalLikes: { $sum: "$likesCount" } } },
            ]),
            Payment.countDocuments({ userEmail: email, paymentStatus: "paid", recipeId: { $ne: null } }),
            Recipe.find({ authorEmail: email })
                .sort({ createdAt: -1 })
                .limit(4)
                .select("recipeName recipeImage category likesCount status createdAt"),
        ]);

        const totalLikesReceived = likesAggregation[0]?.totalLikes || 0;
        const isPremium = Boolean(user?.isPremium);
        const remainingRecipeSlots = isPremium
            ? "Unlimited"
            : Math.max(0, NORMAL_RECIPE_LIMIT - totalRecipes);

        res.status(200).json({
            success: true,
            data: {
                user,
                stats: {
                    totalRecipes,
                    totalFavorites,
                    totalLikesReceived,
                    purchasedRecipes,
                },
                limits: {
                    isPremium,
                    normalRecipeLimit: NORMAL_RECIPE_LIMIT,
                    remainingRecipeSlots,
                    canAddRecipe: isPremium || totalRecipes < NORMAL_RECIPE_LIMIT,
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

router.get("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid recipe id" });
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

        res.status(200).json({ success: true, data: recipe });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load recipe",
            error: error.message,
        });
    }
});

router.patch("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid recipe id" });
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
            { _id: id, authorEmail: getEmail(req) },
            updateData,
            { new: true, runValidators: true }
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

router.delete("/dashboard/my-recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: "Invalid recipe id" });
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

        await Promise.all([
            Favorite.deleteMany({ recipeId: id }),
            Like.deleteMany({ recipeId: id }),
            Report.deleteMany({ recipeId: id }),
        ]);

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

router.get("/dashboard/favorites", async (req, res) => {
    try {
        const favorites = await Favorite.find({ userEmail: getEmail(req) })
            .sort({ addedAt: -1 })
            .populate(
                "recipeId",
                "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName status"
            );

        const recipes = favorites
            .filter((item) => item.recipeId && item.recipeId.status === "active")
            .map((item) => ({
                favoriteId: item._id,
                addedAt: item.addedAt,
                ...item.recipeId.toObject(),
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

router.delete("/dashboard/favorites/:recipeId", async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({ success: false, message: "Invalid recipe id" });
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
        const payments = await Payment.find({
            userEmail: getEmail(req),
            paymentStatus: "paid",
            recipeId: { $ne: null },
        })
            .sort({ paidAt: -1 })
            .populate(
                "recipeId",
                "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName status"
            );

        const recipes = payments
            .filter((item) => item.recipeId && item.recipeId.status === "active")
            .map((item) => ({
                paymentId: item._id,
                amount: item.amount,
                transactionId: item.transactionId,
                paidAt: item.paidAt,
                ...item.recipeId.toObject(),
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
