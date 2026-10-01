"use client";

import { useEffect, useState } from "react";
import { formatDuration, getMarketStatus, getNextSessionChange, type MarketStatus } from "@/lib/market-hours";
import { cn } from "@/lib/utils";

const DOT: Record<MarketStatus["session"], string> = {
  open: "bg-gain",
  pre: "bg-amber",
  post: "bg-amber",
  closed: "bg-gray-500",
};

const KEYS: [string, string][] = [
  ["/", "Command"],
  ["T", "Trade"],
  ["G P", "Portfolio"],
  ["G W", "Watchlist"],
  ["?", "Help"],
];

/** Bottom status bar: session, countdown, function-key legend. */
export default function StatusBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <footer className="hidden h-7 border-t border-gray-600 bg-gray-950 lg:block" />;

  const status = getMarketStatus(now);
  const next = getNextSessionChange(now);

  return (
    <footer className="sticky bottom-0 z-30 hidden h-7 items-center gap-4 border-t border-gray-600 bg-gray-950/95 px-4 text-[11px] text-gray-500 backdrop-blur lg:flex">
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", DOT[status.session])} />
        <span className="font-semibold uppercase tracking-wider text-gray-400">{status.label}</span>
      </span>
      <span className="num">
        {next.label} in <span className="text-gray-400">{formatDuration(next.ms)}</span>
      </span>
      <span className="ml-auto flex items-center gap-3">
        {KEYS.map(([k, label]) => (
          <span key={label} className="inline-flex items-center gap-1">
            <kbd className="num rounded-sm bg-gray-700 px-1 text-[10px] font-semibold text-gray-100">{k}</kbd>
            {label}
          </span>
        ))}
      </span>
    </footer>
  );
}
