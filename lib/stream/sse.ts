import type { StreamHub } from './hub';
import type { Tick } from './types';

export interface SseStreamOptions {
  /** Batch ticks and write at most once per interval (ms). Lower = less latency, more writes. */
  flushMs?: number;
  heartbeatMs?: number;
  /** Close the stream after this long; EventSource reconnects automatically (`retry`). */
  lifetimeMs?: number;
  /**
   * Send a `rotate` event this long before the lifetime ends so the client can
   * open a replacement stream first and switch over with no gap ("make before break").
   */
  rotateBeforeMs?: number;
  retryMs?: number;
  signal?: AbortSignal;
}

export const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-:]{0,29}$/;

export function parseSymbols(raw: string | null, max = 50): string[] {
  return [
    ...new Set(
      (raw || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => SYMBOL_RE.test(s))
    ),
  ].slice(0, max);
}

/**
 * Server-Sent Events body for a hub subscription.
 * Events: `snapshot` (last known price per symbol, sent once on connect), `ticks`
 * (JSON array of live Tick), `rotate` (open a replacement now), `: ping` heartbeats.
 *
 * Backpressure: writes are queued per client (high-water mark 16 chunks). If a
 * slow client's queue is full the flush is skipped; because pending ticks are
 * coalesced to the newest price per symbol, the next flush catches it up with no
 * loss of current state and no unbounded memory growth.
 */
export function createSseStream(hub: StreamHub, symbols: string[], opts: SseStreamOptions = {}): ReadableStream<Uint8Array> {
  const { flushMs = 250, heartbeatMs = 15_000, lifetimeMs = 280_000, rotateBeforeMs = 5_000, retryMs = 1000, signal } = opts;
  const encoder = new TextEncoder();
  let cleanup = () => {};

  return new ReadableStream<Uint8Array>(
    {
    start(controller) {
      let closed = false;
      const pending = new Map<string, Tick>();
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      write(`retry: ${retryMs}\n\n`);
      const initial = hub.snapshot(symbols);
      if (initial.length) write(`event: snapshot\ndata: ${JSON.stringify(initial)}\n\n`);

      const unsubscribe = hub.subscribe(symbols, (ticks) => {
        for (const t of ticks) pending.set(t.s, t);
      });
      const flush = () => {
        if (!pending.size) return;
        if ((controller.desiredSize ?? 1) <= 0) return; // client is behind: keep coalescing
        write(`event: ticks\ndata: ${JSON.stringify([...pending.values()])}\n\n`);
        pending.clear();
      };
      const flushTimer = setInterval(flush, flushMs);
      const heartbeat = setInterval(() => write(`: ping\n\n`), heartbeatMs);
      const rotate = setTimeout(() => write(`event: rotate\ndata: {}\n\n`), Math.max(0, lifetimeMs - rotateBeforeMs));
      const lifetime = setTimeout(() => cleanup(), lifetimeMs);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(flushTimer);
        clearInterval(heartbeat);
        clearTimeout(rotate);
        clearTimeout(lifetime);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      signal?.addEventListener('abort', () => cleanup());
    },
    cancel() {
      cleanup();
    },
    },
    new CountQueuingStrategy({ highWaterMark: 16 })
  );
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;
