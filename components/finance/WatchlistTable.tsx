"use client";

import { useMemo } from "react";
import { Bell, Star } from "lucide-react";
import { formatMarketCapMillions, formatNumber } from "@/lib/format";
import type { WatchlistRow } from "@/lib/types";
import { useLiveQuotes } from "@/hooks/useLiveQuotes";
import { LivePrice } from "@/components/finance/LivePrice";
import { Badge, Delta, EmptyState, RangeBar, SymbolCell } from "@/components/finance/primitives";
import AlertFormDialog from "@/components/finance/AlertFormDialog";
import WatchlistButton from "@/components/WatchlistButton";

export default function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  const symbols = useMemo(() => rows.map((r) => r.symbol), [rows]);
  const { quotes } = useLiveQuotes(symbols);

  if (!rows.length) {
    return (
      <EmptyState
        icon={<Star className="size-5" />}
        title="Your watchlist is empty"
        description="Press ⌘K to search for a stock and tap the star to start watching it."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Company</th>
            <th className="text-right">Price</th>
            <th className="text-right">Change</th>
            <th className="text-right">Market cap</th>
            <th className="text-right">P/E</th>
            <th>52-week range</th>
            <th>Alerts</th>
            <th className="w-24"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const q = quotes[r.symbol];
            const price = q?.price ?? r.price;
            return (
              <tr key={r.symbol}>
                <td>
                  <SymbolCell symbol={r.symbol} name={r.company} logo={r.logo} />
                </td>
                <td className="text-right">
                  <LivePrice value={price} />
                </td>
                <td className="text-right">
                  <Delta value={q?.change ?? r.change} percent={q?.changePercent ?? r.changePercent} className="justify-end" />
                </td>
                <td className="num text-right text-gray-400">{formatMarketCapMillions(r.marketCap)}</td>
                <td className="num text-right text-gray-400">{r.peRatio ? formatNumber(r.peRatio, 1) : "—"}</td>
                <td>
                  <RangeBar low={r.week52Low} high={r.week52High} value={price} />
                </td>
                <td>{r.activeAlerts ? <Badge tone="warn"><Bell className="size-3" /> {r.activeAlerts}</Badge> : <span className="text-gray-500">—</span>}</td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    <AlertFormDialog
                      symbol={r.symbol}
                      company={r.company}
                      currentPrice={price}
                      trigger={
                        <button type="button" aria-label={`Create alert for ${r.symbol}`} title="Create alert" className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-700 hover:text-yellow-400">
                          <Bell className="size-4" />
                        </button>
                      }
                    />
                    <WatchlistButton type="icon" symbol={r.symbol} company={r.company} isInWatchlist showTrashIcon />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-gray-600/50 px-5 py-2.5 text-xs text-gray-500">Prices refresh automatically during market hours. Fundamentals via Finnhub.</p>
    </div>
  );
}
