'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { marketStore } from '@/lib/client/market-store';
import type { LiveQuote } from '@/lib/types';

const serverSnapshot = marketStore.getSnapshot();

/**
 * Live quotes for `symbols`: streamed trades (SSE) on top of a REST baseline.
 * All components share one connection via the market store.
 */
export function useLiveQuotes(symbols: readonly string[], initial: Record<string, LiveQuote> = {}) {
  const key = useMemo(() => [...new Set(symbols)].sort().join(','), [symbols]);

  useEffect(() => {
    marketStore.seed(initial);
    // Initial quotes only seed the store once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!key) return;
    return marketStore.register(key.split(','));
  }, [key]);

  const snap = useSyncExternalStore(marketStore.subscribe, marketStore.getSnapshot, () => serverSnapshot);

  const quotes = useMemo(() => ({ ...initial, ...snap.quotes }), [initial, snap.quotes]);

  return {
    quotes,
    history: snap.history,
    direction: snap.direction,
    status: snap.status,
    market: snap.market,
    updatedAt: snap.lastUpdate ? new Date(snap.lastUpdate) : null,
  };
}

/** Connection state only (for the LIVE indicator). */
export function useStreamStatus() {
  const snap = useSyncExternalStore(marketStore.subscribe, marketStore.getSnapshot, () => serverSnapshot);
  return { status: snap.status, lastUpdate: snap.lastUpdate };
}
