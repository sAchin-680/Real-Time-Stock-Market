import { registerOTel } from '@vercel/otel';

/**
 * OpenTelemetry for Next.js. Traces requests, server components, fetches and
 * the manual spans in lib/telemetry.ts. Exports via OTLP when
 * OTEL_EXPORTER_OTLP_ENDPOINT (and OTEL_EXPORTER_OTLP_HEADERS) are set, e.g.
 * Grafana Cloud; on Vercel it also feeds Vercel's tracing integrations.
 */
export function register() {
  registerOTel({ serviceName: process.env.OTEL_SERVICE_NAME || 'tickline' });
}
