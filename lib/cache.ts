/**
 * Small in-memory TTL + LRU cache. Used to shield the market data provider
 * from bursts of identical requests (e.g. many users polling the same quote).
 */
export class TTLCache<K, V> {
  private store = new Map<K, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1000
  ) {}

  get(key: K, now = Date.now()): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh recency for LRU eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs = this.ttlMs, now = Date.now()) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: now + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value as K;
      this.store.delete(oldest);
    }
  }

  delete(key: K) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

/** Runs `fn` over `items` with at most `limit` promises in flight, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
