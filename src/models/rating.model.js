import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema(
    {
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recipe",
            required: true,
        },
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        userId: {
            type: String,
            default: "",
        },
        userName: {
            type: String,
            default: "RecipeHub User",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        review: {
            type: String,
            default: "",
            maxlength: 500,
        },
    },
    { timestamps: true }
);

ratingSchema.index({ recipeId: 1, userEmail: 1 }, { unique: true });

const Rating = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);

export default Rating;