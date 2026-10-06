import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { streamHub } from '@/lib/server/stream-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const authorized = (req: NextRequest) => {
  const token = process.env.METRICS_TOKEN;
  if (!token) return false;
  const given = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
  const want = Buffer.from(token);
  return given.length === want.length && timingSafeEqual(given, want);
};

/**
 * Process and stream-hub metrics for load tests and dashboards.
 * Disabled (404) unless METRICS_TOKEN is set; requires `Authorization: Bearer <token>`.
 */
export async function GET(req: NextRequest) {
  if (!process.env.METRICS_TOKEN) return new NextResponse(null, { status: 404 });
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const mem = process.memoryUsage();
  return NextResponse.json(
    {
      at: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      memory: { rssMb: +(mem.rss / 2 ** 20).toFixed(1), heapUsedMb: +(mem.heapUsed / 2 ** 20).toFixed(1) },
      stream: streamHub.stats(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
