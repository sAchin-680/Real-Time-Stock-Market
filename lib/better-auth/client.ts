"use client";

import { createAuthClient } from "better-auth/react";

/** Browser client for redirect-based flows (OAuth). Same-origin, so no baseURL needed. */
export const authClient = createAuthClient();
