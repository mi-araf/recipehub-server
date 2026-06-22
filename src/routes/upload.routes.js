import express from "express";
import multer from "multer";

import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }

        cb(null, true);
    },
});

router.post(
    "/upload/image",
    verifyToken,
    upload.single("image"),
    async (req, res) => {
        try {
            if (!process.env.IMGBB_API_KEY) {
                return res.status(500).json({
                    success: false,
                    message: "IMGBB_API_KEY is missing in server .env",
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please upload an image file",
                });
            }

            const formData = new FormData();

            const blob = new Blob([req.file.buffer], {
                type: req.file.mimetype,
            });

            formData.append("image", blob, req.file.originalname);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${process.env.IMGBB_API_KEY}`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                return res.status(500).json({
                    success: false,
                    message: result?.error?.message || "ImgBB upload failed",
                });
            }

            res.status(200).json({
                success: true,
                message: "Image uploaded successfully",
                data: {
                    url: result.data.display_url || result.data.url,
                    deleteUrl: result.data.delete_url,
                    thumbUrl: result.data.thumb?.url,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message || "Failed to upload image",
            });
        }
    }
);

export default router;