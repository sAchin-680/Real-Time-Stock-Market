import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode, context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { z } from 'zod';
import { AppError, runAction } from '@/lib/errors';
import { withSpan } from '@/lib/telemetry';

const exporter = new InMemorySpanExporter();
const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
const contextManager = new AsyncLocalStorageContextManager();

beforeAll(() => {
  context.setGlobalContextManager(contextManager.enable());
  trace.setGlobalTracerProvider(provider);
});
afterAll(() => {
  trace.disable();
  context.disable();
});
beforeEach(() => exporter.reset());

const spans = () => exporter.getFinishedSpans();

describe('server action tracing', () => {
  it('records a successful action', async () => {
    const res = await runAction('portfolio.addTransaction', async () => 42);
    expect(res).toEqual({ ok: true, data: 42 });
    const [span] = spans();
    expect(span.name).toBe('action.portfolio.addTransaction');
    expect(span.attributes).toMatchObject({ 'action.name': 'portfolio.addTransaction', 'action.outcome': 'ok' });
    expect(span.status.code).toBe(SpanStatusCode.UNSET);
  });

  it('marks validation and business rejections without failing the span', async () => {
    await runAction('alerts.create', async () => z.object({ threshold: z.number() }).parse({ threshold: 'x' }));
    await runAction('alerts.delete', async () => {
      throw new AppError('Alert not found', 'NOT_FOUND');
    });
    const [invalid, rejected] = spans();
    expect(invalid.attributes).toMatchObject({ 'action.outcome': 'invalid', 'action.invalid_fields': 'threshold' });
    expect(rejected.attributes).toMatchObject({ 'action.outcome': 'rejected', 'action.error_code': 'NOT_FOUND' });
    expect([invalid.status.code, rejected.status.code]).toEqual([SpanStatusCode.UNSET, SpanStatusCode.UNSET]);
  });

  it('fails the span and records the exception on unexpected errors', async () => {
    const res = await runAction('watchlist.add', async () => {
      throw new Error('db down');
    });
    expect(res).toMatchObject({ ok: false });
    const [span] = spans();
    expect(span.attributes['action.outcome']).toBe('error');
    expect(span.status).toMatchObject({ code: SpanStatusCode.ERROR, message: 'db down' });
    expect(span.events.some((e) => e.name === 'exception')).toBe(true);
  });

  it('nests child spans under the action span', async () => {
    await runAction('stock.overview', () => withSpan('finnhub /quote', { 'finnhub.route': '/quote' }, async () => 1));
    const child = spans().find((s) => s.name === 'finnhub /quote')!;
    const parent = spans().find((s) => s.name === 'action.stock.overview')!;
    expect(child.parentSpanContext?.spanId).toBe(parent.spanContext().spanId);
  });
});
