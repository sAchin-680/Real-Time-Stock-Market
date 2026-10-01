'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.models';
import { PriceAlert } from '@/database/models/alert.model';
import { AppError, runAction, type ActionResult } from '@/lib/errors';
import { getMetricsMany, getProfiles, getQuotes } from '@/lib/server/finnhub';
import { getSessionUser, requireUser } from '@/lib/server/session';
import type { WatchlistRow } from '@/lib/types';
import { symbolSchema, watchlistInputSchema } from '@/lib/validation';

const MAX_WATCHLIST = 100;

export async function getWatchlistSymbols(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];
  await connectToDatabase();
  const items = await Watchlist.find({ userId: user.id }, { symbol: 1 }).lean();
  return items.map((i) => String(i.symbol));
}

export async function getWatchlist(): Promise<WatchlistRow[]> {
  const user = await requireUser();
  await connectToDatabase();

  const items = await Watchlist.find({ userId: user.id }).sort({ addedAt: -1 }).lean();
  if (!items.length) return [];

  const symbols = items.map((i) => i.symbol);
  const [quotes, profiles, metrics, alertCounts] = await Promise.all([
    getQuotes(symbols),
    getProfiles(symbols),
    getMetricsMany(symbols),
    PriceAlert.aggregate<{ _id: string; count: number }>([
      { $match: { userId: user.id, active: true, symbol: { $in: symbols } } },
      { $group: { _id: '$symbol', count: { $sum: 1 } } },
    ]),
  ]);
  const alertsBySymbol = Object.fromEntries(alertCounts.map((a) => [a._id, a.count]));

  return items.map((item) => {
    const q = quotes[item.symbol];
    const p = profiles[item.symbol];
    const m = metrics[item.symbol];
    return {
      symbol: item.symbol,
      company: p?.name || item.company,
      logo: p?.logo,
      sector: p?.industry,
      addedAt: new Date(item.addedAt).toISOString(),
      price: q?.price,
      change: q?.change,
      changePercent: q?.changePercent,
      marketCap: p?.marketCap,
      peRatio: m?.peTTM,
      week52High: m?.week52High,
      week52Low: m?.week52Low,
      activeAlerts: alertsBySymbol[item.symbol] ?? 0,
    };
  });
}

export async function addToWatchlist(input: { symbol: string; company: string }): Promise<ActionResult<{ symbol: string }>> {
  return runAction('watchlist.add', async () => {
    const user = await requireUser();
    const { symbol, company } = watchlistInputSchema.parse(input);
    await connectToDatabase();

    const count = await Watchlist.countDocuments({ userId: user.id });
    if (count >= MAX_WATCHLIST) throw new AppError(`Watchlist limit of ${MAX_WATCHLIST} reached`);

    await Watchlist.updateOne(
      { userId: user.id, symbol },
      { $setOnInsert: { userId: user.id, symbol, company, addedAt: new Date() } },
      { upsert: true }
    );
    revalidatePath('/watchlist');
    revalidatePath('/');
    return { symbol };
  });
}

export async function removeFromWatchlist(rawSymbol: string): Promise<ActionResult<{ symbol: string }>> {
  return runAction('watchlist.remove', async () => {
    const user = await requireUser();
    const symbol = symbolSchema.parse(rawSymbol);
    await connectToDatabase();
    await Watchlist.deleteOne({ userId: user.id, symbol });
    revalidatePath('/watchlist');
    revalidatePath('/');
    return { symbol };
  });
}
