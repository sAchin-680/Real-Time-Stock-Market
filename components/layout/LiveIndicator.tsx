"use client";

import { useEffect, useState } from "react";
import { useStreamStatus } from "@/hooks/useLiveQuotes";
import { cn } from "@/lib/utils";

const LABEL = {
  idle: "Connecting",
  connecting: "Connecting",
  live: "Live",
  polling: "Delayed",
  offline: "Offline",
} as const;

/** Streaming connection state with "last tick" age. */
export default function LiveIndicator({ className }: { className?: string }) {
  const { status, lastUpdate } = useStreamStatus();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const age = lastUpdate ? Math.max(0, Math.round((Date.now() - lastUpdate) / 1000)) : null;
  const tone =
    status === "live" ? "text-gain" : status === "polling" || status === "connecting" || status === "idle" ? "text-amber" : "text-gray-500";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider", tone, className)}
      title={status === "live" ? "Streaming trades in real time" : status === "polling" ? "Live stream unavailable; refreshing periodically" : undefined}
    >
      <span className="relative flex size-2">
        {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {LABEL[status]}
      {age !== null && status !== "idle" && <span className="num font-normal normal-case tracking-normal text-gray-500">{age < 2 ? "now" : `${age}s`}</span>}
    </span>
  );
}
