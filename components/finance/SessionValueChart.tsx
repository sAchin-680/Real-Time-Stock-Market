"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { getMarketStatus } from "@/lib/market-hours";
import { cn } from "@/lib/utils";
import LiveIndicator from "@/components/layout/LiveIndicator";

interface Point {
  t: number;
  v: number;
}

const MAX_POINTS = 720;
const storageKey = () => `signalist:session-value:${getMarketStatus().tradingDate}`;

/**
 * Portfolio value recorded live for this trading day (kept per browser in
 * sessionStorage). Baseline = value at the previous close, so the line reads as
 * today's P&L. Hover shows the value at any moment.
 */
export default function SessionValueChart({ value, dayChange, height = 140 }: { value: number; dayChange: number; height?: number }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const baseline = value - dayChange;

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey()) || "[]") as Point[];
      if (Array.isArray(saved)) setPoints(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!(value > 0)) return;
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      const now = Date.now();
      if (last && Math.abs(last.v - value) < 0.005 && now - last.t < 30_000) return prev;
      const next = [...prev, { t: now, v: value }].slice(-MAX_POINTS);
      try {
        sessionStorage.setItem(storageKey(), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [value]);

  const W = 1000;
  const H = height;
  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const vs = points.map((p) => p.v);
    const min = Math.min(...vs, baseline);
    const max = Math.max(...vs, baseline);
    const span = max - min || 1;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const x = (t: number) => ((t - t0) / (t1 - t0 || 1)) * W;
    const y = (v: number) => 8 + (1 - (v - min) / span) * (H - 16);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
    return { line, area: `${line}L${W},${H}L0,${H}Z`, baseY: y(baseline), x, y };
  }, [points, baseline, H]);

  const up = value >= baseline;
  const color = up ? "var(--gain-fill)" : "var(--loss-fill)";
  const active = hover !== null ? points[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geo || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const t = points[0].t + ratio * (points[points.length - 1].t - points[0].t);
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].t - t) < Math.abs(points[best].t - t)) best = i;
    setHover(best);
  };

  const shown = active?.v ?? value;
  const pnl = shown - baseline;

  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      <header className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div>
          <p className="panel-title">Intraday value</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <span className="num text-xl font-semibold text-gray-100">{formatCurrency(shown)}</span>
            <span className={cn("num text-[13px]", pnl > 0.004 ? "text-gain" : pnl < -0.004 ? "text-loss" : "text-gray-500")}>
              {formatCurrency(pnl, { signed: true })} today
            </span>
            {active && <span className="num text-xs text-gray-500">{new Date(active.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>}
          </div>
        </div>
        <LiveIndicator />
      </header>
      <div className="relative mt-2 flex-1" style={{ minHeight: geo ? H : 64 }}>
        {geo ? (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="h-full w-full touch-none"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            role="img"
            aria-label={`Portfolio value today, currently ${formatCurrency(value)}`}
          >
            <defs>
              <linearGradient id="session-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" x2={W} y1={geo.baseY} y2={geo.baseY} stroke="var(--color-gray-600)" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
            <path d={geo.area} fill="url(#session-fill)" />
            <path d={geo.line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            {active && (
              <>
                <line x1={geo.x(active.t)} x2={geo.x(active.t)} y1="0" y2={H} stroke="var(--color-gray-500)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
        ) : null}
        {geo && active && (
          <span
            aria-hidden
            className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-800"
            style={{ left: `${(geo.x(active.t) / W) * 100}%`, top: `${(geo.y(active.v) / H) * 100}%`, background: color }}
          />
        )}
        {!geo && (
          <div className="flex h-full items-center justify-center gap-2 border-t border-dashed border-gray-600/70 text-[12px] text-gray-500">
            <span className="size-1.5 animate-pulse rounded-full bg-gray-500" /> Recording intraday value — the line draws as prices tick.
          </div>
        )}
      </div>
    </section>
  );
}
