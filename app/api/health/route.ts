import { NextResponse } from 'next/server';
import { pingDatabase } from '@/database/mongoose';
import { getMarketStatus } from '@/lib/market-hours';
import { isMarketDataConfigured } from '@/lib/server/finnhub';

export const dynamic = 'force-dynamic';

const startedAt = Date.now();

export async function GET() {
  const dbUp = await pingDatabase();
  const body = {
    status: dbUp ? 'ok' : 'degraded',
    checks: {
      database: dbUp ? 'up' : 'down',
      marketData: isMarketDataConfigured() ? 'configured' : 'missing_api_key',
    },
    market: getMarketStatus(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.APP_VERSION || 'dev',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: dbUp ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
