import 'server-only';

import { randomBytes } from 'node:crypto';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert } from '@/database/models/alert.model';
import { Transaction } from '@/database/models/transaction.model';
import { Watchlist } from '@/database/models/watchlist.models';
import { logger } from '@/lib/logger';

export const DEMO_EMAIL_DOMAIN = 'demo.tickline.app';
/** Accounts created before the rebrand still count as demo users. */
const DEMO_DOMAINS = [DEMO_EMAIL_DOMAIN, 'demo.signalist.app'];
export const DEMO_TTL_HOURS = 24;

export const isDemoEmail = (email: string) => DEMO_DOMAINS.some((d) => email.toLowerCase().endsWith(`@${d}`));

export function createDemoCredentials() {
  const id = randomBytes(6).toString('hex');
  return {
    email: `guest-${id}@${DEMO_EMAIL_DOMAIN}`,
    password: randomBytes(24).toString('base64url'),
    name: 'Demo Investor',
  };
}

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600 * 1000);

// A realistic, diversified book with partial exits and dividends.
const DEMO_TRADES = [
  { symbol: 'AAPL', side: 'BUY', quantity: 40, price: 172.5, fees: 1, executedAt: daysAgo(340) },
  { symbol: 'MSFT', side: 'BUY', quantity: 18, price: 365.2, fees: 1, executedAt: daysAgo(320) },
  { symbol: 'NVDA', side: 'BUY', quantity: 60, price: 92.4, fees: 1, executedAt: daysAgo(300) },
  { symbol: 'JPM', side: 'BUY', quantity: 25, price: 188.1, fees: 1, executedAt: daysAgo(280) },
  { symbol: 'XOM', side: 'BUY', quantity: 30, price: 112.6, fees: 1, executedAt: daysAgo(260) },
  { symbol: 'KO', side: 'BUY', quantity: 50, price: 61.3, fees: 1, executedAt: daysAgo(240) },
  { symbol: 'AAPL', side: 'DIVIDEND', quantity: 40, price: 0.25, fees: 0, executedAt: daysAgo(200) },
  { symbol: 'GOOGL', side: 'BUY', quantity: 30, price: 151.8, fees: 1, executedAt: daysAgo(190) },
  { symbol: 'NVDA', side: 'SELL', quantity: 20, price: 128.9, fees: 1, executedAt: daysAgo(150) },
  { symbol: 'KO', side: 'DIVIDEND', quantity: 50, price: 0.51, fees: 0, executedAt: daysAgo(120) },
  { symbol: 'AMZN', side: 'BUY', quantity: 22, price: 178.4, fees: 1, executedAt: daysAgo(110) },
  { symbol: 'XOM', side: 'SELL', quantity: 10, price: 104.2, fees: 1, executedAt: daysAgo(90) },
  { symbol: 'JPM', side: 'DIVIDEND', quantity: 25, price: 1.25, fees: 0, executedAt: daysAgo(75) },
  { symbol: 'MSFT', side: 'BUY', quantity: 6, price: 418.0, fees: 1, executedAt: daysAgo(60) },
  { symbol: 'AAPL', side: 'SELL', quantity: 10, price: 226.7, fees: 1, executedAt: daysAgo(35) },
  { symbol: 'AAPL', side: 'DIVIDEND', quantity: 30, price: 0.26, fees: 0, executedAt: daysAgo(20) },
] as const;

const DEMO_WATCHLIST = [
  { symbol: 'TSLA', company: 'Tesla Inc' },
  { symbol: 'META', company: 'Meta Platforms Inc' },
  { symbol: 'AMD', company: 'Advanced Micro Devices Inc' },
  { symbol: 'NFLX', company: 'Netflix Inc' },
  { symbol: 'PLTR', company: 'Palantir Technologies Inc' },
  { symbol: 'COIN', company: 'Coinbase Global Inc' },
];

const DEMO_ALERTS = [
  { symbol: 'TSLA', company: 'Tesla Inc', name: 'TSLA breakout', condition: 'PRICE_ABOVE', threshold: 500, frequency: 'ONCE' },
  { symbol: 'NVDA', company: 'NVIDIA Corp', name: 'NVDA drawdown', condition: 'PCT_DOWN', threshold: 4, frequency: 'DAILY' },
  { symbol: 'AMD', company: 'Advanced Micro Devices Inc', name: 'AMD buy zone', condition: 'PRICE_BELOW', threshold: 120, frequency: 'ONCE' },
  { symbol: 'AAPL', company: 'Apple Inc', name: 'AAPL big up day', condition: 'PCT_UP', threshold: 3, frequency: 'DAILY' },
] as const;

export async function seedDemoData(userId: string) {
  await connectToDatabase();
  await Promise.all([
    Transaction.insertMany(DEMO_TRADES.map((t) => ({ ...t, userId, notes: '' }))),
    Watchlist.insertMany(DEMO_WATCHLIST.map((w, i) => ({ ...w, userId, addedAt: daysAgo(30 - i * 3) }))),
    PriceAlert.insertMany(DEMO_ALERTS.map((a) => ({ ...a, userId, active: true }))),
  ]);
}

/** Removes demo accounts (and everything they own) older than DEMO_TTL_HOURS. */
export async function purgeExpiredDemoUsers(): Promise<number> {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not found');

  const cutoff = new Date(Date.now() - DEMO_TTL_HOURS * 3600 * 1000);
  const users = await db
    .collection('user')
    .find({ email: { $regex: `@(${DEMO_DOMAINS.map((d) => d.replace(/\./g, '\\.')).join('|')})$` }, createdAt: { $lt: cutoff } }, { projection: { _id: 1 } })
    .toArray();
  if (!users.length) return 0;

  const objectIds = users.map((u) => u._id);
  const stringIds = objectIds.map((id) => id.toString());
  // Better Auth may store references as ObjectId or string depending on version.
  const anyId = { $in: [...objectIds, ...stringIds] };

  await Promise.all([
    Transaction.deleteMany({ userId: { $in: stringIds } }),
    Watchlist.deleteMany({ userId: { $in: stringIds } }),
    PriceAlert.deleteMany({ userId: { $in: stringIds } }),
    db.collection('session').deleteMany({ userId: anyId }),
    db.collection('account').deleteMany({ userId: anyId }),
  ]);
  await db.collection('user').deleteMany({ _id: { $in: objectIds } });

  logger.info('demo.purged', { count: users.length });
  return users.length;
}
