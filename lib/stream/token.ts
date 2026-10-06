import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived, HMAC-SHA256 signed stream tokens. The app (which knows the
 * session) mints them; the standalone relay verifies them with the shared
 * STREAM_TOKEN_SECRET, so no cookies have to cross domains.
 *
 * Format: base64url(JSON payload) + "." + base64url(signature)
 */
export interface StreamTokenPayload {
  /** User id. */
  sub: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export function signStreamToken(payload: StreamTokenPayload, secret: string): string {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyStreamToken(token: string | null | undefined, secret: string, nowMs = Date.now()): StreamTokenPayload | null {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as StreamTokenPayload;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp * 1000 <= nowMs) return null;
    return payload;
  } catch {
    return null;
  }
}
