import express from "express";

import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

router.get("/users/me", verifyToken, async (req, res) => {
    const user = await User.findOne({ email: req.user.email.toLowerCase() }).select(
        "-password"
    );

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
            { new: true, runValidators: true }
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
