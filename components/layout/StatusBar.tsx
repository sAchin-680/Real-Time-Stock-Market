"use client";

import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { formatDuration, getMarketStatus, getNextSessionChange, type MarketStatus } from "@/lib/market-hours";
import { cn } from "@/lib/utils";

const DOT: Record<MarketStatus["session"], string> = {
  open: "bg-[var(--gain)]",
  pre: "bg-yellow-400",
  post: "bg-yellow-400",
  closed: "bg-gray-500",
};

/** Bottom status bar: session, countdown to the next open/close, exchange clock. */
export default function StatusBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <footer className="h-7 border-t border-gray-600/50 bg-gray-900" />;

  const status = getMarketStatus(now);
  const next = getNextSessionChange(now);
  const nyTime = now.toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit" });

  return (
    <footer className="sticky bottom-0 z-30 flex h-7 items-center gap-4 border-t border-gray-600/50 bg-gray-900/95 px-4 text-[11px] text-gray-500 backdrop-blur md:px-8">
      <span className="inline-flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", DOT[status.session])} />
        <span className="text-gray-400">{status.label}</span>
      </span>
      <span className="num">
        {next.label} in {formatDuration(next.ms)}
      </span>
      <span className="num hidden sm:inline">NYSE {nyTime} ET</span>
      <span className="ml-auto hidden items-center gap-1 md:inline-flex">
        <Keyboard className="size-3" /> Press <kbd className="num rounded border border-gray-600 px-1 text-gray-400">?</kbd> for shortcuts
      </span>
    </footer>
  );
}
