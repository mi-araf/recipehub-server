import express from "express";
import mongoose from "mongoose";
import Recipe from "../models/recipe.model.js";
import Favorite from "../models/favorite.model.js";
import Report from "../models/report.model.js";
import Like from "../models/like.model.js";
import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.get("/recipes/featured", async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 6;

        const recipes = await Recipe.find({
            isFeatured: true,
            status: "active",
        })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .select(
                "recipeName recipeImage category cuisineType preparationTime likesCount authorName isFeatured"
            );

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch featured recipes",
            error: error.message,
        });
    }
});

router.get("/recipes/popular", async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 6;

        const recipes = await Recipe.find({
            status: "active",
        })
            .sort({ likesCount: -1, createdAt: -1 })
            .limit(limit)
            .select("recipeName recipeImage likesCount authorName category cuisineType");

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch popular recipes",
            error: error.message,
        });
    }
});

router.get("/recipes", async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const categories = req.query.categories
            ? req.query.categories.split(",").filter(Boolean)
            : [];

        const query = {
            status: "active",
        };

        if (categories.length > 0) {
            query.category = {
                $in: categories,
            };
        }

        const [recipes, total] = await Promise.all([
            Recipe.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select(
                    "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName"
                ),
            Recipe.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: recipes,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch recipes",
            error: error.message,
        });
    }
});

router.post("/recipes", verifyToken, async (req, res) => {
    try {
        const {
            recipeName,
            recipeImage,
            category,
            cuisineType,
            difficultyLevel,
            preparationTime,
            ingredients,
            instructions,
        } = req.body;

        if (
            !recipeName ||
            !recipeImage ||
            !category ||
            !cuisineType ||
            !difficultyLevel ||
            !preparationTime ||
            !ingredients ||
            !instructions
        ) {
            return res.status(400).json({
                success: false,
                message: "All recipe fields are required",
            });
        }

        const user = await User.findOne({
            email: req.user.email,
        });

        if (user?.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked",
            });
        }

        const isPremium = Boolean(user?.isPremium || req.user.isPremium);

        if (!isPremium) {
            const userRecipeCount = await Recipe.countDocuments({
                authorEmail: req.user.email,
            });

            if (userRecipeCount >= 2) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Normal users can add only 2 recipes. Become premium to add unlimited recipes.",
                });
            }
        }

        const recipe = await Recipe.create({
            recipeName,
            recipeImage,
            category,
            cuisineType,
            difficultyLevel,
            preparationTime,
            ingredients: Array.isArray(ingredients)
                ? ingredients
                : ingredients.split(",").map((item) => item.trim()).filter(Boolean),
            instructions,

            authorId: req.user.id || req.user._id || req.user.email,
            authorName: req.user.name || user?.name || "RecipeHub User",
            authorEmail: req.user.email,

            likesCount: 0,
            isFeatured: false,
            status: "active",
        });

        res.status(201).json({
            success: true,
            message: "Recipe added successfully",
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to add recipe",
            error: error.message,
        });
    }
});

router.get("/recipes/:id", async (req, res) => {
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
            status: "active",
        });

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        res.status(200).json({
            success: true,
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch recipe details",
            error: error.message,
        });
    }
});

router.get("/recipes/:id/interaction-status", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const [likedRecipe, favoriteRecipe] = await Promise.all([
            Like.findOne({
                recipeId: id,
                userEmail: req.user.email,
            }),
            Favorite.findOne({
                recipeId: id,
                userEmail: req.user.email,
            }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                hasLiked: Boolean(likedRecipe),
                isFavorited: Boolean(favoriteRecipe),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to check interaction status",
            error: error.message,
        });
    }
});

router.patch("/recipes/:id/like", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const existingLike = await Like.findOne({
            recipeId: id,
            userEmail: req.user.email,
        });

        let recipe;
        let hasLiked;

        if (existingLike) {
            await Like.deleteOne({
                _id: existingLike._id,
            });

            recipe = await Recipe.findByIdAndUpdate(
                id,
                {
                    $inc: {
                        likesCount: -1,
                    },
                },
                {
                    new: true,
                }
            );

            hasLiked = false;
        } else {
            await Like.create({
                recipeId: id,
                userEmail: req.user.email,
                userId: req.user.id || req.user._id || req.user.email,
            });

            recipe = await Recipe.findByIdAndUpdate(
                id,
                {
                    $inc: {
                        likesCount: 1,
                    },
                },
                {
                    new: true,
                }
            );

            hasLiked = true;
        }

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        if (recipe.likesCount < 0) {
            recipe.likesCount = 0;
            await recipe.save();
        }

        res.status(200).json({
            success: true,
            message: hasLiked ? "Recipe liked" : "Recipe unliked",
            hasLiked,
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update like",
            error: error.message,
        });
    }
});

router.patch("/favorites/:recipeId/toggle", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const existingFavorite = await Favorite.findOne({
            recipeId,
            userEmail: req.user.email,
        });

        if (existingFavorite) {
            await Favorite.deleteOne({
                _id: existingFavorite._id,
            });

            return res.status(200).json({
                success: true,
                message: "Removed from favorites",
                isFavorited: false,
            });
        }

        const favorite = await Favorite.create({
            recipeId,
            userEmail: req.user.email,
            userId: req.user.id || req.user._id || req.user.email,
        });

        res.status(201).json({
            success: true,
            message: "Added to favorites",
            isFavorited: true,
            data: favorite,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update favorite",
            error: error.message,
        });
    }
});

router.post("/reports", verifyToken, async (req, res) => {
    try {
        const { recipeId, reason } = req.body;

        if (!recipeId || !reason) {
            return res.status(400).json({
                success: false,
                message: "recipeId and reason are required",
            });
        }

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const allowedReasons = ["Spam", "Offensive Content", "Copyright Issue"];

        if (!allowedReasons.includes(reason)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report reason",
            });
        }

        const existingReport = await Report.findOne({
            recipeId,
            reporterEmail: req.user.email,
            status: "pending",
        });

        if (existingReport) {
            return res.status(409).json({
                success: false,
                message: "You already reported this recipe",
            });
        }

        const report = await Report.create({
            recipeId,
            reporterEmail: req.user.email,
            reason,
        });

        res.status(201).json({
            success: true,
            message: "Recipe reported successfully",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to report recipe",
            error: error.message,
        });
    }
});

export default router;