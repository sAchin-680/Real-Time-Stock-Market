import { ZodError } from 'zod';
import { SpanStatusCode } from '@opentelemetry/api';
import { logger } from '@/lib/logger';
import { withSpan } from '@/lib/telemetry';

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

/**
 * Wraps a server action body so callers always get a typed, serializable result.
 * Each call is traced as span `action.<name>` with an `action.outcome` of
 * ok | invalid | rejected | error; only unexpected errors mark the span as failed.
 */
export async function runAction<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  return withSpan(`action.${name}`, { 'action.name': name }, async (span) => {
    try {
      const data = await fn();
      span.setAttribute('action.outcome', 'ok');
      return { ok: true as const, data };
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || 'form';
          fieldErrors[key] ??= issue.message;
        }
        span.setAttributes({ 'action.outcome': 'invalid', 'action.invalid_fields': Object.keys(fieldErrors).join(',') });
        return { ok: false as const, error: Object.values(fieldErrors)[0] ?? 'Invalid input', fieldErrors };
      }
      if (err instanceof AppError) {
        span.setAttributes({ 'action.outcome': 'rejected', 'action.error_code': err.code });
        return { ok: false as const, error: err.message };
      }

      span.setAttribute('action.outcome', 'error');
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
      logger.error('action.failed', { action: name, error: err });
      return { ok: false as const, error: 'Something went wrong. Please try again.' };
    }
  });
}
