import User from "../models/user.model.js";

export const verifyAdmin = async (req, res, next) => {
    try {
        const email = req.user?.email?.toLowerCase();

        if (!email) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access",
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

        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin access only",
            });
        }

        req.admin = user;
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to verify admin",
            error: error.message,
        });
    }
};