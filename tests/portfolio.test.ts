import { describe, expect, it } from 'vitest';
import {
  LedgerError,
  buildLedger,
  computeRisk,
  realizedByMonth,
  summarizePortfolio,
  type LedgerTransaction,
} from '@/lib/finance/portfolio';

const tx = (t: Partial<LedgerTransaction> & Pick<LedgerTransaction, 'side' | 'quantity' | 'price' | 'executedAt'>): LedgerTransaction => ({
  symbol: 'AAPL',
  ...t,
});

describe('buildLedger', () => {
  it('capitalises buy fees into cost basis', () => {
    const { positions } = buildLedger([tx({ side: 'BUY', quantity: 10, price: 100, fees: 5, executedAt: '2026-01-02' })]);
    expect(positions.AAPL.quantity).toBe(10);
    expect(positions.AAPL.costBasis).toBeCloseTo(1005);
  });

  it('realises P&L on sells using FIFO lots', () => {
    const { positions, realized } = buildLedger([
      tx({ side: 'BUY', quantity: 10, price: 100, executedAt: '2026-01-02' }),
      tx({ side: 'BUY', quantity: 10, price: 200, executedAt: '2026-02-02' }),
      tx({ side: 'SELL', quantity: 15, price: 250, fees: 10, executedAt: '2026-03-02' }),
    ]);
    // Cost of 15 FIFO shares = 10*100 + 5*200 = 2000; proceeds = 3750 - 10.
    expect(positions.AAPL.realizedPnl).toBeCloseTo(1740);
    expect(positions.AAPL.quantity).toBe(5);
    expect(positions.AAPL.costBasis).toBeCloseTo(1000);
    expect(realized).toHaveLength(1);
  });

  it('processes transactions chronologically regardless of input order', () => {
    const { positions } = buildLedger([
      tx({ side: 'SELL', quantity: 5, price: 120, executedAt: '2026-02-01' }),
      tx({ side: 'BUY', quantity: 5, price: 100, executedAt: '2026-01-01' }),
    ]);
    expect(positions.AAPL.quantity).toBe(0);
    expect(positions.AAPL.realizedPnl).toBeCloseTo(100);
  });

  it('applies same-day buys before sells', () => {
    expect(() =>
      buildLedger([
        tx({ side: 'SELL', quantity: 1, price: 10, executedAt: '2026-01-01' }),
        tx({ side: 'BUY', quantity: 1, price: 5, executedAt: '2026-01-01' }),
      ])
    ).not.toThrow();
  });

  it('rejects selling more than held', () => {
    expect(() =>
      buildLedger([
        tx({ side: 'BUY', quantity: 1, price: 10, executedAt: '2026-01-01' }),
        tx({ side: 'SELL', quantity: 2, price: 10, executedAt: '2026-01-02' }),
      ])
    ).toThrow(LedgerError);
  });

  it('records dividends as realised income without touching the position', () => {
    const { positions, realized } = buildLedger([
      tx({ side: 'BUY', quantity: 10, price: 100, executedAt: '2026-01-01' }),
      tx({ side: 'DIVIDEND', quantity: 10, price: 0.25, executedAt: '2026-02-01' }),
    ]);
    expect(positions.AAPL.dividends).toBeCloseTo(2.5);
    expect(positions.AAPL.quantity).toBe(10);
    expect(realized[0].kind).toBe('dividend');
  });

  it('handles fractional shares without float drift', () => {
    const { positions } = buildLedger([
      tx({ side: 'BUY', quantity: 0.1, price: 100, executedAt: '2026-01-01' }),
      tx({ side: 'BUY', quantity: 0.2, price: 100, executedAt: '2026-01-02' }),
      tx({ side: 'SELL', quantity: 0.3, price: 100, executedAt: '2026-01-03' }),
    ]);
    expect(positions.AAPL.quantity).toBe(0);
    expect(positions.AAPL.costBasis).toBe(0);
  });

  it('rejects non-positive quantities', () => {
    expect(() => buildLedger([tx({ side: 'BUY', quantity: 0, price: 1, executedAt: '2026-01-01' })])).toThrow(LedgerError);
  });
});

describe('summarizePortfolio', () => {
  const ledger = buildLedger([
    tx({ symbol: 'AAPL', side: 'BUY', quantity: 10, price: 100, executedAt: '2026-01-01' }),
    tx({ symbol: 'MSFT', side: 'BUY', quantity: 5, price: 200, executedAt: '2026-01-01' }),
    tx({ symbol: 'XOM', side: 'BUY', quantity: 10, price: 50, executedAt: '2026-01-01' }),
  ]);

  const summary = summarizePortfolio(
    ledger,
    {
      AAPL: { price: 150, change: 3, changePercent: 2.04 },
      MSFT: { price: 300, change: -6, changePercent: -1.96 },
    },
    {
      AAPL: { name: 'Apple', industry: 'Technology', beta: 1.2 },
      MSFT: { name: 'Microsoft', industry: 'Technology', beta: 0.9 },
      XOM: { name: 'Exxon', industry: 'Energy' },
    }
  );

  it('marks to market and computes totals', () => {
    expect(summary.totals.marketValue).toBeCloseTo(1500 + 1500 + 500);
    expect(summary.totals.costBasis).toBeCloseTo(2500);
    expect(summary.totals.unrealizedPnl).toBeCloseTo(1000);
    expect(summary.totals.unrealizedPercent).toBeCloseTo(40);
    expect(summary.totals.dayChange).toBeCloseTo(30 - 30);
  });

  it('falls back to cost for missing quotes and flags them stale', () => {
    const xom = summary.holdings.find((h) => h.symbol === 'XOM')!;
    expect(xom.stale).toBe(true);
    expect(xom.price).toBe(50);
  });

  it('weights sum to 1 and holdings are sorted by value', () => {
    expect(summary.holdings.reduce((s, h) => s + h.weight, 0)).toBeCloseTo(1);
    expect(summary.holdings.at(-1)!.symbol).toBe('XOM');
  });

  it('groups sector allocation', () => {
    expect(summary.sectorAllocation[0]).toMatchObject({ label: 'Technology', value: 3000 });
    expect(summary.sectorAllocation[1]).toMatchObject({ label: 'Energy', value: 500 });
  });

  it('computes beta only over covered weight', () => {
    expect(summary.risk.beta).toBeCloseTo(1.05);
    expect(summary.risk.betaCoverage).toBeCloseTo(3000 / 3500);
  });

  it('returns zeros for an empty portfolio', () => {
    const empty = summarizePortfolio(buildLedger([]), {});
    expect(empty.totals.marketValue).toBe(0);
    expect(empty.risk.beta).toBeNull();
    expect(empty.risk.topPosition).toBeNull();
  });
});

describe('computeRisk', () => {
  it('classifies concentration with HHI bands', () => {
    expect(computeRisk([{ symbol: 'A', weight: 1 }], []).concentration).toBe('high');
    const even = Array.from({ length: 10 }, (_, i) => ({ symbol: `S${i}`, weight: 0.1 }));
    const risk = computeRisk(even, []);
    expect(risk.concentration).toBe('low');
    expect(risk.effectivePositions).toBeCloseTo(10);
  });
});

describe('realizedByMonth', () => {
  it('buckets trailing months and splits trading vs dividends', () => {
    const rows = realizedByMonth(
      [
        { symbol: 'A', date: new Date('2026-09-10'), amount: 100, kind: 'trade' },
        { symbol: 'A', date: new Date('2026-09-15'), amount: 5, kind: 'dividend' },
        { symbol: 'A', date: new Date('2024-01-01'), amount: 999, kind: 'trade' },
      ],
      3,
      new Date('2026-10-01T12:00:00Z')
    );
    expect(rows.map((r) => r.month)).toEqual(['2026-08', '2026-09', '2026-10']);
    expect(rows[1]).toMatchObject({ trading: 100, dividends: 5, total: 105 });
  });
});
