import express from "express";
import mongoose from "mongoose";

import Recipe from "../models/recipe.model.js";
import Favorite from "../models/favorite.model.js";
import Bookmark from "../models/bookmark.model.js";
import Rating from "../models/rating.model.js";
import Report from "../models/report.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const getEmail = (req) => req.user.email.toLowerCase();
const getUserId = (req) => req.user.id || req.user._id || "";

/* ----------------------------- BOOKMARKS ----------------------------- */

// Check if current user bookmarked a recipe
router.get("/bookmarks/:recipeId/check", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const bookmark = await Bookmark.findOne({
            recipeId,
            userEmail: getEmail(req),
        });

        res.status(200).json({
            success: true,
            bookmarked: Boolean(bookmark),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to check bookmark",
            error: error.message,
        });
    }
});

// Toggle bookmark
router.patch("/bookmarks/:recipeId/toggle", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        const userEmail = getEmail(req);

        const existingBookmark = await Bookmark.findOne({
            recipeId,
            userEmail,
        });

        if (existingBookmark) {
            await Bookmark.deleteOne({ _id: existingBookmark._id });

            return res.status(200).json({
                success: true,
                bookmarked: false,
                message: "Recipe removed from bookmarks",
            });
        }

        await Bookmark.create({
            recipeId,
            userEmail,
            userId: getUserId(req),
        });

        res.status(201).json({
            success: true,
            bookmarked: true,
            message: "Recipe bookmarked successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to toggle bookmark",
            error: error.message,
        });
    }
});

// Dashboard bookmarks
router.get("/dashboard/bookmarks", verifyToken, async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({ userEmail: getEmail(req) })
            .sort({ addedAt: -1, createdAt: -1 })
            .populate({
                path: "recipeId",
                select:
                    "recipeName recipeImage category cuisineType difficultyLevel preparationTime likesCount authorName authorEmail status createdAt",
            })
            .lean();

        const recipes = bookmarks
            .filter((bookmark) => bookmark.recipeId)
            .map((bookmark) => ({
                bookmarkId: bookmark._id,
                addedAt: bookmark.addedAt || bookmark.createdAt,
                _id: bookmark.recipeId._id,
                recipeName: bookmark.recipeId.recipeName,
                recipeImage: bookmark.recipeId.recipeImage,
                category: bookmark.recipeId.category,
                cuisineType: bookmark.recipeId.cuisineType,
                difficultyLevel: bookmark.recipeId.difficultyLevel,
                preparationTime: bookmark.recipeId.preparationTime,
                likesCount: bookmark.recipeId.likesCount || 0,
                authorName: bookmark.recipeId.authorName,
                authorEmail: bookmark.recipeId.authorEmail,
                status: bookmark.recipeId.status || "active",
            }));

        res.status(200).json({
            success: true,
            count: recipes.length,
            data: recipes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load bookmarks",
            error: error.message,
        });
    }
});

// Remove bookmark from dashboard
router.delete("/dashboard/bookmarks/:recipeId", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        await Bookmark.deleteOne({
            recipeId,
            userEmail: getEmail(req),
        });

        res.status(200).json({
            success: true,
            message: "Recipe removed from bookmarks",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to remove bookmark",
            error: error.message,
        });
    }
});

/* ------------------------------ RATINGS ------------------------------ */

// Public rating summary
router.get("/ratings/:recipeId", async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipeObjectId = new mongoose.Types.ObjectId(recipeId);

        const [summary] = await Rating.aggregate([
            { $match: { recipeId: recipeObjectId } },
            {
                $group: {
                    _id: "$recipeId",
                    averageRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 },
                },
            },
        ]);

        const breakdown = await Rating.aggregate([
            { $match: { recipeId: recipeObjectId } },
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: -1 } },
        ]);

        const reviews = await Rating.find({
            recipeId,
            review: { $ne: "" },
        })
            .sort({ updatedAt: -1 })
            .limit(6)
            .select("userName rating review updatedAt")
            .lean();

        res.status(200).json({
            success: true,
            data: {
                averageRating: Number((summary?.averageRating || 0).toFixed(1)),
                totalRatings: summary?.totalRatings || 0,
                breakdown,
                reviews,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load ratings",
            error: error.message,
        });
    }
});

// Current user's rating
router.get("/ratings/:recipeId/me", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const rating = await Rating.findOne({
            recipeId,
            userEmail: getEmail(req),
        }).lean();

        res.status(200).json({
            success: true,
            data: rating,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load your rating",
            error: error.message,
        });
    }
});

// Add or update rating
router.post("/ratings/:recipeId", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;
        const { rating, review } = req.body;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const ratingNumber = Number(rating);

        if (!ratingNumber || ratingNumber < 1 || ratingNumber > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5",
            });
        }

        const recipe = await Recipe.findById(recipeId);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        const userEmail = getEmail(req);

        const savedRating = await Rating.findOneAndUpdate(
            {
                recipeId,
                userEmail,
            },
            {
                recipeId,
                userEmail,
                userId: getUserId(req),
                userName: req.user.name || userEmail.split("@")[0],
                rating: ratingNumber,
                review: review?.trim() || "",
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        res.status(200).json({
            success: true,
            message: "Rating saved successfully",
            data: savedRating,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to save rating",
            error: error.message,
        });
    }
});

// Delete current user's rating
router.delete("/ratings/:recipeId", verifyToken, async (req, res) => {
    try {
        const { recipeId } = req.params;

        if (!isValidObjectId(recipeId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        await Rating.deleteOne({
            recipeId,
            userEmail: getEmail(req),
        });

        res.status(200).json({
            success: true,
            message: "Rating removed successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to remove rating",
            error: error.message,
        });
    }
});

/* ----------------------------- ANALYTICS ----------------------------- */

router.get("/dashboard/analytics", verifyToken, async (req, res) => {
    try {
        const email = getEmail(req);

        const recipes = await Recipe.find({ authorEmail: email })
            .select("_id recipeName recipeImage category cuisineType likesCount createdAt")
            .lean();

        const recipeIds = recipes.map((recipe) => recipe._id);

        const [
            totalFavoritesOnMyRecipes,
            totalBookmarksOnMyRecipes,
            ratingSummary,
            totalReports,
            categoryBreakdown,
            monthlyRecipes,
            favoriteCounts,
            bookmarkCounts,
            ratingCounts,
        ] = await Promise.all([
            Favorite.countDocuments({ recipeId: { $in: recipeIds } }),
            Bookmark.countDocuments({ recipeId: { $in: recipeIds } }),
            Rating.aggregate([
                { $match: { recipeId: { $in: recipeIds } } },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: "$rating" },
                        totalRatings: { $sum: 1 },
                    },
                },
            ]),
            Report.countDocuments({ recipeId: { $in: recipeIds } }),
            Recipe.aggregate([
                { $match: { authorEmail: email } },
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                        likes: { $sum: "$likesCount" },
                    },
                },
                { $sort: { count: -1 } },
            ]),
            Recipe.aggregate([
                { $match: { authorEmail: email } },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: "%Y-%m",
                                date: "$createdAt",
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Favorite.aggregate([
                { $match: { recipeId: { $in: recipeIds } } },
                {
                    $group: {
                        _id: "$recipeId",
                        count: { $sum: 1 },
                    },
                },
            ]),
            Bookmark.aggregate([
                { $match: { recipeId: { $in: recipeIds } } },
                {
                    $group: {
                        _id: "$recipeId",
                        count: { $sum: 1 },
                    },
                },
            ]),
            Rating.aggregate([
                { $match: { recipeId: { $in: recipeIds } } },
                {
                    $group: {
                        _id: "$recipeId",
                        averageRating: { $avg: "$rating" },
                        totalRatings: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const favoriteMap = new Map(
            favoriteCounts.map((item) => [item._id.toString(), item.count])
        );

        const bookmarkMap = new Map(
            bookmarkCounts.map((item) => [item._id.toString(), item.count])
        );

        const ratingMap = new Map(
            ratingCounts.map((item) => [
                item._id.toString(),
                {
                    averageRating: Number(item.averageRating.toFixed(1)),
                    totalRatings: item.totalRatings,
                },
            ])
        );

        const topRecipes = recipes
            .map((recipe) => {
                const id = recipe._id.toString();

                return {
                    _id: recipe._id,
                    recipeName: recipe.recipeName,
                    recipeImage: recipe.recipeImage,
                    category: recipe.category,
                    cuisineType: recipe.cuisineType,
                    likesCount: recipe.likesCount || 0,
                    favoritesCount: favoriteMap.get(id) || 0,
                    bookmarksCount: bookmarkMap.get(id) || 0,
                    averageRating: ratingMap.get(id)?.averageRating || 0,
                    totalRatings: ratingMap.get(id)?.totalRatings || 0,
                };
            })
            .sort((a, b) => {
                const scoreA =
                    a.likesCount + a.favoritesCount + a.bookmarksCount + a.totalRatings;
                const scoreB =
                    b.likesCount + b.favoritesCount + b.bookmarksCount + b.totalRatings;

                return scoreB - scoreA;
            })
            .slice(0, 6);

        const totalLikesReceived = recipes.reduce(
            (sum, recipe) => sum + (recipe.likesCount || 0),
            0
        );

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRecipes: recipes.length,
                    totalLikesReceived,
                    totalFavoritesOnMyRecipes,
                    totalBookmarksOnMyRecipes,
                    totalRatings: ratingSummary[0]?.totalRatings || 0,
                    averageRating: Number(
                        (ratingSummary[0]?.averageRating || 0).toFixed(1)
                    ),
                    totalReports,
                },
                categoryBreakdown,
                monthlyRecipes,
                topRecipes,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load recipe analytics",
            error: error.message,
        });
    }
});

export default router;