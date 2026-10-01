'use server';

import { cache } from 'react';
import { POPULAR_STOCK_SYMBOLS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { createRateLimiter } from '@/lib/rate-limit';
import { getProfiles, isMarketDataConfigured, searchSymbols } from '@/lib/server/finnhub';
import { getSessionUser } from '@/lib/server/session';

const searchLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

export const searchStocks = cache(async (query?: string): Promise<StockWithWatchlistStatus[]> => {
  if (!isMarketDataConfigured()) return [];
  const user = await getSessionUser();
  if (!user || !searchLimiter.check(user.id).allowed) return [];

  try {
    const trimmed = typeof query === 'string' ? query.trim().slice(0, 50) : '';

    if (!trimmed) {
      const top = POPULAR_STOCK_SYMBOLS.slice(0, 10);
      const profiles = await getProfiles(top);
      return top
        .filter((sym) => profiles[sym])
        .map((sym) => ({
          symbol: sym,
          name: profiles[sym].name,
          exchange: profiles[sym].exchange || 'US',
          type: 'Common Stock',
          isInWatchlist: false,
        }));
    }

    // Hide foreign listings (e.g. "SAP.DE") unless the user is explicitly searching for one.
    const wantsForeign = trimmed.includes('.');
    const results = await searchSymbols(trimmed);
    return results
      .filter((r) => r.symbol && (wantsForeign || !r.symbol.includes('.')))
      .slice(0, 15)
      .map((r) => ({
        symbol: r.symbol.toUpperCase(),
        name: r.description || r.symbol,
        exchange: r.displaySymbol || 'US',
        type: r.type || 'Stock',
        isInWatchlist: false,
      }));
  } catch (err) {
    logger.error('search.failed', { error: err });
    return [];
  }
});
