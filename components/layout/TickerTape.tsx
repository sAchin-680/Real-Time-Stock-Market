"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatPercent, trendOf } from "@/lib/format";
import type { LiveQuote } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { LivePrice } from "@/components/finance/LivePrice";

export const INDEX_PROXIES: Record<string, string> = {
  SPY: "S&P 500",
  QQQ: "Nasdaq 100",
  DIA: "Dow 30",
  IWM: "Russell 2000",
  TLT: "20Y Treasury",
  GLD: "Gold",
};

/** 24/7 markets keep the tape moving when equities are closed. */
export const CRYPTO_PAIRS: Record<string, string> = {
  "BINANCE:BTCUSDT": "BTC",
  "BINANCE:ETHUSDT": "ETH",
  "BINANCE:SOLUSDT": "SOL",
};

const labelOf = (s: string) => CRYPTO_PAIRS[s] ?? s;

function Item({ symbol, quote, tick }: { symbol: string; quote?: LiveQuote; tick?: 1 | -1 | 0 }) {
  const trend = trendOf(quote?.changePercent);
  const Icon = trend === "down" ? ArrowDownRight : ArrowUpRight;
  const crypto = symbol in CRYPTO_PAIRS;
  const body = (
    <>
      <span className="font-semibold text-gray-400 group-hover:text-white">{labelOf(symbol)}</span>
      <LivePrice value={quote?.price} plain className={cn("text-gray-100", tick === 1 && "text-gain", tick === -1 && "text-loss")} />
      {quote && quote.prevClose > 0 && (
        <span className={cn("num inline-flex items-center", trend === "up" && "text-gain", trend === "down" && "text-loss", trend === "flat" && "text-gray-500")}>
          {trend !== "flat" && <Icon className="size-3" aria-hidden />}
          {formatPercent(quote.changePercent)}
        </span>
      )}
    </>
  );
  const cls = "group flex shrink-0 items-center gap-2 px-4 text-xs";
  return crypto ? (
    <span className={cls} title={`${labelOf(symbol)}/USDT · 24/7`}>{body}</span>
  ) : (
    <Link href={`/stocks/${symbol}`} className={cls} title={INDEX_PROXIES[symbol] ?? symbol}>{body}</Link>
  );
}

/** Scrolling quote strip. Pauses on hover; static and scrollable when reduced motion is preferred. */
export default function TickerTape({ symbols, initial }: { symbols: string[]; initial: Record<string, LiveQuote> }) {
  const { quotes, direction } = useLiveQuotes(symbols, initial);
  const items = useMemo(() => symbols.map((s) => <Item key={s} symbol={s} quote={quotes[s]} tick={direction[s]} />), [symbols, quotes, direction]);
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
