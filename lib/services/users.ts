import 'server-only';

import { connectToDatabase } from '@/database/mongoose';
import { Watchlist } from '@/database/models/watchlist.models';
import { logger } from '@/lib/logger';

/**
 * Background-job helpers. These intentionally live outside 'use server' files:
 * anything exported from a server action module is callable from the browser.
 */

export interface UserContact {
  id: string;
  email: string;
  name: string;
}

async function usersCollection() {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongoose connection not connected');
  return db.collection('user');
}

export async function getAllUsersForNewsEmail(): Promise<UserContact[]> {
  try {
    const users = await (await usersCollection())
      .find({ email: { $exists: true, $ne: null } }, { projection: { _id: 1, id: 1, email: 1, name: 1 } })
      .toArray();

    return users
      .filter((user) => user.email && user.name)
      .map((user) => ({ id: user.id || user._id?.toString() || '', email: user.email, name: user.name }));
  } catch (e) {
    logger.error('users.fetch_for_news_failed', { error: e });
    return [];
  }
}

export async function getUsersByIds(ids: readonly string[]): Promise<Record<string, UserContact>> {
  if (!ids.length) return {};
  const { ObjectId } = await import('mongodb');
  const objectIds = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const users = await (await usersCollection())
    .find({ _id: { $in: objectIds } }, { projection: { _id: 1, email: 1, name: 1 } })
    .toArray();
  return Object.fromEntries(users.map((u) => [u._id.toString(), { id: u._id.toString(), email: u.email, name: u.name }]));
}

export async function getWatchlistSymbolsByEmail(email: string): Promise<string[]> {
  if (!email) return [];
  try {
    const user = await (await usersCollection()).findOne<{ _id?: unknown; id?: string }>({ email });
    if (!user) return [];
    const userId = user.id || String(user._id || '');
    if (!userId) return [];
    const items = await Watchlist.find({ userId }, { symbol: 1 }).lean();
    return items.map((i) => String(i.symbol));
  } catch (err) {
    logger.error('watchlist.symbols_by_email_failed', { error: err });
    return [];
  }
}
