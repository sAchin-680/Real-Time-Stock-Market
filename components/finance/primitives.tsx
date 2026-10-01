import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, trendOf } from "@/lib/format";

export function Panel({
  title,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      {(title || action) && (
        <header className="panel-header">
          {title ? <h2 className="panel-title">{title}</h2> : <span />}
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/** Signed change with an arrow so direction never relies on colour alone. */
export function Delta({
  value,
  percent,
  kind = "currency",
  className,
  showIcon = true,
}: {
  value?: number | null;
  percent?: number | null;
  kind?: "currency" | "percent";
  className?: string;
  showIcon?: boolean;
}) {
  const basis = kind === "percent" ? percent : value ?? percent;
  const trend = trendOf(basis);
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const primary = kind === "percent" ? formatPercent(percent) : formatCurrency(value, { signed: true });
  const secondary = kind === "currency" && percent !== undefined && percent !== null ? formatPercent(percent) : null;

  return (
    <span
      className={cn(
        "num inline-flex items-center gap-1",
        trend === "up" && "text-gain",
        trend === "down" && "text-loss",
        trend === "flat" && "text-gray-500",
        className
      )}
    >
      {showIcon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      <span>{primary}</span>
      {secondary && <span className="opacity-80">({secondary})</span>}
    </span>
  );
}

export function StockLogo({ symbol, logo, size = 32 }: { symbol: string; logo?: string; size?: number }) {
  if (logo) {
    return (
      <Image
        src={logo}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-md bg-white object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="num flex shrink-0 items-center justify-center rounded-md bg-gray-700 text-[10px] font-semibold text-gray-400"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

export function SymbolCell({ symbol, name, logo }: { symbol: string; name?: string; logo?: string }) {
  return (
    <Link href={`/stocks/${encodeURIComponent(symbol)}`} className="group flex min-w-0 items-center gap-3">
      <StockLogo symbol={symbol} logo={logo} />
      <span className="min-w-0">
        <span className="block font-semibold text-gray-100 group-hover:text-yellow-400">{symbol}</span>
        {name && <span className="block max-w-[180px] truncate text-xs text-gray-500">{name}</span>}
      </span>
    </Link>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="panel flex flex-col gap-2 p-4 md:p-5">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-gray-500">
        <span>{label}</span>
        {icon}
      </div>
      <div className="num text-2xl font-semibold text-gray-100 md:text-[28px]">{value}</div>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {delta}
          {hint && <span className="text-gray-500">{hint}</span>}
        </div>
      )}
    </div>
  );
}

/** Horizontal share bar (0–1) used for portfolio weights. */
export function WeightBar({ weight, className }: { weight: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, weight)) * 100;
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-viz-track" aria-hidden>
        <div className="h-full rounded-full bg-viz-bar" style={{ width: `${pct}%` }} />
      </div>
      <span className="num w-12 text-right text-gray-400">{pct.toFixed(1)}%</span>
    </div>
  );
}

/** Where the current price sits within its 52-week range. */
export function RangeBar({ low, high, value }: { low?: number; high?: number; value?: number }) {
  if (!low || !high || !value || high <= low) return <span className="text-gray-500">—</span>;
  const pos = Math.max(0, Math.min(1, (value - low) / (high - low))) * 100;
  return (
    <div className="flex items-center gap-2" title={`52W range ${formatCurrency(low)} – ${formatCurrency(high)}`}>
      <span className="num text-xs text-gray-500">{formatCurrency(low, { compact: true })}</span>
      <div className="relative h-1.5 w-20 rounded-full bg-viz-track">
        <span
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-800 bg-yellow-400"
          style={{ left: `${pos}%` }}
        />
      </div>
      <span className="num text-xs text-gray-500">{formatCurrency(high, { compact: true })}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="flex size-12 items-center justify-center rounded-full bg-gray-700 text-yellow-400">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
      {description && <p className="max-w-md text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "gain" | "loss" | "warn" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-gray-700 text-gray-400",
        tone === "gain" && "bg-[color-mix(in_srgb,var(--gain)_14%,transparent)] text-gain",
        tone === "loss" && "bg-[color-mix(in_srgb,var(--loss)_14%,transparent)] text-loss",
        tone === "warn" && "bg-yellow-500/15 text-yellow-400",
        tone === "info" && "bg-blue-600/15 text-[#8b93ff]",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-gray-700/60", className)} />;
}
