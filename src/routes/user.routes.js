import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

router.get("/users/me", verifyToken, async (req, res) => {
    res.status(200).json({
        success: true,
        data: req.user,
    });
});

export default router;