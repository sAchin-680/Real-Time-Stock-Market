import 'server-only';

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/database/mongoose';
import { PriceAlert } from '@/database/models/alert.model';
import { Transaction } from '@/database/models/transaction.model';
import { Watchlist } from '@/database/models/watchlist.models';
import { logger } from '@/lib/logger';

const userFilter = (userId: string) => {
  const ids: unknown[] = [userId];
  if (ObjectId.isValid(userId)) ids.push(new ObjectId(userId));
  return { $in: ids };
};

async function authCollections() {
  const mongoose = await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection not found');
  return db;
}

/** Everything we hold about a user, for a GDPR-style data export. Secrets are excluded. */
export async function exportUserData(userId: string) {
  const db = await authCollections();
  const [user, accounts, sessions, transactions, watchlist, alerts] = await Promise.all([
    db.collection('user').findOne({ _id: ObjectId.isValid(userId) ? new ObjectId(userId) : (userId as never) }, { projection: { _id: 0 } }),
    db.collection('account').find({ userId: userFilter(userId) }, { projection: { _id: 0, providerId: 1, accountId: 1, createdAt: 1 } }).toArray(),
    db.collection('session').find({ userId: userFilter(userId) }, { projection: { _id: 0, createdAt: 1, expiresAt: 1, ipAddress: 1, userAgent: 1 } }).toArray(),
    Transaction.find({ userId }, { _id: 0, userId: 0, __v: 0 }).lean(),
    Watchlist.find({ userId }, { _id: 0, userId: 0, __v: 0 }).lean(),
    PriceAlert.find({ userId }, { _id: 0, userId: 0, __v: 0 }).lean(),
  ]);
  return { exportedAt: new Date().toISOString(), profile: user, linkedAccounts: accounts, sessions, transactions, watchlist, alerts };
}

/** Permanently deletes a user and all of their data. */
export async function deleteUserAndData(userId: string) {
  const db = await authCollections();
  await Promise.all([
    Transaction.deleteMany({ userId }),
    Watchlist.deleteMany({ userId }),
    PriceAlert.deleteMany({ userId }),
    db.collection('session').deleteMany({ userId: userFilter(userId) }),
    db.collection('account').deleteMany({ userId: userFilter(userId) }),
    db.collection('verification').deleteMany({ identifier: { $regex: userId } }),
  ]);
  await db.collection('user').deleteOne({ _id: ObjectId.isValid(userId) ? new ObjectId(userId) : (userId as never) });
  logger.info('account.deleted', { userId });
}
