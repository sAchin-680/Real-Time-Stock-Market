import 'server-only';

import { connectToDatabase } from '@/database/mongoose';
import { Transaction, type TransactionDoc } from '@/database/models/transaction.model';
import { buildLedger, realizedByMonth, summarizePortfolio, type LedgerTransaction } from '@/lib/finance/portfolio';
import { getMetricsMany, getProfiles, getQuotes, isMarketDataConfigured } from '@/lib/server/finnhub';
import type { PortfolioSnapshot, TransactionDTO } from '@/lib/types';

type LeanTransaction = Pick<TransactionDoc, 'symbol' | 'side' | 'quantity' | 'price' | 'fees' | 'executedAt' | 'notes'> & {
  _id: unknown;
};

export const toLedgerTx = (t: LeanTransaction): LedgerTransaction => ({
  id: String(t._id),
  symbol: t.symbol,
  side: t.side,
  quantity: t.quantity,
  price: t.price,
  fees: t.fees ?? 0,
  executedAt: t.executedAt,
});

export const toTransactionDTO = (t: LeanTransaction): TransactionDTO => {
  const gross = t.quantity * t.price;
  const fees = t.fees ?? 0;
  return {
    id: String(t._id),
    symbol: t.symbol,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    fees,
    total: t.side === 'BUY' ? gross + fees : gross - fees,
    executedAt: new Date(t.executedAt).toISOString(),
    notes: t.notes ?? '',
  };
};

export async function loadTransactions(userId: string): Promise<LeanTransaction[]> {
  await connectToDatabase();
  return Transaction.find({ userId }).sort({ executedAt: -1, createdAt: -1 }).lean<LeanTransaction[]>();
}

export async function getPortfolioSnapshotForUser(userId: string): Promise<PortfolioSnapshot> {
  const transactions = await loadTransactions(userId);
  const ledger = buildLedger(transactions.map(toLedgerTx));

  const openSymbols = Object.values(ledger.positions)
    .filter((p) => p.quantity > 0)
    .map((p) => p.symbol);

  const [quotes, profiles, metrics] = await Promise.all([
    getQuotes(openSymbols),
    getProfiles(openSymbols),
    getMetricsMany(openSymbols),
  ]);

  const companies = Object.fromEntries(
    openSymbols.map((s) => [
      s,
      { name: profiles[s]?.name, logo: profiles[s]?.logo, industry: profiles[s]?.industry, beta: metrics[s]?.beta },
    ])
  );

  const summary = summarizePortfolio(ledger, quotes, companies);

  return {
    ...summary,
    monthlyRealized: realizedByMonth(ledger.realized),
    transactionCount: transactions.length,
    marketDataAvailable: isMarketDataConfigured(),
    asOf: new Date().toISOString(),
  };
}
