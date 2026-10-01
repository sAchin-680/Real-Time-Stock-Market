import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient } from "mongodb";

// The client connects lazily on first query, so constructing it at import time
// is safe during `next build` (where no database is reachable).
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/signalist", {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8_000,
});

export const auth = betterAuth({
    database: mongodbAdapter(client.db()),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
        enabled: true,
        disableSignUp: false,
        requireEmailVerification: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
        autoSignIn: true,
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [nextCookies()],
});
