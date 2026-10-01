'use client';

import { useMemo } from 'react';
import { applyLiveQuotes } from '@/lib/finance/live';
import type { Holding, PortfolioTotals } from '@/lib/finance/portfolio';
import { useLiveQuotes } from '@/hooks/useLiveQuotes';

export const BENCHMARK = 'SPY';

/** Holdings and totals re-marked from the shared live store, plus the S&P 500 benchmark. */
export function usePortfolioLive(holdings: Holding[], totals: PortfolioTotals) {
  const symbols = useMemo(() => [...holdings.map((h) => h.symbol), BENCHMARK], [holdings]);
  const live = useLiveQuotes(symbols);
  const marked = useMemo(() => applyLiveQuotes(holdings, totals, live.quotes), [holdings, totals, live.quotes]);
  return { ...live, ...marked, benchmark: live.quotes[BENCHMARK] };
}
