import 'server-only';

import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert, type AlertDoc } from '@/database/models/alert.model';
import { canAlertFire, isAlertTriggered } from '@/lib/finance/alerts';
import { logger } from '@/lib/logger';
import { getMarketStatus } from '@/lib/market-hours';
import { getQuotes } from '@/lib/server/finnhub';
import type { AlertDTO } from '@/lib/types';

const HISTORY_LIMIT = 20;

export interface FiredAlert {
  id: string;
  userId: string;
  symbol: string;
  company: string;
  name: string;
  condition: AlertDoc['condition'];
  threshold: number;
  price: number;
  changePercent: number;
}

export type LeanAlert = Pick<
  AlertDoc,
  | 'userId'
  | 'symbol'
  | 'company'
  | 'name'
  | 'condition'
  | 'threshold'
  | 'frequency'
  | 'active'
  | 'lastTriggeredAt'
  | 'lastTriggeredTradingDate'
  | 'triggerCount'
  | 'history'
  | 'createdAt'
> & { _id: unknown };

export const toAlertDTO = (a: LeanAlert, quote?: { price: number; changePercent: number }): AlertDTO => ({
  id: String(a._id),
  symbol: a.symbol,
  company: a.company,
  name: a.name,
  condition: a.condition,
  threshold: a.threshold,
  frequency: a.frequency,
  active: a.active,
  triggerCount: a.triggerCount ?? 0,
  lastTriggeredAt: a.lastTriggeredAt ? new Date(a.lastTriggeredAt).toISOString() : undefined,
  createdAt: new Date(a.createdAt).toISOString(),
  currentPrice: quote?.price,
  changePercent: quote?.changePercent,
  history: (a.history ?? []).map((h) => ({
    price: h.price,
    changePercent: h.changePercent,
    triggeredAt: new Date(h.triggeredAt).toISOString(),
  })),
});

/**
 * Evaluates active alerts against live quotes and records the ones that fire.
 * Each update is conditional on the alert's previous trigger state, so two
 * concurrent runs can never fire the same alert twice.
 */
export async function evaluateAlerts({ userId, now = new Date() }: { userId?: string; now?: Date } = {}): Promise<FiredAlert[]> {
  await connectToDatabase();

  const filter: Record<string, unknown> = { active: true };
  if (userId) filter.userId = userId;
  const alerts = await PriceAlert.find(filter).lean<LeanAlert[]>();
  if (!alerts.length) return [];

  const quotes = await getQuotes(alerts.map((a) => a.symbol));
  const { tradingDate } = getMarketStatus(now);
  const fired: FiredAlert[] = [];

  for (const alert of alerts) {
    const quote = quotes[alert.symbol];
    if (!quote) continue;
    if (!canAlertFire(alert, tradingDate)) continue;
    if (!isAlertTriggered(alert.condition, alert.threshold, quote)) continue;

    const updated = await PriceAlert.findOneAndUpdate(
      {
        _id: alert._id,
        active: true,
        lastTriggeredTradingDate: alert.lastTriggeredTradingDate ?? null,
      },
      {
        $set: {
          lastTriggeredAt: now,
          lastTriggeredTradingDate: tradingDate,
          ...(alert.frequency === 'ONCE' ? { active: false } : {}),
        },
        $inc: { triggerCount: 1 },
        $push: {
          history: {
            $each: [{ price: quote.price, changePercent: quote.changePercent, triggeredAt: now }],
            $position: 0,
            $slice: HISTORY_LIMIT,
          },
        },
      },
      { new: true }
    );
    if (!updated) continue; // Another run got there first.

    fired.push({
      id: String(alert._id),
      userId: alert.userId,
      symbol: alert.symbol,
      company: alert.company,
      name: alert.name,
      condition: alert.condition,
      threshold: alert.threshold,
      price: quote.price,
      changePercent: quote.changePercent,
    });
  }

  if (fired.length) logger.info('alerts.fired', { count: fired.length, scope: userId ? 'user' : 'all' });
  return fired;
}
