'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveQuote, QuotesResponse } from '@/lib/types';
import type { MarketStatus } from '@/lib/market-hours';

const OPEN_INTERVAL_MS = 15_000;
const CLOSED_INTERVAL_MS = 120_000;

/**
 * Polls /api/quotes for the given symbols. Pauses while the tab is hidden and
 * slows down outside regular trading hours.
 */
export function useLiveQuotes(symbols: readonly string[], initial: Record<string, LiveQuote> = {}) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>(initial);
  const [market, setMarket] = useState<MarketStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  const key = [...new Set(symbols)].sort().join(',');
  const marketOpen = useRef(true);

  const refresh = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(key)}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as QuotesResponse;
      setQuotes((prev) => ({ ...prev, ...data.quotes }));
      setMarket(data.market);
      marketOpen.current = data.market.isOpen;
      setUpdatedAt(new Date(data.asOf));
      setError(false);
    } catch {
      setError(true);
    }
  }, [key]);

  useEffect(() => {
    if (!key) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const tick = async () => {
      if (document.visibilityState === 'visible') await refresh();
      if (!cancelled) timer = setTimeout(tick, marketOpen.current ? OPEN_INTERVAL_MS : CLOSED_INTERVAL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key, refresh]);

  return { quotes, market, updatedAt, error, refresh };
}
