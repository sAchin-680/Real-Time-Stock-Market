"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Holding, PortfolioTotals } from "@/lib/finance/portfolio";
import type { TickPoint } from "@/lib/client/market-store";
import type { LiveQuote } from "@/lib/types";
import { formatCurrency, formatPercent, formatQuantity, trendOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortfolioLive } from "@/hooks/usePortfolioLive";
import { LivePrice } from "@/components/finance/LivePrice";
import { Delta, KpiCard, Panel, SymbolCell, WeightBar } from "@/components/finance/primitives";
import Sparkline from "@/components/finance/Sparkline";
import SessionValueChart from "@/components/finance/SessionValueChart";

/* ─────────────── KPI strip ─────────────── */

export function KpiStrip({ totals, benchmark }: { totals: PortfolioTotals; benchmark?: LiveQuote }) {
  const realized = totals.realizedPnl + totals.dividends;
  const relative = benchmark ? totals.dayChangePercent - benchmark.changePercent : null;
  const dayTone = trendOf(totals.dayChange);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KpiCard
        label="Net liquidation value"
        value={formatCurrency(totals.marketValue)}
        hint={`${totals.positions} positions · cost ${formatCurrency(totals.costBasis, { compact: true })}`}
      />
      <KpiCard
        label="Day P&L"
        tone={dayTone === "up" ? "gain" : dayTone === "down" ? "loss" : undefined}
        value={<span className={cn(dayTone === "up" && "text-gain", dayTone === "down" && "text-loss")}>{formatCurrency(totals.dayChange, { signed: true })}</span>}
        delta={<Delta kind="percent" percent={totals.dayChangePercent} />}
        hint={
          relative !== null ? (
            <span>
              vs S&amp;P 500 <span className={cn("num", relative > 0.005 ? "text-gain" : relative < -0.005 ? "text-loss" : "text-gray-400")}>{formatPercent(relative)}</span>
            </span>
          ) : undefined
        }
      />
      <KpiCard
        label="Unrealized P&L"
        value={formatCurrency(totals.unrealizedPnl, { signed: true })}
        delta={<Delta kind="percent" percent={totals.unrealizedPercent} />}
        hint="open positions"
      />
      <KpiCard
        label="Total return"
        value={formatCurrency(totals.totalReturn, { signed: true })}
        hint={`${formatCurrency(realized, { signed: true, compact: Math.abs(realized) >= 1e5 })} realized + dividends`}
      />
    </div>
  );
}

/* ─────────────── Holdings table ─────────────── */

type SortKey = "symbol" | "marketValue" | "dayChangePercent" | "dayChange" | "unrealizedPnl" | "weight";

export function HoldingsTable({
  holdings,
  quotes,
  history,
  variant = "full",
  limit,
}: {
  holdings: Holding[];
  quotes: Record<string, LiveQuote>;
  history: Record<string, TickPoint[]>;
  variant?: "full" | "compact";
  limit?: number;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "marketValue", dir: -1 });
  const full = variant === "full";

  const rows = useMemo(() => {
    const sorted = [...holdings].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === "string" ? av.localeCompare(String(bv)) : (av as number) - (bv as number)) * sort.dir;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }, [holdings, sort, limit]);

  const th = (label: string, key?: SortKey, right = true) => (
    <th className={cn(right && "text-right")} aria-sort={key && sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      {key ? (
        <button
          type="button"
          onClick={() => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "symbol" ? 1 : -1 }))}
          className={cn("inline-flex items-center gap-1 uppercase hover:text-gray-100", right && "flex-row-reverse")}
        >
          {label}
          {sort.key === key ? sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />}
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            {th("Symbol", "symbol", false)}
            {th("Qty")}
            {full && th("Avg cost")}
            {th("Last")}
            {th("Intraday")}
            {th("Day %", "dayChangePercent")}
            {full && th("Day P&L", "dayChange")}
            {th("Mkt value", "marketValue")}
            {th("Unrealized", "unrealizedPnl")}
            {full && th("Weight", "weight")}
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => (
            <tr key={h.symbol}>
              <td>
                <SymbolCell symbol={h.symbol} name={h.name} logo={h.logo} />
              </td>
              <td className="num text-right text-gray-400">{formatQuantity(h.quantity)}</td>
              {full && <td className="num text-right text-gray-400">{formatCurrency(h.avgCost)}</td>}
              <td className="text-right">
                <LivePrice value={h.price} />
                {h.stale && <span className="ml-0.5 text-[10px] text-gray-500" title="No live quote; valued at cost">*</span>}
              </td>
              <td>
                <Sparkline points={history[h.symbol]} baseline={quotes[h.symbol]?.prevClose} width={72} height={22} className="ml-auto" />
              </td>
              <td className="text-right">
                <Delta kind="percent" percent={h.dayChangePercent} className="justify-end" />
              </td>
              {full && (
                <td className="text-right">
                  <Delta value={h.dayChange} showIcon={false} className="justify-end" />
                </td>
              )}
              <td className="num text-right font-medium">{formatCurrency(h.marketValue)}</td>
              <td className="text-right">
                <div className="flex flex-col items-end leading-tight">
                  <Delta value={h.unrealizedPnl} showIcon={false} />
                  <span className="num text-[11px] text-gray-500">{formatPercent(h.unrealizedPercent)}</span>
                </div>
              </td>
              {full && (
                <td>
                  <WeightBar weight={h.weight} className="justify-end" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────── Portfolio page composition ─────────────── */

export default function PortfolioLive({ holdings: initialHoldings, totals: initialTotals }: { holdings: Holding[]; totals: PortfolioTotals }) {
  const { holdings, totals, quotes, history, benchmark, updatedAt } = usePortfolioLive(initialHoldings, initialTotals);

  return (
    <div className="space-y-3">
      <KpiStrip totals={totals} benchmark={benchmark} />
      <SessionValueChart value={totals.marketValue} dayChange={totals.dayChange} height={150} />
      <Panel
        title="Positions"
        code="POS"
        action={updatedAt && <span className="num text-[11px] text-gray-500">as of {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
      >
        <HoldingsTable holdings={holdings} quotes={quotes} history={history} />
      </Panel>
    </div>
  );
}

export function ViewAllLink({ href, label = "View all" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="text-[11px] font-medium text-gray-500 hover:text-gray-100">
      {label} →
    </Link>
  );
}
