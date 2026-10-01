import { z } from 'zod';

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  BETTER_AUTH_SECRET: z.string().min(16, 'BETTER_AUTH_SECRET must be at least 16 characters'),
  BETTER_AUTH_URL: z.url('BETTER_AUTH_URL must be a valid URL'),
  FINNHUB_API_KEY: optional,
  /** @deprecated kept for backwards compatibility; prefer FINNHUB_API_KEY (server only). */
  NEXT_PUBLIC_FINNHUB_API_KEY: optional,
  GEMINI_API_KEY: optional,
  NODEMAILER_EMAIL: optional,
  NODEMAILER_PASSWORD: optional,
  EMAIL_FROM_NAME: z.string().default('Tickline'),
  LOG_LEVEL: optional,
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Validates environment variables on first use. Lazy so that `next build`
 * can run without production secrets present.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const getFinnhubToken = () =>
  process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY || '';

export const isEmailConfigured = () =>
  Boolean(process.env.NODEMAILER_EMAIL && process.env.NODEMAILER_PASSWORD);
