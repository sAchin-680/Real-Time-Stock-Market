import 'server-only';

import { cache } from 'react';
import { headers } from 'next/headers';
import { auth } from '@/lib/better-auth/auth';
import { AppError } from '@/lib/errors';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

/** Current user for this request (memoised per render). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return { id: session.user.id, name: session.user.name, email: session.user.email };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError('Please sign in to continue.', 'UNAUTHORIZED');
  return user;
}

/** Best-effort client IP for rate limiting. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}
