import { Info } from "lucide-react";

export default function MarketDataNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 text-sm text-gray-400">
      <Info className="mt-0.5 size-4 shrink-0 text-yellow-400" />
      <p>
        Live market data is not configured, so positions are valued at cost. Set <code className="num text-yellow-400">FINNHUB_API_KEY</code> to enable
        real-time quotes, fundamentals and news.
      </p>
    </div>
  );
}
