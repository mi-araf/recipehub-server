import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fromNodeHeaders } from "better-auth/node";

import User from "../models/user.model.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { auth } from "../config/better-auth.js";

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
        {
            expiresIn: "7d",
        }
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

router.post("/register", async (req, res) => {
    try {
        const { name, email, image, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required",
            });
        }

        const hasMinLength = password.length >= 6;
        const hasUppercase = /[A-Z]/.test(password);
        const hasLowercase = /[a-z]/.test(password);

        if (!hasMinLength || !hasUppercase || !hasLowercase) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters and include uppercase and lowercase letters",
            });
        }

        const existingUser = await User.findOne({
            email: email.toLowerCase(),
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            image,
            password: hashedPassword,
            role: "user",
            isBlocked: false,
            isPremium: false,
        });

        const token = createToken(user);
        setAuthCookie(res, token);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message,
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({
            email: email?.toLowerCase(),
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked",
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password || "");

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const token = createToken(user);
        setAuthCookie(res, token);

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Login failed",
            error: error.message,
        });
    }
});

router.post("/logout", (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("recipehub_token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });

    res.status(200).json({
        success: true,
        message: "Logout successful",
    });
});

router.get("/me", verifyToken, async (req, res) => {
    try {
        const email = req.user?.email?.toLowerCase();

        if (!email) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const user = await User.findOne({ email }).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked",
            });
        }

        res.status(200).json({
            success: true,
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role || "user",
                isBlocked: Boolean(user.isBlocked),
                isPremium: Boolean(user.isPremium),
                premiumPlan: user.premiumPlan || "free",
                premiumSince: user.premiumSince || null,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to load current user",
            error: error.message,
        });
    }
});

router.post("/google-sync", async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (!session?.user?.email) {
            return res.status(401).json({
                success: false,
                message: "Google session not found",
            });
        }

        const googleUser = session.user;

        const user = await User.findOneAndUpdate(
            {
                email: googleUser.email.toLowerCase(),
            },
            {
                $setOnInsert: {
                    name: googleUser.name || "Google User",
                    email: googleUser.email.toLowerCase(),
                    image: googleUser.image || "",
                    role: "user",
                    isBlocked: false,
                    isPremium: false,
                },
            },
            {
                upsert: true,
                new: true,
            }
        );

        if (user.isBlocked) {
            return res.status(403).json({
                success: false,
                message: "Your account is blocked",
            });
        }

        const token = createToken(user);
        setAuthCookie(res, token);

        res.status(200).json({
            success: true,
            message: "Google login synced successfully",
            data: user,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Google sync failed",
            error: error.message,
        });
    }
});

export default router;