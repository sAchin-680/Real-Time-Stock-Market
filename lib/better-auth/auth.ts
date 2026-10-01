import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { MongoClient, ObjectId } from "mongodb";
import { getSocialProviderConfig } from "@/lib/better-auth/providers";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";

// The client connects lazily on first query, so constructing it at import time
// is safe during `next build` (where no database is reachable).
const client = new MongoClient(process.env.MONGODB_URI?.trim() || "mongodb://127.0.0.1:27017/tickline", {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8_000,
});
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db),
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
    socialProviders: getSocialProviderConfig(),
    // Sign in with Apple posts its callback from Apple's domain.
    trustedOrigins: ["https://appleid.apple.com"],
    account: {
        // Signing in with Google/Apple/Microsoft using an existing email links to that account.
        accountLinking: { enabled: true, trustedProviders: ["google", "apple", "microsoft"] },
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: { enabled: true, window: 60, max: 60 },
    advanced: {
        useSecureCookies: process.env.NODE_ENV === "production",
    },
    databaseHooks: {
        account: {
            create: {
                // Email sign-ups send their welcome event (with profile answers) from the sign-up action;
                // OAuth sign-ups are welcomed here.
                after: async (account) => {
                    if (account.providerId === "credential") return;
                    try {
                        const id = String(account.userId);
                        const user = await db
                            .collection("user")
                            .findOne<{ email?: string; name?: string }>(ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id });
                        if (!user?.email) return;
                        await inngest.send({
                            name: "app/user.created",
                            data: { email: user.email, name: user.name || "there", country: "", investmentGoals: "Growth", riskTolerance: "Medium", preferredIndustry: "Technology" },
                        });
                    } catch (e) {
                        logger.warn("auth.social_welcome_failed", { error: e });
                    }
                },
            },
        },
    },
    plugins: [nextCookies()],
});
