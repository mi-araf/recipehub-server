import express from "express";
import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const createToken = (user) => {
    return jwt.sign(
        {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            isPremium: user.isPremium,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const setAuthCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === "production";

    res.cookie("recipehub_token", token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

router.get("/users/me", verifyToken, async (req, res) => {
    try {
        const user = await User.findOne({
            email: req.user.email.toLowerCase(),
        }).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load profile",
            error: error.message,
        });
    }
});

router.patch("/users/me", verifyToken, async (req, res) => {
    try {
        const { name, image } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required",
            });
        }

        const user = await User.findOneAndUpdate(
            { email: req.user.email.toLowerCase() },
            {
                name: name.trim(),
                image: image?.trim() || "",
            },
            {
                new: true,
                runValidators: true,
            }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            error: error.message,
        });
    }
});

export default router;