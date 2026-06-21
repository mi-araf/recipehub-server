import "dotenv/config";
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from .env file");
}

const client = new MongoClient(mongoUri);
await client.connect();

const db = client.db();

export const auth = betterAuth({
    baseURL: "http://localhost:5000",
    basePath: "/api/auth",
    secret: process.env.BETTER_AUTH_SECRET,

    trustedOrigins: ["http://localhost:3000"],

    database: mongodbAdapter(db),

    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account",
        },
    },
});