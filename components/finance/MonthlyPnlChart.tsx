"use client";

import { useState } from "react";
import type { MonthlyRealized } from "@/lib/finance/portfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const monthLabel = (m: string, style: "short" | "long" = "short") =>
  new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-US", { month: style, year: style === "long" ? "numeric" : undefined, timeZone: "UTC" });

/**
 * Diverging column chart of realised P&L per month. Polarity is encoded by
 * direction from the zero baseline *and* colour; hover shows the breakdown.
 */
export default function MonthlyPnlChart({ data }: { data: MonthlyRealized[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const maxAbs = Math.max(1, ...data.map((d) => Math.abs(d.total)));
  const hasData = data.some((d) => d.total !== 0);
  const total = data.reduce((s, d) => s + d.total, 0);
  const H = 180; // plot height in px
  const half = H / 2;

  if (!hasData) {
    return <p className="px-5 py-12 text-center text-sm text-gray-500">No realised gains, losses or dividends in the last 12 months.</p>;
  }

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gray-500">{active ? monthLabel(active.month, "long") : "Trailing 12 months"}</p>
          <p className={cn("num text-xl font-semibold", (active?.total ?? total) >= 0 ? "text-gain" : "text-loss")}>
            {formatCurrency(active?.total ?? total, { signed: true })}
          </p>
          {active && (
            <p className="num mt-0.5 text-xs text-gray-500">
              Trading {formatCurrency(active.trading, { signed: true })} · Dividends {formatCurrency(active.dividends, { signed: true })}
            </p>
          )}
        </div>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-xs text-gray-500 underline-offset-4 hover:text-gray-400 hover:underline">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="text-right">Trading</th>
              <th className="text-right">Dividends</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{monthLabel(d.month, "long")}</td>
                <td className="num text-right">{formatCurrency(d.trading, { signed: true })}</td>
                <td className="num text-right">{formatCurrency(d.dividends, { signed: true })}</td>
                <td className={cn("num text-right", d.total > 0 ? "text-gain" : d.total < 0 ? "text-loss" : "")}>{formatCurrency(d.total, { signed: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div role="img" aria-label="Realised profit and loss by month">
          <div className="relative flex gap-[2px]" style={{ height: H }} onMouseLeave={() => setHover(null)}>
            {/* zero baseline */}
            <div className="pointer-events-none absolute inset-x-0 border-t border-gray-600" style={{ top: half }} />
            {data.map((d, i) => {
              const h = (Math.abs(d.total) / maxAbs) * (half - 6);
              const positive = d.total >= 0;
              return (
                <div
                  key={d.month}
                  className="relative flex-1 cursor-default"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  tabIndex={0}
                  aria-label={`${monthLabel(d.month, "long")}: ${formatCurrency(d.total, { signed: true })}`}
                >
                  {hover === i && <div className="absolute inset-0 rounded bg-gray-700/40" />}
                  {d.total !== 0 && (
                    <div
                      className={cn("absolute left-1/2 w-[min(70%,28px)] -translate-x-1/2", positive ? "rounded-t-[4px] bg-gain-fill" : "rounded-b-[4px] bg-loss-fill")}
                      style={positive ? { bottom: half, height: Math.max(2, h) } : { top: half, height: Math.max(2, h) }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-[2px]">
            {data.map((d, i) => (
              <span key={d.month} className={cn("flex-1 text-center text-[10px] text-gray-500", i % 2 === 1 && "max-sm:invisible")}>
                {monthLabel(d.month)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
