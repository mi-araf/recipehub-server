import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
    {
        userEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        userId: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recipe",
            default: null,
        },
        transactionId: {
            type: String,
            required: true,
            unique: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        paidAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

const Payment =
    mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
