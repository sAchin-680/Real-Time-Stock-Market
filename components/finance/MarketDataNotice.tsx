import { Info } from "lucide-react";

export default function MarketDataNotice() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-gray-400">
      <Info className="mt-0.5 size-4 shrink-0 text-gray-100" />
      <p>
        Live market data is not configured, so positions are valued at cost. Set <code className="num text-gray-100">FINNHUB_API_KEY</code> to enable
        real-time quotes, fundamentals and news.
      </p>
    </div>
  );
}
