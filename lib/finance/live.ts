import type { Holding, PortfolioTotals, QuoteInput } from '@/lib/finance/portfolio';

/**
 * Re-marks holdings with fresh quotes on the client. Mirrors the maths in
 * summarizePortfolio so live numbers always agree with the server snapshot.
 */
export function applyLiveQuotes(
  holdings: readonly Holding[],
  totals: PortfolioTotals,
  quotes: Record<string, QuoteInput | undefined>
): { holdings: Holding[]; totals: PortfolioTotals } {
  const next = holdings.map((h) => {
    const q = quotes[h.symbol];
    if (!q || !(q.price > 0)) return h;
    const marketValue = h.quantity * q.price;
    const unrealizedPnl = marketValue - h.costBasis;
    return {
      ...h,
      price: q.price,
      marketValue,
      dayChange: h.quantity * q.change,
      dayChangePercent: q.changePercent,
      unrealizedPnl,
      unrealizedPercent: h.costBasis ? (unrealizedPnl / h.costBasis) * 100 : 0,
      stale: false,
    };
  });

  const marketValue = next.reduce((s, h) => s + h.marketValue, 0);
  for (const h of next) h.weight = marketValue > 0 ? h.marketValue / marketValue : 0;

  const costBasis = next.reduce((s, h) => s + h.costBasis, 0);
  const unrealizedPnl = marketValue - costBasis;
  const dayChange = next.reduce((s, h) => s + h.dayChange, 0);
  const prevValue = marketValue - dayChange;

  return {
    holdings: next,
    totals: {
      ...totals,
      marketValue,
      costBasis,
      unrealizedPnl,
      unrealizedPercent: costBasis ? (unrealizedPnl / costBasis) * 100 : 0,
      dayChange,
      dayChangePercent: prevValue ? (dayChange / prevValue) * 100 : 0,
      totalReturn: unrealizedPnl + totals.realizedPnl + totals.dividends,
    },
  };
}
