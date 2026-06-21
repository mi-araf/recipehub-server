import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";

import { connectDB } from "./config/db.js";
import { auth } from "./config/better-auth.js";

import jwtAuthRoutes from "./routes/jwtAuth.routes.js";
import recipeRoutes from "./routes/recipe.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(cookieParser());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("RecipeHub server is running");
});

app.use("/api/jwt", jwtAuthRoutes);
app.use("/api", recipeRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", userRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
        path: req.originalUrl,
    });
});

app.use((err, req, res, next) => {
    console.error("Server Error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
    });
});

app.listen(port, () => {
    console.log(`RecipeHub server running on port ${port}`);
});