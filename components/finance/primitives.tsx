import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, trendOf } from "@/lib/format";

export function Panel({
  title,
  code,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  /** Terminal mnemonic shown before the title, e.g. "PORT". */
  code?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("panel flex flex-col overflow-hidden", className)}>
      {(title || action) && (
        <header className="panel-header">
          {title ? (
            <h2 className="panel-title">
              {code && <span className="num rounded-sm bg-gray-700 px-1 py-px text-[10px] text-gray-400">{code}</span>}
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      )}
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Page title row: mnemonic, title, description, actions. */
export function PageHeader({
  code,
  title,
  description,
  actions,
}: {
  code: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="num rounded-sm border border-gray-600 bg-gray-700 px-1.5 py-px text-[11px] font-semibold text-gray-400">{code}</span>
          <h1 className="page-title truncate">{title}</h1>
        </div>
        {description && <p className="page-subtitle">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
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
        className="shrink-0 rounded bg-white object-contain p-0.5"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="num flex shrink-0 items-center justify-center rounded border border-gray-600 bg-gray-700 text-[9px] font-semibold text-gray-400"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 4)}
    </span>
  );
}

export function SymbolCell({ symbol, name, logo }: { symbol: string; name?: string; logo?: string }) {
  return (
    <Link href={`/stocks/${encodeURIComponent(symbol)}`} className="group flex min-w-0 items-center gap-2.5">
      <StockLogo symbol={symbol} logo={logo} size={26} />
      <span className="min-w-0 leading-tight">
        <span className="num block font-semibold text-gray-100 group-hover:text-white">{symbol}</span>
        {name && name !== symbol && <span className="block max-w-[170px] truncate text-[11px] text-gray-500">{name}</span>}
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
  tone,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** Accent strip on the left edge. */
  tone?: "gain" | "loss" | "amber";
}) {
  return (
    <div className="panel relative flex flex-col gap-1.5 overflow-hidden px-4 py-3.5">
      {tone && (
        <span
          aria-hidden
          className={cn("absolute inset-y-0 left-0 w-0.5", tone === "gain" && "bg-gain", tone === "loss" && "bg-loss", tone === "amber" && "bg-gray-100")}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {icon}
      </div>
      <div className="num truncate text-xl font-semibold text-gray-100 md:text-2xl">{value}</div>
      {(delta || hint) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
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
          className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gray-800 bg-amber"
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
      {icon && <div className="flex size-11 items-center justify-center rounded-md border border-gray-600 bg-gray-700 text-gray-400">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-100">{title}</h3>
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
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide",
        tone === "neutral" && "bg-gray-700 text-gray-400",
        tone === "gain" && "bg-[color-mix(in_srgb,var(--gain)_14%,transparent)] text-gain",
        tone === "loss" && "bg-[color-mix(in_srgb,var(--loss)_14%,transparent)] text-loss",
        tone === "warn" && "bg-amber/15 text-amber",
        tone === "info" && "bg-cyan/10 text-cyan",
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
