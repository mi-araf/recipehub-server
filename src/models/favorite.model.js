import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
    {
        userEmail: {
            type: String,
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recipe",
            required: true,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

favoriteSchema.index({ userEmail: 1, recipeId: 1 }, { unique: true });

const Favorite =
    mongoose.models.Favorite || mongoose.model("Favorite", favoriteSchema);

export default Favorite;