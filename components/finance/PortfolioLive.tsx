"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Clock } from "lucide-react";
import { applyLiveQuotes } from "@/lib/finance/live";
import type { Holding, PortfolioTotals } from "@/lib/finance/portfolio";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { LivePrice } from "@/components/finance/LivePrice";
import { Delta, KpiCard, Panel, SymbolCell, WeightBar } from "@/components/finance/primitives";

type SortKey = "symbol" | "marketValue" | "dayChangePercent" | "unrealizedPnl" | "unrealizedPercent" | "weight";

const COLUMNS: { key: SortKey | null; label: string; align?: "right" }[] = [
  { key: "symbol", label: "Holding" },
  { key: null, label: "Shares", align: "right" },
  { key: null, label: "Avg cost", align: "right" },
  { key: null, label: "Price", align: "right" },
  { key: "dayChangePercent", label: "Today", align: "right" },
  { key: "marketValue", label: "Market value", align: "right" },
  { key: "unrealizedPnl", label: "Unrealized P&L", align: "right" },
  { key: "weight", label: "Weight", align: "right" },
];

export default function PortfolioLive({
  holdings: initialHoldings,
  totals: initialTotals,
  variant = "full",
}: {
  holdings: Holding[];
  totals: PortfolioTotals;
  variant?: "full" | "compact";
}) {
  const symbols = useMemo(() => initialHoldings.map((h) => h.symbol), [initialHoldings]);
  const { quotes, updatedAt } = useLiveQuotes(symbols);
  const { holdings, totals } = useMemo(() => applyLiveQuotes(initialHoldings, initialTotals, quotes), [initialHoldings, initialTotals, quotes]);

  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "marketValue", dir: -1 });
  const sorted = useMemo(() => {
    const rows = [...holdings].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "string" ? av.localeCompare(String(bv)) : (av as number) - (bv as number)) * sort.dir;
    });
    return variant === "compact" ? rows.slice(0, 6) : rows;
  }, [holdings, sort, variant]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "symbol" ? 1 : -1 }));

  const realized = totals.realizedPnl + totals.dividends;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Portfolio value"
          value={formatCurrency(totals.marketValue)}
          hint={`${totals.positions} position${totals.positions === 1 ? "" : "s"} · cost ${formatCurrency(totals.costBasis, { compact: true })}`}
        />
        <KpiCard label="Today's P&L" value={formatCurrency(totals.dayChange, { signed: true })} delta={<Delta kind="percent" percent={totals.dayChangePercent} />} />
        <KpiCard
          label="Unrealized P&L"
          value={formatCurrency(totals.unrealizedPnl, { signed: true })}
          delta={<Delta kind="percent" percent={totals.unrealizedPercent} />}
          hint="on open positions"
        />
        <KpiCard
          label="Total return"
          value={formatCurrency(totals.totalReturn, { signed: true })}
          hint={`incl. ${formatCurrency(realized, { signed: true, compact: Math.abs(realized) >= 1e5 })} realized & dividends`}
        />
      </div>

      <Panel
        title={variant === "compact" ? "Top holdings" : "Holdings"}
        action={
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {updatedAt && (
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Clock className="size-3" /> {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            {variant === "compact" && (
              <Link href="/portfolio" className="font-medium text-yellow-400 hover:text-yellow-500">
                View all →
              </Link>
            )}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {COLUMNS.filter((c) => variant === "full" || !["Avg cost", "Weight"].includes(c.label)).map((c) => (
                  <th key={c.label} className={cn(c.align === "right" && "text-right")} aria-sort={c.key && sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                    {c.key ? (
                      <button type="button" onClick={() => toggleSort(c.key!)} className={cn("inline-flex items-center gap-1 uppercase hover:text-gray-400", c.align === "right" && "flex-row-reverse")}>
                        {c.label}
                        {sort.key === c.key ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
                <tr key={h.symbol}>
                  <td>
                    <SymbolCell symbol={h.symbol} name={h.name} logo={h.logo} />
                  </td>
                  <td className="num text-right text-gray-400">{formatQuantity(h.quantity)}</td>
                  {variant === "full" && <td className="num text-right text-gray-400">{formatCurrency(h.avgCost)}</td>}
                  <td className="text-right">
                    <LivePrice value={h.price} />
                    {h.stale && <span className="ml-1 text-[10px] text-gray-500" title="No live quote; showing cost">*</span>}
                  </td>
                  <td className="text-right">
                    <Delta kind="percent" percent={h.dayChangePercent} className="justify-end" />
                  </td>
                  <td className="num text-right font-medium">{formatCurrency(h.marketValue)}</td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <Delta value={h.unrealizedPnl} showIcon={false} />
                      <span className={cn("num text-xs", h.unrealizedPercent >= 0 ? "text-gain/80" : "text-loss/80")}>{formatPercent(h.unrealizedPercent)}</span>
                    </div>
                  </td>
                  {variant === "full" && (
                    <td>
                      <WeightBar weight={h.weight} className="justify-end" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
