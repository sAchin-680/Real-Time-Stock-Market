"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Holding } from "@/lib/finance/portfolio";
import { squarify } from "@/lib/finance/treemap";
import { formatCurrency, formatPercent } from "@/lib/format";

const CLAMP = 3; // ±3% saturates the colour scale

/** Diverging fill: neutral at 0, gain/loss fill growing with |move|. */
export const moveColor = (pct: number) => {
  if (Math.abs(pct) < 0.05) return "#1f1f23";
  const t = Math.min(1, Math.abs(pct) / CLAMP);
  const mix = Math.round(28 + t * 62);
  return `color-mix(in srgb, var(${pct > 0 ? "--gain-fill" : "--loss-fill"}) ${mix}%, #18181b)`;
};

/** Treemap of positions: area = portfolio weight, colour = today's move. */
export default function HoldingsHeatmap({ holdings, height = 260 }: { holdings: Holding[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(
    () => (width ? squarify(holdings.map((h) => ({ ...h, value: h.marketValue })), { x: 0, y: 0, w: width, h: height }) : []),
    [holdings, width, height]
  );

  return (
    <div className="p-3">
      <div ref={ref} className="relative w-full overflow-hidden rounded" style={{ height }} role="list" aria-label="Holdings heatmap">
        {tiles.map((t) => {
          const big = t.w > 70 && t.h > 44;
          return (
            <Link
              key={t.symbol}
              href={`/stocks/${t.symbol}`}
              role="listitem"
              title={`${t.symbol} · ${formatCurrency(t.marketValue)} · ${(t.weight * 100).toFixed(1)}% of portfolio · ${formatPercent(t.dayChangePercent)} today`}
              className="absolute flex flex-col items-center justify-center overflow-hidden text-center transition-[filter] hover:brightness-125"
              style={{ left: t.x, top: t.y, width: t.w, height: t.h, background: moveColor(t.dayChangePercent), boxShadow: "inset 0 0 0 1px var(--color-gray-800)" }}
            >
              {t.w > 34 && t.h > 22 && <span className="num text-[11px] font-semibold text-white/95">{t.symbol}</span>}
              {big && <span className="num text-[10px] text-white/75">{formatPercent(t.dayChangePercent)}</span>}
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-gray-500">
        <span>Size = weight · colour = today</span>
        <div className="flex items-center gap-1.5">
          <span className="num">-{CLAMP}%</span>
          <span
            className="h-1.5 w-28 rounded-full"
            style={{ background: `linear-gradient(to right, ${moveColor(-CLAMP)}, #1f1f23, ${moveColor(CLAMP)})` }}
            aria-hidden
          />
          <span className="num">+{CLAMP}%</span>
        </div>
      </div>
    </div>
  );
}
