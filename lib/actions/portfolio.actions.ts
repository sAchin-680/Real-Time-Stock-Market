'use server';

import { revalidatePath } from 'next/cache';
import { connectToDatabase } from '@/database/mongoose';
import { Transaction } from '@/database/models/transaction.model';
import { parseCsvRecords } from '@/lib/csv';
import { AppError, runAction, type ActionResult } from '@/lib/errors';
import { LedgerError, buildLedger, type LedgerTransaction } from '@/lib/finance/portfolio';
import { requireUser } from '@/lib/server/session';
import { getPortfolioSnapshotForUser, loadTransactions, toLedgerTx, toTransactionDTO } from '@/lib/services/portfolio';
import type { PortfolioSnapshot, TransactionDTO } from '@/lib/types';
import { objectIdSchema, transactionInputSchema, type TransactionInput } from '@/lib/validation';

const MAX_IMPORT_ROWS = 2000;

const revalidatePortfolio = () => {
  revalidatePath('/');
  revalidatePath('/portfolio');
};

/** Throws a user-facing error if the resulting ledger would be inconsistent (e.g. overselling). */
function assertLedgerValid(transactions: LedgerTransaction[]) {
  try {
    buildLedger(transactions);
  } catch (err) {
    if (err instanceof LedgerError) throw new AppError(err.message, 'CONFLICT');
    throw err;
  }
}

export async function getPortfolioSnapshot(): Promise<PortfolioSnapshot> {
  const user = await requireUser();
  return getPortfolioSnapshotForUser(user.id);
}

export async function listTransactions(): Promise<TransactionDTO[]> {
  const user = await requireUser();
  return (await loadTransactions(user.id)).map(toTransactionDTO);
}

export async function addTransaction(input: TransactionInput): Promise<ActionResult<TransactionDTO>> {
  return runAction('portfolio.addTransaction', async () => {
    const user = await requireUser();
    const data = transactionInputSchema.parse(input);

    const existing = await loadTransactions(user.id);
    assertLedgerValid([...existing.map(toLedgerTx), data]);

    const created = await Transaction.create({ ...data, userId: user.id });
    revalidatePortfolio();
    return toTransactionDTO(created.toObject());
  });
}

export async function deleteTransaction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction('portfolio.deleteTransaction', async () => {
    const user = await requireUser();
    const txId = objectIdSchema.parse(id);

    const existing = await loadTransactions(user.id);
    if (!existing.some((t) => String(t._id) === txId)) throw new AppError('Transaction not found', 'NOT_FOUND');

    // Deleting a buy can invalidate a later sell; block that instead of silently corrupting P&L.
    assertLedgerValid(existing.filter((t) => String(t._id) !== txId).map(toLedgerTx));

    await Transaction.deleteOne({ _id: txId, userId: user.id });
    revalidatePortfolio();
    return { id: txId };
  });
}

/**
 * Imports trades from CSV. Expected header (case-insensitive, any order):
 * date, symbol, side, quantity, price[, fees][, notes]
 * All rows are validated before anything is written.
 */
export async function importTransactionsCsv(csv: string): Promise<ActionResult<{ imported: number }>> {
  return runAction('portfolio.importCsv', async () => {
    const user = await requireUser();
    if (csv.length > 1_000_000) throw new AppError('File is too large (max 1 MB)');

    const records = parseCsvRecords(csv);
    if (!records.length) throw new AppError('No rows found. Expected a header row: date,symbol,side,quantity,price,fees,notes');
    if (records.length > MAX_IMPORT_ROWS) throw new AppError(`Import up to ${MAX_IMPORT_ROWS} rows at a time`);

    const parsed = records.map((r, i) => {
      const result = transactionInputSchema.safeParse({
        symbol: r.symbol ?? r.ticker,
        side: (r.side ?? r.type ?? r.action ?? '').toUpperCase(),
        quantity: r.quantity ?? r.qty ?? r.shares,
        price: r.price,
        fees: r.fees || r.commission || 0,
        executedAt: r.date ?? r.executedat ?? r['trade date'],
        notes: r.notes ?? '',
      });
      if (!result.success) {
        const issue = result.error.issues[0];
        throw new AppError(`Row ${i + 2}: ${issue.path.join('.') || 'row'} — ${issue.message}`);
      }
      return result.data;
    });

    const existing = await loadTransactions(user.id);
    assertLedgerValid([...existing.map(toLedgerTx), ...parsed]);

    await connectToDatabase();
    await Transaction.insertMany(parsed.map((p) => ({ ...p, userId: user.id })));
    revalidatePortfolio();
    return { imported: parsed.length };
  });
}
