"use client";

import { useEffect, useState } from "react";
import { getMarketStatus, type MarketStatus } from "@/lib/market-hours";
import { cn } from "@/lib/utils";

const ZONES = [
  { label: "NY", tz: "America/New_York" },
  { label: "LDN", tz: "Europe/London" },
  { label: "TYO", tz: "Asia/Tokyo" },
];

const DOT: Record<MarketStatus["session"], string> = {
  open: "bg-gain",
  pre: "bg-amber",
  post: "bg-amber",
  closed: "bg-gray-500",
};

/** World clocks with the US session state, like a trading desk wall. */
export default function ExchangeClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;
  const session = getMarketStatus(now).session;

  return (
    <div className={cn("items-center gap-3 border-l border-gray-600 pl-3 text-[11px]", className)}>
      {ZONES.map((z, i) => (
        <span key={z.label} className="inline-flex items-center gap-1.5" title={z.tz}>
          {i === 0 && <span className={cn("size-1.5 rounded-full", DOT[session])} />}
          <span className="font-semibold text-gray-500">{z.label}</span>
          <span className="num text-gray-400">{now.toLocaleTimeString("en-GB", { timeZone: z.tz, hour: "2-digit", minute: "2-digit" })}</span>
        </span>
      ))}
    </div>
  );
}
