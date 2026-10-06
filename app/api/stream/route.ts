import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { getSessionUser } from '@/lib/server/session';
import { isStreamingAvailable, streamHub } from '@/lib/server/stream-hub';
import { SSE_HEADERS, createSseStream, parseSymbols } from '@/lib/stream/sse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Vercel functions are time boxed: the stream ends just before maxDuration and the
// browser's EventSource reconnects after `retry` (see docs/streaming.md).
export const maxDuration = 300;

const limiter = createRateLimiter({ limit: Number(process.env.STREAM_CONNECTS_PER_MINUTE) || 30, windowMs: 60_000 });

/**
 * Server-Sent Events stream of live trades.
 *   GET /api/stream?symbols=AAPL,MSFT,BINANCE:BTCUSDT
 * Events: `ticks` (array of {s,p,t,v,r}) and `: ping` heartbeats.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!limiter.check(user.id).allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  if (!isStreamingAvailable()) return NextResponse.json({ error: 'Streaming unavailable' }, { status: 503 });

  const symbols = parseSymbols(request.nextUrl.searchParams.get('symbols'));
  if (!symbols.length) return NextResponse.json({ error: 'No symbols' }, { status: 400 });

  const body = createSseStream(streamHub, symbols, {
    flushMs: Number(process.env.STREAM_FLUSH_MS) || 250,
    lifetimeMs: 280_000,
    signal: request.signal,
  });
  return new Response(body, { headers: SSE_HEADERS });
}
