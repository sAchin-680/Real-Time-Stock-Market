export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter keyed by an arbitrary string (user id, IP, ...).
 * In-memory per instance: good enough for a single node or as a first line of
 * defence; swap for Redis when running multiple replicas.
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const prune = (now: number) => {
    if (hits.size < 5000) return;
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  };

  return {
    check(key: string, now = Date.now()): RateLimitResult {
      prune(now);
      let entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        entry = { count: 0, resetAt: now + windowMs };
        hits.set(key, entry);
      }
      entry.count += 1;
      return {
        allowed: entry.count <= limit,
        remaining: Math.max(0, limit - entry.count),
        resetAt: entry.resetAt,
      };
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}
