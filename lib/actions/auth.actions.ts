'use server';

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { auth } from "@/lib/better-auth/auth";
import { inngest } from "@/lib/inngest/client";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/server/session";
import { emailSchema } from "@/lib/validation";

type AuthResult = { success: true } | { success: false; error: string };

const authLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 });

const authErrorMessage = (e: unknown, fallback: string) =>
    e instanceof APIError && e.message ? e.message : fallback;

async function guard(email: string): Promise<string | null> {
    if (!emailSchema.safeParse(email).success) return 'Enter a valid email address';
    const ip = await getClientIp();
    if (!authLimiter.check(`${ip}:${email.toLowerCase()}`).allowed) {
        return 'Too many attempts. Please wait a few minutes and try again.';
    }
    return null;
}

export const signUpWithEmail = async ({ email, password, fullName, country, investmentGoals, riskTolerance, preferredIndustry }: SignUpFormData): Promise<AuthResult> => {
    const blocked = await guard(email);
    if (blocked) return { success: false, error: blocked };

    try {
        await auth.api.signUpEmail({ body: { email, password, name: fullName.trim() } });
    } catch (e) {
        logger.warn('auth.sign_up_failed', { error: e });
        return { success: false, error: authErrorMessage(e, 'Sign up failed. Please try again.') };
    }

    try {
        await inngest.send({
            name: 'app/user.created',
            data: { email, name: fullName, country, investmentGoals, riskTolerance, preferredIndustry },
        });
    } catch (e) {
        // The account exists; a missing welcome email must not fail sign up.
        logger.warn('auth.welcome_event_failed', { error: e });
    }

    return { success: true };
}

export const signInWithEmail = async ({ email, password }: SignInFormData): Promise<AuthResult> => {
    const blocked = await guard(email);
    if (blocked) return { success: false, error: blocked };

    try {
        await auth.api.signInEmail({ body: { email, password } });
        return { success: true };
    } catch (e) {
        logger.info('auth.sign_in_failed', { reason: e instanceof APIError ? e.message : 'unknown' });
        return { success: false, error: authErrorMessage(e, 'Invalid email or password') };
    }
}

export const signOut = async (): Promise<AuthResult> => {
    try {
        await auth.api.signOut({ headers: await headers() });
        return { success: true };
    } catch (e) {
        logger.warn('auth.sign_out_failed', { error: e });
        return { success: false, error: 'Sign out failed' };
    }
}
