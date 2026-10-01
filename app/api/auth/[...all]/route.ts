import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/better-auth/auth";

// OAuth redirects and callbacks (/api/auth/sign-in/social, /api/auth/callback/:provider, …).
export const { GET, POST } = toNextJsHandler(auth);
