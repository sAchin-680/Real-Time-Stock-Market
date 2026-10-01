import { NextResponse } from 'next/server';
import { toCsv } from '@/lib/csv';
import { getSessionUser } from '@/lib/server/session';
import { loadTransactions, toTransactionDTO } from '@/lib/services/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = (await loadTransactions(user.id)).map(toTransactionDTO).reverse();
  const csv = toCsv([
    ['date', 'symbol', 'side', 'quantity', 'price', 'fees', 'total', 'notes'],
    ...rows.map((t) => [t.executedAt.slice(0, 10), t.symbol, t.side, t.quantity, t.price, t.fees, t.total.toFixed(2), t.notes]),
  ]);

  const filename = `signalist-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(`﻿${csv}\r\n`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
