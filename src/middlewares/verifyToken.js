import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
    try {
        const token =
            req.cookies?.recipehub_token ||
            req.cookies?.token ||
            req.cookies?.jwt;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Please login first.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.email) {
            return res.status(401).json({
                success: false,
                message: "Invalid token payload.",
            });
        }

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};