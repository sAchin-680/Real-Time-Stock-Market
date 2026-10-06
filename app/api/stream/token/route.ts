import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/server/session';
import { signStreamToken } from '@/lib/stream/token';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TTL_SECONDS = 15 * 60;

/**
 * Where the browser should stream from. With STREAM_RELAY_URL + STREAM_TOKEN_SECRET
 * set, returns the relay URL and a short-lived signed token; otherwise the
 * in-app /api/stream route (serverless, rotated before the function time limit).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const relay = process.env.STREAM_RELAY_URL?.trim().replace(/\/$/, '');
  const secret = process.env.STREAM_TOKEN_SECRET;
  if (!relay || !secret) return NextResponse.json({ url: '/api/stream' }, { headers: { 'Cache-Control': 'no-store' } });

  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return NextResponse.json(
    { url: `${relay}/stream`, token: signStreamToken({ sub: user.id, exp }, secret), expiresAt: exp * 1000 },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
