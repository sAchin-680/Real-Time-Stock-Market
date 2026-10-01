'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert } from '@/database/models/alert.model';
import { AppError, runAction, type ActionResult } from '@/lib/errors';
import { createRateLimiter } from '@/lib/rate-limit';
import { getQuotes } from '@/lib/server/finnhub';
import { requireUser } from '@/lib/server/session';
import { evaluateAlerts, toAlertDTO, type FiredAlert, type LeanAlert } from '@/lib/services/alerts';
import type { AlertDTO } from '@/lib/types';
import { alertInputSchema, objectIdSchema, type AlertInput } from '@/lib/validation';

const MAX_ALERTS = 100;
const checkLimiter = createRateLimiter({ limit: 6, windowMs: 60_000 });

const revalidateAlerts = () => {
  revalidatePath('/alerts');
  revalidatePath('/watchlist');
  revalidatePath('/');
};

export async function listAlerts(symbol?: string): Promise<AlertDTO[]> {
  const user = await requireUser();
  await connectToDatabase();

  const filter: Record<string, unknown> = { userId: user.id };
  if (symbol) filter.symbol = symbol.toUpperCase();
  const alerts = await PriceAlert.find(filter).sort({ active: -1, createdAt: -1 }).lean<LeanAlert[]>();

  const quotes = await getQuotes(alerts.map((a) => a.symbol));
  return alerts.map((a) => toAlertDTO(a, quotes[a.symbol]));
}

export async function createAlert(input: AlertInput): Promise<ActionResult<AlertDTO>> {
  return runAction('alerts.create', async () => {
    const user = await requireUser();
    const data = alertInputSchema.parse(input);
    await connectToDatabase();

    if ((await PriceAlert.countDocuments({ userId: user.id })) >= MAX_ALERTS) {
      throw new AppError(`You can keep up to ${MAX_ALERTS} alerts. Delete some to add more.`);
    }

    const created = await PriceAlert.create({ ...data, userId: user.id });
    revalidateAlerts();
    return toAlertDTO(created.toObject());
  });
}

export async function updateAlert(id: string, input: AlertInput): Promise<ActionResult<AlertDTO>> {
  return runAction('alerts.update', async () => {
    const user = await requireUser();
    const alertId = objectIdSchema.parse(id);
    const data = alertInputSchema.parse(input);
    await connectToDatabase();

    // Editing re-arms the alert.
    const updated = await PriceAlert.findOneAndUpdate(
      { _id: alertId, userId: user.id },
      { $set: { ...data, active: true }, $unset: { lastTriggeredTradingDate: 1 } },
      { new: true }
    ).lean<LeanAlert>();
    if (!updated) throw new AppError('Alert not found', 'NOT_FOUND');

    revalidateAlerts();
    return toAlertDTO(updated);
  });
}

export async function setAlertActive(id: string, active: boolean): Promise<ActionResult<{ id: string; active: boolean }>> {
  return runAction('alerts.toggle', async () => {
    const user = await requireUser();
    const alertId = objectIdSchema.parse(id);
    await connectToDatabase();

    const res = await PriceAlert.updateOne(
      { _id: alertId, userId: user.id },
      active ? { $set: { active: true }, $unset: { lastTriggeredTradingDate: 1 } } : { $set: { active: false } }
    );
    if (!res.matchedCount) throw new AppError('Alert not found', 'NOT_FOUND');

    revalidateAlerts();
    return { id: alertId, active };
  });
}

export async function deleteAlert(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction('alerts.delete', async () => {
    const user = await requireUser();
    const alertId = objectIdSchema.parse(id);
    await connectToDatabase();

    const res = await PriceAlert.deleteOne({ _id: alertId, userId: user.id });
    if (!res.deletedCount) throw new AppError('Alert not found', 'NOT_FOUND');

    revalidateAlerts();
    return { id: alertId };
  });
}

/** Runs the alert engine for the current user right now (no emails; results shown in-app). */
export async function checkMyAlertsNow(): Promise<ActionResult<FiredAlert[]>> {
  return runAction('alerts.checkNow', async () => {
    const user = await requireUser();
    if (!checkLimiter.check(user.id).allowed) throw new AppError('Checking too often — try again in a minute.', 'RATE_LIMITED');
    const fired = await evaluateAlerts({ userId: user.id });
    if (fired.length) revalidateAlerts();
    return fired;
  });
}
