"use client";

import type { Holding } from "@/lib/finance/portfolio";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StockLogo } from "@/components/finance/primitives";

/** Positions ranked by their dollar contribution to today's P&L (diverging bars from a centre axis). */
export default function Contributors({ holdings, limit = 6 }: { holdings: Holding[]; limit?: number }) {
  const ranked = [...holdings].filter((h) => Math.abs(h.dayChange) > 0.004).sort((a, b) => Math.abs(b.dayChange) - Math.abs(a.dayChange)).slice(0, limit);
  const max = Math.max(1, ...ranked.map((h) => Math.abs(h.dayChange)));

  if (!ranked.length) {
    return <p className="px-4 py-10 text-center text-[13px] text-gray-500">No price moves yet today.</p>;
  }

  return (
    <ul className="divide-y divide-gray-600/60">
      {ranked.map((h) => {
        const pct = (Math.abs(h.dayChange) / max) * 50;
        const up = h.dayChange > 0;
        return (
          <li key={h.symbol} className="grid grid-cols-[88px_1fr_88px] items-center gap-3 px-4 py-2.5" title={`${h.symbol}: ${formatCurrency(h.dayChange, { signed: true })} (${formatPercent(h.dayChangePercent)})`}>
            <span className="flex items-center gap-2">
              <StockLogo symbol={h.symbol} logo={h.logo} size={20} />
              <span className="num text-[13px] font-semibold text-gray-100">{h.symbol}</span>
            </span>
            <span className="relative h-1.5 rounded-full bg-viz-track" aria-hidden>
              <span className="absolute top-[-3px] bottom-[-3px] left-1/2 w-px bg-gray-600" />
              <span
                className={cn("absolute inset-y-0 rounded-full", up ? "bg-gain-fill" : "bg-loss-fill")}
                style={up ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
              />
            </span>
            <span className={cn("num text-right text-[13px]", up ? "text-gain" : "text-loss")}>{formatCurrency(h.dayChange, { signed: true })}</span>
          </li>
        );
      })}
    </ul>
  );
}
