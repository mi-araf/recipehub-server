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

        paymentType: {
            type: String,
            enum: ["premium", "recipe"],
            required: true,
        },

        plan: {
            type: String,
            enum: ["plus", "premium", ""],
            default: "",
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        currency: {
            type: String,
            default: "usd",
        },

        recipeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Recipe",
            default: null,
        },

        stripeSessionId: {
            type: String,
            required: true,
            unique: true,
        },

        stripePaymentIntentId: {
            type: String,
            default: "",
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