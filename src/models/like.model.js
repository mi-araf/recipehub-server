import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
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
    },
    {
        timestamps: true,
    }
);

likeSchema.index({ userEmail: 1, recipeId: 1 }, { unique: true });

const Like = mongoose.models.Like || mongoose.model("Like", likeSchema);

export default Like;