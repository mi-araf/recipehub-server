import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema(
    {
        recipeName: {
            type: String,
            required: true,
            trim: true,
        },
        recipeImage: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        cuisineType: {
            type: String,
            required: true,
            trim: true,
        },
        difficultyLevel: {
            type: String,
            required: true,
            enum: ["Easy", "Medium", "Hard"],
        },
        preparationTime: {
            type: String,
            required: true,
        },
        ingredients: {
            type: [String],
            required: true,
        },
        instructions: {
            type: String,
            required: true,
        },

        authorId: {
            type: String,
            required: true,
        },
        authorName: {
            type: String,
            required: true,
        },
        authorEmail: {
            type: String,
            required: true,
        },

        likesCount: {
            type: Number,
            default: 0,
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["active", "pending", "blocked"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

const Recipe = mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema);

export default Recipe;