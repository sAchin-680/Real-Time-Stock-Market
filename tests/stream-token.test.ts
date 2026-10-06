import { describe, expect, it } from 'vitest';
import { signStreamToken, verifyStreamToken } from '@/lib/stream/token';

const SECRET = 'test-secret-0123456789';

describe('stream tokens', () => {
  const now = 1_700_000_000_000;
  const valid = signStreamToken({ sub: 'user-1', exp: now / 1000 + 60 }, SECRET);

  it('round-trips a valid token', () => {
    expect(verifyStreamToken(valid, SECRET, now)).toEqual({ sub: 'user-1', exp: now / 1000 + 60 });
  });

  it('rejects expired, tampered, wrong-secret and malformed tokens', () => {
    expect(verifyStreamToken(valid, SECRET, now + 61_000)).toBeNull();
    const [body, sig] = valid.split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'admin', exp: now / 1000 + 60 })).toString('base64url');
    expect(verifyStreamToken(`${forged}.${sig}`, SECRET, now)).toBeNull();
    expect(verifyStreamToken(`${body}.${sig}x`, SECRET, now)).toBeNull();
    expect(verifyStreamToken(valid, 'other-secret', now)).toBeNull();
    expect(verifyStreamToken('nope', SECRET, now)).toBeNull();
    expect(verifyStreamToken(null, SECRET, now)).toBeNull();
    expect(verifyStreamToken(valid, '', now)).toBeNull();
  });
});
