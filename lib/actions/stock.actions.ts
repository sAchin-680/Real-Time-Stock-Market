'use server';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.models';
import { getMetrics, getProfile, getQuote } from '@/lib/server/finnhub';
import { requireUser } from '@/lib/server/session';
import { getPortfolioSnapshotForUser } from '@/lib/services/portfolio';
import type { StockOverview } from '@/lib/types';
import { symbolSchema } from '@/lib/validation';
import { listAlerts } from '@/lib/actions/alert.actions';

export async function getStockOverview(rawSymbol: string): Promise<StockOverview> {
  const user = await requireUser();
  const symbol = symbolSchema.parse(decodeURIComponent(rawSymbol));
  await connectToDatabase();

  const [quote, profile, metrics, inWatchlist, portfolio, alerts] = await Promise.all([
    getQuote(symbol),
    getProfile(symbol),
    getMetrics(symbol),
    Watchlist.exists({ userId: user.id, symbol }),
    getPortfolioSnapshotForUser(user.id),
    listAlerts(symbol),
  ]);

  const holding = portfolio.holdings.find((h) => h.symbol === symbol);

  return {
    symbol,
    name: profile?.name || symbol,
    logo: profile?.logo,
    industry: profile?.industry,
    exchange: profile?.exchange,
    currency: profile?.currency,
    country: profile?.country,
    weburl: profile?.weburl,
    ipo: profile?.ipo,
    marketCap: profile?.marketCap,
    quote: quote ?? undefined,
    metrics: metrics ?? {},
    inWatchlist: Boolean(inWatchlist),
    position: holding
      ? {
          quantity: holding.quantity,
          avgCost: holding.avgCost,
          costBasis: holding.costBasis,
          marketValue: holding.marketValue,
          unrealizedPnl: holding.unrealizedPnl,
          unrealizedPercent: holding.unrealizedPercent,
          realizedPnl: holding.realizedPnl,
        }
      : undefined,
    alerts,
  };
}
