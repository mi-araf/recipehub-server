import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recipe",
            required: true,
        },
        reporterEmail: {
            type: String,
            required: true,
        },
        reason: {
            type: String,
            required: true,
            enum: ["Spam", "Offensive Content", "Copyright Issue"],
        },
        status: {
            type: String,
            enum: ["pending", "dismissed", "removed"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    }
);

const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

export default Report;