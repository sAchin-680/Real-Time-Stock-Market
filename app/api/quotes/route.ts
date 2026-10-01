import { NextRequest, NextResponse } from 'next/server';
import { getMarketStatus } from '@/lib/market-hours';
import { createRateLimiter } from '@/lib/rate-limit';
import { getQuotes } from '@/lib/server/finnhub';
import { getSessionUser } from '@/lib/server/session';
import type { QuotesResponse } from '@/lib/types';
import { symbolSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const MAX_SYMBOLS = 50;
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = limiter.check(user.id);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const raw = (request.nextUrl.searchParams.get('symbols') || '').split(',').filter(Boolean);
  const symbols = raw.map((s) => symbolSchema.safeParse(s)).flatMap((r) => (r.success ? [r.data] : []));
  if (symbols.length > MAX_SYMBOLS) {
    return NextResponse.json({ error: `At most ${MAX_SYMBOLS} symbols per request` }, { status: 400 });
  }

  const body: QuotesResponse = {
    quotes: await getQuotes(symbols),
    market: getMarketStatus(),
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'private, no-store', 'X-RateLimit-Remaining': String(rl.remaining) },
  });
}
