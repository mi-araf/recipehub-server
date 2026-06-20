import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/dev-login", (req, res) => {
    const token = jwt.sign(
        {
            id: "demo-user-id",
            email: "demo@recipehub.dev",
            name: "Demo User",
            role: "user",
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d",
        }
    );

    res.cookie("recipehub_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
        success: true,
        message: "Temporary dev login successful",
    });
});

router.get("/dev-logout", (req, res) => {
    res.clearCookie("recipehub_token");

    res.status(200).json({
        success: true,
        message: "Temporary dev logout successful",
    });
});

export default router;