import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema(
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
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

bookmarkSchema.index({ recipeId: 1, userEmail: 1 }, { unique: true });

const Bookmark =
    mongoose.models.Bookmark || mongoose.model("Bookmark", bookmarkSchema);

export default Bookmark;