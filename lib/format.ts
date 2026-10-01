const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Collapses floating-point dust (e.g. -0.000001) so it never renders as "-$0.00". */
const clean = (v: number, digits: number) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v);

const currencyFormatters = new Map<string, Intl.NumberFormat>();
const getCurrencyFormatter = (currency: string, compact: boolean) => {
  const key = `${currency}:${compact}`;
  let fmt = currencyFormatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      minimumFractionDigits: compact ? 0 : 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(key, fmt);
  }
  return fmt;
};

export function formatCurrency(
  value: number | null | undefined,
  { currency = 'USD', compact = false, signed = false }: { currency?: string; compact?: boolean; signed?: boolean } = {}
): string {
  if (!isNum(value)) return '—';
  value = clean(value, 2);
  const formatted = getCurrencyFormatter(currency, compact).format(Math.abs(value));
  if (value < 0) return `-${formatted}`;
  if (signed && value > 0) return `+${formatted}`;
  return formatted;
}

export function formatPercent(
  value: number | null | undefined,
  { signed = true, digits = 2 }: { signed?: boolean; digits?: number } = {}
): string {
  if (!isNum(value)) return '—';
  value = clean(value, digits);
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${(value === 0 ? 0 : value).toFixed(digits)}%`;
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (!isNum(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: digits });
}

/** Shares: integers stay clean, fractional shares keep up to 6 decimals. */
export function formatQuantity(value: number | null | undefined): string {
  if (!isNum(value)) return '—';
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/** Finnhub reports market cap in millions. */
export function formatMarketCapMillions(millions: number | null | undefined): string {
  if (!isNum(millions) || millions <= 0) return '—';
  return formatCurrency(millions * 1e6, { compact: true });
}

export type Trend = 'up' | 'down' | 'flat';
export const trendOf = (value: number | null | undefined): Trend =>
  !isNum(value) || Math.abs(value) < 0.005 ? 'flat' : value > 0 ? 'up' : 'down';
