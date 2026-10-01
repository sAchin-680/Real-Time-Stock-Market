"use client";

import { useId, useMemo } from "react";
import type { TickPoint } from "@/lib/client/market-store";

/**
 * Tiny live line chart. Colour reflects direction versus `baseline`
 * (previous close when known, otherwise the first point in the window).
 */
export default function Sparkline({
  points,
  baseline,
  width = 96,
  height = 28,
  className,
  area = true,
}: {
  points?: TickPoint[];
  baseline?: number;
  width?: number;
  height?: number;
  className?: string;
  area?: boolean;
}) {
  const id = useId();
  const path = useMemo(() => {
    if (!points || points.length < 2) return null;
    const ps = points.map((p) => p.p);
    const base = baseline && baseline > 0 ? baseline : ps[0];
    const min = Math.min(...ps, base);
    const max = Math.max(...ps, base);
    const span = max - min || 1;
    const pad = 2;
    const x = (i: number) => (i / (points.length - 1)) * width;
    const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
    const line = ps.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    return {
      line,
      area: `${line}L${width},${height}L0,${height}Z`,
      baseY: y(base),
      up: ps[ps.length - 1] >= base,
      last: { x: x(ps.length - 1), y: y(ps[ps.length - 1]) },
    };
  }, [points, baseline, width, height]);

  if (!path) {
    return <svg width={width} height={height} className={className} aria-hidden><line x1="0" x2={width} y1={height / 2} y2={height / 2} stroke="var(--viz-track)" strokeDasharray="2 3" /></svg>;
  }

  const color = path.up ? "var(--gain-fill)" : "var(--loss-fill)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={width} y1={path.baseY} y2={path.baseY} stroke="var(--color-gray-600)" strokeDasharray="2 3" strokeWidth="1" />
      {area && <path d={path.area} fill={`url(#${id})`} />}
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={path.last.x} cy={path.last.y} r="2" fill={color} />
    </svg>
  );
}
