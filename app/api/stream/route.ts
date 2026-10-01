import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/server/session';
import { streamHub, type Tick } from '@/lib/server/stream-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Serverless functions are time boxed; the browser's EventSource reconnects automatically.
export const maxDuration = 300;

const STREAM_LIFETIME_MS = 280_000;
const FLUSH_MS = 250;
const HEARTBEAT_MS = 15_000;
const SYMBOL_RE = /^[A-Z0-9][A-Z0-9.\-:]{0,29}$/;

const limiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

/**
 * Server-Sent Events stream of live trades for the requested symbols.
 *   GET /api/stream?symbols=AAPL,MSFT,BINANCE:BTCUSDT
 * Events: `ticks` (array of {s,p,t,v}), plus `: ping` comments as heartbeats.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!limiter.check(user.id).allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (!streamHub.available) return NextResponse.json({ error: 'Streaming unavailable' }, { status: 503 });

  const symbols = [
    ...new Set(
      (request.nextUrl.searchParams.get('symbols') || '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s) => SYMBOL_RE.test(s))
    ),
  ].slice(0, 50);
  if (!symbols.length) return NextResponse.json({ error: 'No symbols' }, { status: 400 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
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

      write(`retry: 2000\n\n`);
      const initial = streamHub.snapshot(symbols);
      if (initial.length) write(`event: ticks\ndata: ${JSON.stringify(initial)}\n\n`);

      const unsubscribe = streamHub.subscribe(symbols, (ticks) => {
        for (const t of ticks) pending.set(t.s, t);
      });

      // Batch ticks so the browser renders at most ~4 updates per second.
      const flush = setInterval(() => {
        if (!pending.size) return;
        write(`event: ticks\ndata: ${JSON.stringify([...pending.values()])}\n\n`);
        pending.clear();
      }, FLUSH_MS);
      const heartbeat = setInterval(() => write(`: ping\n\n`), HEARTBEAT_MS);
      const lifetime = setTimeout(() => cleanup(), STREAM_LIFETIME_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(flush);
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener('abort', () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
