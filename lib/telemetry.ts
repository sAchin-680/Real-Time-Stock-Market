import { SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';

/**
 * Tracing helpers. Spans are no-ops until a tracer provider is registered
 * (instrumentation.ts via @vercel/otel), so this is safe everywhere.
 */
export const tracer = () => trace.getTracer('tickline');

/** Runs `fn` inside an active span; records exceptions and marks the span as an error when it throws. */
export function withSpan<T>(name: string, attributes: Attributes, fn: (span: Span) => Promise<T>): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn(span);
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error)?.message });
      throw err;
    } finally {
      span.end();
    }
  });
}
