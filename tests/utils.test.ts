import { describe, expect, it, vi } from 'vitest';
import { TTLCache, mapWithConcurrency } from '@/lib/cache';
import { createRateLimiter } from '@/lib/rate-limit';
import { parseCsv, parseCsvRecords, toCsv } from '@/lib/csv';
import { formatCurrency, formatMarketCapMillions, formatPercent, formatQuantity, trendOf } from '@/lib/format';
import { alertInputSchema, symbolSchema, transactionInputSchema } from '@/lib/validation';

describe('TTLCache', () => {
  it('expires entries and evicts least recently used', () => {
    const c = new TTLCache<string, number>(1000, 2);
    c.set('a', 1, undefined, 0);
    c.set('b', 2, undefined, 0);
    c.get('a', 10);
    c.set('c', 3, undefined, 10);
    expect(c.get('b', 20)).toBeUndefined();
    expect(c.get('a', 20)).toBe(1);
    expect(c.get('a', 2000)).toBeUndefined();
  });
});

describe('mapWithConcurrency', () => {
  it('preserves order and caps parallelism', async () => {
    let active = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});

describe('createRateLimiter', () => {
  it('allows up to the limit within a window', () => {
    const rl = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(rl.check('k', 0).allowed).toBe(true);
    expect(rl.check('k', 1).allowed).toBe(true);
    expect(rl.check('k', 2).allowed).toBe(false);
    expect(rl.check('k', 1001).allowed).toBe(true);
  });
});

describe('csv', () => {
  it('round-trips quoted fields', () => {
    const text = toCsv([['a', 'b'], ['x,y', 'say "hi"']]);
    expect(parseCsv(text)).toEqual([['a', 'b'], ['x,y', 'say "hi"']]);
  });
  it('neutralises formula injection but keeps negative numbers', () => {
    expect(toCsv([['=HYPERLINK()', '-5']])).toBe("'=HYPERLINK(),-5");
  });
  it('parses records with BOM and blank lines', () => {
    expect(parseCsvRecords('﻿Symbol,Qty\nAAPL,1\n\n')).toEqual([{ symbol: 'AAPL', qty: '1' }]);
  });
});

describe('format', () => {
  it('formats currency and percent', () => {
    expect(formatCurrency(1234.5)).toBe('$1,234.50');
    expect(formatCurrency(-5)).toBe('-$5.00');
    expect(formatCurrency(5, { signed: true })).toBe('+$5.00');
    expect(formatCurrency(undefined)).toBe('—');
    expect(formatPercent(1.234)).toBe('+1.23%');
    expect(formatQuantity(1.5)).toBe('1.5');
    expect(formatMarketCapMillions(2_500_000)).toBe('$2.5T');
    expect(trendOf(-1)).toBe('down');
  });
});

describe('validation', () => {
  it('normalises symbols', () => {
    expect(symbolSchema.parse(' aapl ')).toBe('AAPL');
    expect(symbolSchema.safeParse('<script>').success).toBe(false);
  });
  it('validates transactions', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-01'));
    expect(transactionInputSchema.parse({ symbol: 'msft', side: 'BUY', quantity: '2', price: '10', executedAt: '2026-09-01' })).toMatchObject({
      symbol: 'MSFT',
      quantity: 2,
      fees: 0,
    });
    expect(transactionInputSchema.safeParse({ symbol: 'MSFT', side: 'BUY', quantity: 1, price: 0, executedAt: '2026-09-01' }).success).toBe(false);
    expect(transactionInputSchema.safeParse({ symbol: 'MSFT', side: 'BUY', quantity: 1, price: 1, executedAt: '2027-09-01' }).success).toBe(false);
    vi.useRealTimers();
  });
  it('validates alerts', () => {
    expect(alertInputSchema.safeParse({ symbol: 'AAPL', company: 'Apple', name: 'x', condition: 'PRICE_ABOVE', threshold: -1 }).success).toBe(false);
  });
});
