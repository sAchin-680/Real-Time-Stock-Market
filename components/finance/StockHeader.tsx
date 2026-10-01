"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import type { StockOverview } from "@/lib/types";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { LivePrice } from "@/components/finance/LivePrice";
import { Delta, StockLogo } from "@/components/finance/primitives";

export default function StockHeader({ stock }: { stock: StockOverview }) {
  const symbols = useMemo(() => [stock.symbol], [stock.symbol]);
  const { quotes, updatedAt } = useLiveQuotes(symbols);
  const q = quotes[stock.symbol] ?? stock.quote;

  return (
    <div className="flex items-start gap-4">
      <StockLogo symbol={stock.symbol} logo={stock.logo} size={52} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold text-gray-100 md:text-3xl">{stock.name}</h1>
          {(stock.name !== stock.symbol || stock.exchange) && (
            <span className="num text-sm text-gray-500">
              {stock.name !== stock.symbol ? stock.symbol : ""}
              {stock.exchange ? `${stock.name !== stock.symbol ? " · " : ""}${stock.exchange}` : ""}
            </span>
          )}
        </div>
        {stock.industry && <p className="mt-0.5 text-sm text-gray-500">{stock.industry}</p>}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <LivePrice value={q?.price} currency={stock.currency} className="text-3xl font-semibold text-gray-100" />
          {q && <Delta value={q.change} percent={q.changePercent} className="text-base" />}
          {q && (
            <span className="num text-xs text-gray-500">
              O {formatCurrency(q.open)} · H {formatCurrency(q.high)} · L {formatCurrency(q.low)} · Prev {formatCurrency(q.prevClose)}
            </span>
          )}
        </div>
        {updatedAt && <p className="mt-1 text-xs text-gray-500">Updated {updatedAt.toLocaleTimeString()}</p>}
      </div>
    </div>
  );
}
