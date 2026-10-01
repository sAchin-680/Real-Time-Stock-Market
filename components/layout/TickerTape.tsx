"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent, trendOf } from "@/lib/format";
import type { LiveQuote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";

export const INDEX_PROXIES: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  DIA: "Dow 30",
  IWM: "Russell 2000",
  TLT: "20Y Treasury",
  GLD: "Gold",
};

function Item({ symbol, quote }: { symbol: string; quote?: LiveQuote }) {
  const trend = trendOf(quote?.changePercent);
  const Icon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  return (
    <Link href={`/stocks/${symbol}`} className="group flex shrink-0 items-center gap-2 px-4 text-xs" title={INDEX_PROXIES[symbol] ?? symbol}>
      <span className="font-semibold text-gray-400 group-hover:text-yellow-400">{INDEX_PROXIES[symbol] ? `${symbol}` : symbol}</span>
      <span className="num text-gray-100">{quote ? quote.price.toFixed(2) : "—"}</span>
      {quote && (
        <span className={cn("num inline-flex items-center", trend === "up" && "text-gain", trend === "down" && "text-loss", trend === "flat" && "text-gray-500")}>
          {trend !== "flat" && <Icon className="size-3" aria-hidden />}
          {formatPercent(quote.changePercent)}
        </span>
      )}
    </Link>
  );
}

/** Scrolling quote strip. Pauses on hover; static and scrollable when reduced motion is preferred. */
export default function TickerTape({ symbols, initial }: { symbols: string[]; initial: Record<string, LiveQuote> }) {
  const { quotes } = useLiveQuotes(symbols, initial);
  const items = useMemo(() => symbols.map((s) => <Item key={s} symbol={s} quote={quotes[s]} />), [symbols, quotes]);
  if (!symbols.length) return null;

  return (
    <div className="ticker relative flex h-9 items-center overflow-hidden border-b border-gray-600/50 bg-gray-900" aria-label="Market ticker">
      <div className="ticker-track flex w-max items-center divide-x divide-gray-600/50">
        {items}
        <div aria-hidden inert className="contents">{items}</div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-gray-900" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-900" />
    </div>
  );
}
