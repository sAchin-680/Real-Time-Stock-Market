/**
 * Portfolio accounting engine. Pure functions only (no I/O) so every number
 * shown in the UI is reproducible and unit tested.
 *
 * Cost basis method: FIFO. Fees on buys are capitalised into the lot's cost,
 * fees on sells reduce proceeds.
 */

export type TransactionSide = 'BUY' | 'SELL' | 'DIVIDEND';

export interface LedgerTransaction {
  id?: string;
  symbol: string;
  side: TransactionSide;
  /** Shares bought/sold; for DIVIDEND the number of shares the payout applies to. */
  quantity: number;
  /** Price per share; for DIVIDEND the payout per share. */
  price: number;
  fees?: number;
  executedAt: Date | string;
}

export interface Lot {
  quantity: number;
  costPerShare: number;
  acquiredAt: Date;
}

export interface PositionState {
  symbol: string;
  quantity: number;
  costBasis: number;
  lots: Lot[];
  realizedPnl: number;
  dividends: number;
  fees: number;
}

export interface RealizedEvent {
  symbol: string;
  date: Date;
  amount: number;
  kind: 'trade' | 'dividend';
}

export interface Ledger {
  positions: Record<string, PositionState>;
  realized: RealizedEvent[];
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

const EPSILON = 1e-9;
const round = (n: number, dp = 8) => Math.round(n * 10 ** dp) / 10 ** dp;

const sideOrder: Record<TransactionSide, number> = { BUY: 0, DIVIDEND: 1, SELL: 2 };

/** Replays transactions chronologically into open lots and realised results. */
export function buildLedger(transactions: readonly LedgerTransaction[]): Ledger {
  const positions: Record<string, PositionState> = {};
  const realized: RealizedEvent[] = [];

  const sorted = [...transactions]
    .map((t) => ({ ...t, executedAt: new Date(t.executedAt) }))
    .sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime() || sideOrder[a.side] - sideOrder[b.side]);

  for (const tx of sorted) {
    const symbol = tx.symbol.toUpperCase();
    const fees = tx.fees ?? 0;
    if (!(tx.quantity > 0)) throw new LedgerError(`Quantity must be positive (${symbol})`);
    if (tx.price < 0 || fees < 0) throw new LedgerError(`Price and fees cannot be negative (${symbol})`);

    const pos = (positions[symbol] ??= {
      symbol,
      quantity: 0,
      costBasis: 0,
      lots: [],
      realizedPnl: 0,
      dividends: 0,
      fees: 0,
    });
    pos.fees += fees;

    if (tx.side === 'BUY') {
      const cost = tx.quantity * tx.price + fees;
      pos.lots.push({ quantity: tx.quantity, costPerShare: cost / tx.quantity, acquiredAt: tx.executedAt });
      pos.quantity = round(pos.quantity + tx.quantity);
      pos.costBasis += cost;
      continue;
    }

    if (tx.side === 'DIVIDEND') {
      const amount = tx.quantity * tx.price - fees;
      pos.dividends += amount;
      realized.push({ symbol, date: tx.executedAt, amount, kind: 'dividend' });
      continue;
    }

    // SELL — consume lots first-in, first-out.
    if (tx.quantity > pos.quantity + EPSILON) {
      throw new LedgerError(
        `Cannot sell ${tx.quantity} ${symbol} on ${tx.executedAt.toISOString().slice(0, 10)}: only ${round(pos.quantity, 6)} held`
      );
    }

    let remaining = tx.quantity;
    let consumedCost = 0;
    while (remaining > EPSILON && pos.lots.length) {
      const lot = pos.lots[0];
      const take = Math.min(lot.quantity, remaining);
      consumedCost += take * lot.costPerShare;
      lot.quantity = round(lot.quantity - take);
      remaining = round(remaining - take);
      if (lot.quantity <= EPSILON) pos.lots.shift();
    }

    const proceeds = tx.quantity * tx.price - fees;
    const pnl = proceeds - consumedCost;
    pos.realizedPnl += pnl;
    pos.quantity = round(pos.quantity - tx.quantity);
    pos.costBasis = pos.quantity <= EPSILON ? 0 : Math.max(0, pos.costBasis - consumedCost);
    if (pos.quantity <= EPSILON) {
      pos.quantity = 0;
      pos.lots = [];
    }
    realized.push({ symbol, date: tx.executedAt, amount: pnl, kind: 'trade' });
  }

  return { positions, realized };
}

export interface QuoteInput {
  price: number;
  change: number;
  changePercent: number;
}

export interface CompanyInput {
  name?: string;
  logo?: string;
  industry?: string;
  beta?: number;
}

export interface Holding {
  symbol: string;
  name: string;
  logo?: string;
  sector: string;
  quantity: number;
  avgCost: number;
  costBasis: number;
  price: number;
  marketValue: number;
  dayChange: number;
  dayChangePercent: number;
  unrealizedPnl: number;
  unrealizedPercent: number;
  realizedPnl: number;
  dividends: number;
  weight: number;
  beta?: number;
  /** True when no live quote was available and cost basis was used as price. */
  stale: boolean;
}

export interface AllocationSlice {
  label: string;
  value: number;
  weight: number;
}

export type ConcentrationLevel = 'low' | 'moderate' | 'high';

export interface RiskMetrics {
  /** Market-value weighted beta across holdings with a known beta. */
  beta: number | null;
  /** Share of portfolio value covered by the beta estimate (0–1). */
  betaCoverage: number;
  /** Herfindahl–Hirschman index of position weights (0–1). */
  hhi: number;
  /** 1 / HHI — the number of equally weighted positions with the same concentration. */
  effectivePositions: number;
  topPosition: { symbol: string; weight: number } | null;
  topSector: { label: string; weight: number } | null;
  concentration: ConcentrationLevel;
}

export interface PortfolioTotals {
  marketValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPercent: number;
  dayChange: number;
  dayChangePercent: number;
  realizedPnl: number;
  dividends: number;
  totalReturn: number;
  positions: number;
}

export interface PortfolioSummary {
  holdings: Holding[];
  totals: PortfolioTotals;
  sectorAllocation: AllocationSlice[];
  risk: RiskMetrics;
}

const pct = (num: number, den: number) => (Math.abs(den) > EPSILON ? (num / den) * 100 : 0);

/** Marks open positions to market and derives totals, allocation and risk. */
export function summarizePortfolio(
  ledger: Ledger,
  quotes: Record<string, QuoteInput | undefined>,
  companies: Record<string, CompanyInput | undefined> = {}
): PortfolioSummary {
  const positions = Object.values(ledger.positions);

  const open = positions
    .filter((p) => p.quantity > EPSILON)
    .map((p) => {
      const quote = quotes[p.symbol];
      const company = companies[p.symbol] ?? {};
      const avgCost = p.costBasis / p.quantity;
      const price = quote && quote.price > 0 ? quote.price : avgCost;
      const marketValue = p.quantity * price;
      const unrealizedPnl = marketValue - p.costBasis;
      return {
        symbol: p.symbol,
        name: company.name || p.symbol,
        logo: company.logo || undefined,
        sector: company.industry || 'Other',
        quantity: p.quantity,
        avgCost,
        costBasis: p.costBasis,
        price,
        marketValue,
        dayChange: quote ? p.quantity * quote.change : 0,
        dayChangePercent: quote?.changePercent ?? 0,
        unrealizedPnl,
        unrealizedPercent: pct(unrealizedPnl, p.costBasis),
        realizedPnl: p.realizedPnl,
        dividends: p.dividends,
        weight: 0,
        beta: company.beta,
        stale: !quote || !(quote.price > 0),
      } satisfies Holding;
    });

  const marketValue = open.reduce((s, h) => s + h.marketValue, 0);
  for (const h of open) h.weight = marketValue > 0 ? h.marketValue / marketValue : 0;
  open.sort((a, b) => b.marketValue - a.marketValue);

  const costBasis = open.reduce((s, h) => s + h.costBasis, 0);
  const unrealizedPnl = marketValue - costBasis;
  const dayChange = open.reduce((s, h) => s + h.dayChange, 0);
  const realizedPnl = positions.reduce((s, p) => s + p.realizedPnl, 0);
  const dividends = positions.reduce((s, p) => s + p.dividends, 0);

  const totals: PortfolioTotals = {
    marketValue,
    costBasis,
    unrealizedPnl,
    unrealizedPercent: pct(unrealizedPnl, costBasis),
    dayChange,
    dayChangePercent: pct(dayChange, marketValue - dayChange),
    realizedPnl,
    dividends,
    totalReturn: unrealizedPnl + realizedPnl + dividends,
    positions: open.length,
  };

  const sectorAllocation = allocateBy(open, (h) => h.sector);

  return { holdings: open, totals, sectorAllocation, risk: computeRisk(open, sectorAllocation) };
}

export function allocateBy<T extends { marketValue: number }>(items: readonly T[], key: (item: T) => string): AllocationSlice[] {
  const total = items.reduce((s, i) => s + i.marketValue, 0);
  const groups = new Map<string, number>();
  for (const item of items) groups.set(key(item), (groups.get(key(item)) ?? 0) + item.marketValue);
  return [...groups.entries()]
    .map(([label, value]) => ({ label, value, weight: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value);
}

export function computeRisk(
  holdings: readonly Pick<Holding, 'symbol' | 'weight' | 'beta'>[],
  sectors: readonly AllocationSlice[]
): RiskMetrics {
  if (!holdings.length) {
    return { beta: null, betaCoverage: 0, hhi: 0, effectivePositions: 0, topPosition: null, topSector: null, concentration: 'low' };
  }

  const hhi = holdings.reduce((s, h) => s + h.weight ** 2, 0);

  const withBeta = holdings.filter((h) => typeof h.beta === 'number' && Number.isFinite(h.beta));
  const betaCoverage = withBeta.reduce((s, h) => s + h.weight, 0);
  const beta = betaCoverage > EPSILON ? withBeta.reduce((s, h) => s + h.weight * (h.beta as number), 0) / betaCoverage : null;

  const top = holdings.reduce((a, b) => (b.weight > a.weight ? b : a));
  const topSector = sectors[0] ? { label: sectors[0].label, weight: sectors[0].weight } : null;

  // Thresholds follow the conventional HHI bands (0.15 / 0.25).
  const concentration: ConcentrationLevel = hhi > 0.25 ? 'high' : hhi > 0.15 ? 'moderate' : 'low';

  return {
    beta,
    betaCoverage,
    hhi,
    effectivePositions: hhi > 0 ? 1 / hhi : 0,
    topPosition: { symbol: top.symbol, weight: top.weight },
    topSector,
    concentration,
  };
}

export interface MonthlyRealized {
  month: string; // YYYY-MM
  trading: number;
  dividends: number;
  total: number;
}

/** Realised P&L bucketed by calendar month (UTC) for the trailing `months` months. */
export function realizedByMonth(events: readonly RealizedEvent[], months = 12, now = new Date()): MonthlyRealized[] {
  const buckets: MonthlyRealized[] = [];
  const index = new Map<string, MonthlyRealized>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = d.toISOString().slice(0, 7);
    const bucket = { month, trading: 0, dividends: 0, total: 0 };
    buckets.push(bucket);
    index.set(month, bucket);
  }
  for (const e of events) {
    const bucket = index.get(new Date(e.date).toISOString().slice(0, 7));
    if (!bucket) continue;
    if (e.kind === 'dividend') bucket.dividends += e.amount;
    else bucket.trading += e.amount;
    bucket.total += e.amount;
  }
  return buckets;
}
