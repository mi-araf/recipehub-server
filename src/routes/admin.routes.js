import express from "express";
import mongoose from "mongoose";

import User from "../models/user.model.js";
import Recipe from "../models/recipe.model.js";
import Favorite from "../models/favorite.model.js";
import Like from "../models/like.model.js";
import Report from "../models/report.model.js";
import Payment from "../models/payment.model.js";
import Bookmark from "../models/bookmark.model.js";
import Rating from "../models/rating.model.js";

import { verifyToken } from "../middlewares/verifyToken.js";
import { verifyAdmin } from "../middlewares/verifyAdmin.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

router.use("/admin", verifyToken, verifyAdmin);

/* -------------------------------- OVERVIEW -------------------------------- */

router.get("/admin/overview", async (req, res) => {
    try {
        const [
            totalUsers,
            totalRecipes,
            totalPremiumMembers,
            totalReports,
            totalPendingReports,
            totalTransactions,
            revenueData,
            recentUsers,
            recentReports,
        ] = await Promise.all([
            User.countDocuments(),
            Recipe.countDocuments(),
            User.countDocuments({ isPremium: true }),
            Report.countDocuments(),
            Report.countDocuments({ status: "pending" }),
            Payment.countDocuments(),
            Payment.aggregate([
                { $match: { paymentStatus: "paid" } },
                { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
            ]),
            User.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .select("name email image role isBlocked isPremium createdAt"),
            Report.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("recipeId", "recipeName recipeImage")
                .select("recipeId reporterEmail reason status createdAt"),
        ]);

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalUsers,
                    totalRecipes,
                    totalPremiumMembers,
                    totalReports,
                    totalPendingReports,
                    totalTransactions,
                    totalRevenue: revenueData[0]?.totalRevenue || 0,
                },
                recentUsers,
                recentReports,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load admin overview",
            error: error.message,
        });
    }
});

/* ------------------------------- MANAGE USERS ------------------------------ */

router.get("/admin/users", async (req, res) => {
    try {
        const { search = "", page = 1, limit = 10 } = req.query;

        const currentPage = Number(page);
        const perPage = Number(limit);
        const skip = (currentPage - 1) * perPage;

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .select("-password"),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total,
                page: currentPage,
                limit: perPage,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load users",
            error: error.message,
        });
    }
});

router.patch("/admin/users/:id/block", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        if (req.admin._id.toString() === id) {
            return res.status(400).json({
                success: false,
                message: "You cannot block yourself",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isBlocked: true },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User blocked successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to block user",
            error: error.message,
        });
    }
});

router.patch("/admin/users/:id/unblock", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user id",
            });
        }

        const user = await User.findByIdAndUpdate(
            id,
            { isBlocked: false },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "User unblocked successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to unblock user",
            error: error.message,
        });
    }
});

/* ------------------------------ MANAGE RECIPES ----------------------------- */

router.get("/admin/recipes", async (req, res) => {
    try {
        const {
            search = "",
            status = "",
            featured = "",
            page = 1,
            limit = 10,
        } = req.query;

        const currentPage = Number(page);
        const perPage = Number(limit);
        const skip = (currentPage - 1) * perPage;

        const query = {};

        if (search) {
            query.$or = [
                { recipeName: { $regex: search, $options: "i" } },
                { authorName: { $regex: search, $options: "i" } },
                { authorEmail: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.status = status;
        }

        if (featured === "true") {
            query.isFeatured = true;
        }

        if (featured === "false") {
            query.isFeatured = false;
        }

        const [recipes, total] = await Promise.all([
            Recipe.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .select(
                    "recipeName recipeImage category cuisineType difficultyLevel preparationTime authorName authorEmail likesCount isFeatured status createdAt"
                ),
            Recipe.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: recipes,
            pagination: {
                total,
                page: currentPage,
                limit: perPage,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load recipes",
            error: error.message,
        });
    }
});

router.get("/admin/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipe = await Recipe.findById(id);

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
            message: "Failed to load recipe",
            error: error.message,
        });
    }
});

router.patch("/admin/recipes/:id", async (req, res) => {
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
            "status",
            "isFeatured",
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

        const recipe = await Recipe.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
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

router.patch("/admin/recipes/:id/feature", async (req, res) => {
    try {
        const { id } = req.params;
        const { isFeatured } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const nextFeaturedValue = Boolean(isFeatured);

        const updateData = {
            isFeatured: nextFeaturedValue,
        };

        // Home featured section only shows active recipes.
        // So when admin features a recipe, make it active too.
        if (nextFeaturedValue) {
            updateData.status = "active";
        }

        const recipe = await Recipe.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select(
            "recipeName recipeImage category cuisineType difficultyLevel preparationTime authorName authorEmail likesCount isFeatured status createdAt updatedAt"
        );

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        res.status(200).json({
            success: true,
            message: recipe.isFeatured
                ? "Recipe added to featured section"
                : "Recipe removed from featured section",
            data: recipe,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update featured status",
            error: error.message,
        });
    }
});

router.delete("/admin/recipes/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid recipe id",
            });
        }

        const recipe = await Recipe.findByIdAndDelete(id);

        if (!recipe) {
            return res.status(404).json({
                success: false,
                message: "Recipe not found",
            });
        }

        await Promise.all([
            Favorite.deleteMany({ recipeId: id }),
            Like.deleteMany({ recipeId: id }),
            Report.updateMany(
                { recipeId: id },
                { status: "resolved", adminNote: "Recipe removed by admin" }
            ),
            Bookmark.deleteMany({ recipeId: id }),
            Rating.deleteMany({ recipeId: id }),
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

/* -------------------------------- REPORTS -------------------------------- */

router.get("/admin/reports", async (req, res) => {
    try {
        const { status = "", page = 1, limit = 10 } = req.query;

        const currentPage = Number(page);
        const perPage = Number(limit);
        const skip = (currentPage - 1) * perPage;

        const query = {};

        if (status) {
            query.status = status;
        }

        const [reports, total] = await Promise.all([
            Report.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .populate(
                    "recipeId",
                    "recipeName recipeImage authorName authorEmail category status"
                )
                .lean(),
            Report.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: reports,
            pagination: {
                total,
                page: currentPage,
                limit: perPage,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load reports",
            error: error.message,
        });
    }
});

router.patch("/admin/reports/:id/dismiss", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report id",
            });
        }

        const report = await Report.findByIdAndUpdate(
            id,
            {
                status: "dismissed",
                adminNote: "Report dismissed by admin",
            },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Report not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Report dismissed",
            data: report,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to dismiss report",
            error: error.message,
        });
    }
});

router.delete("/admin/reports/:id/remove-recipe", async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid report id",
            });
        }

        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                message: "Report not found",
            });
        }

        const recipeId = report.recipeId;

        if (!recipeId) {
            report.status = "removed";
            await report.save();

            return res.status(200).json({
                success: true,
                message: "Report marked as removed",
            });
        }

        const recipe = await Recipe.findById(recipeId);

        // If recipe is already deleted, just mark all reports for this recipe as removed.
        if (!recipe) {
            await Report.updateMany(
                { recipeId },
                {
                    status: "removed",
                }
            );

            return res.status(200).json({
                success: true,
                message: "Recipe was already removed. Reports updated.",
            });
        }

        await Promise.all([
            Recipe.findByIdAndDelete(recipeId),
            Favorite.deleteMany({ recipeId }),
            Like.deleteMany({ recipeId }),
            Bookmark.deleteMany({ recipeId }),
            Rating.deleteMany({ recipeId }),
            Report.updateMany(
                { recipeId },
                {
                    status: "removed",
                }
            ),
        ]);

        res.status(200).json({
            success: true,
            message: "Reported recipe removed successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to remove reported recipe",
            error: error.message,
        });
    }
});

/* ------------------------------ TRANSACTIONS ------------------------------ */

router.get("/admin/transactions", async (req, res) => {
    try {
        const { status = "", page = 1, limit = 10 } = req.query;

        const currentPage = Number(page);
        const perPage = Number(limit);
        const skip = (currentPage - 1) * perPage;

        const query = {};

        if (status) {
            query.paymentStatus = status;
        }

        const [transactions, total] = await Promise.all([
            Payment.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .populate("recipeId", "recipeName recipeImage")
                .lean(),
            Payment.countDocuments(query),
        ]);

        res.status(200).json({
            success: true,
            data: transactions,
            pagination: {
                total,
                page: currentPage,
                limit: perPage,
                totalPages: Math.ceil(total / perPage),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load transactions",
            error: error.message,
        });
    }
});

export default router;