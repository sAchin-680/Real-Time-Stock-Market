import { ZodError } from 'zod';
import { logger } from '@/lib/logger';

/** An error whose message is safe to show to the end user. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: 'BAD_REQUEST' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' = 'BAD_REQUEST'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Wraps a server action body so callers always get a typed, serializable result. */
export async function runAction<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.') || 'form';
        fieldErrors[key] ??= issue.message;
      }
      return { ok: false, error: Object.values(fieldErrors)[0] ?? 'Invalid input', fieldErrors };
    }
    if (err instanceof AppError) return { ok: false, error: err.message };

    logger.error('action.failed', { action: name, error: err });
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
