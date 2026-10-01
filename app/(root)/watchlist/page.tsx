import type { Metadata } from "next";
import { getWatchlist } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/services/news";
import { Panel } from "@/components/finance/primitives";
import NewsGrid from "@/components/finance/NewsGrid";
import WatchlistTable from "@/components/finance/WatchlistTable";
import AlertFormDialog from "@/components/finance/AlertFormDialog";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const rows = await getWatchlist();
  const news = await getNews(rows.map((r) => r.symbol));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Watchlist</h1>
          <p className="page-subtitle">
            {rows.length} {rows.length === 1 ? "stock" : "stocks"} you&apos;re tracking · press <kbd className="num rounded border border-gray-600 px-1">⌘K</kbd> to add more
          </p>
        </div>
        <AlertFormDialog />
      </div>

      <Panel title="Watching">
        <WatchlistTable rows={rows} />
      </Panel>

      <Panel title={rows.length ? "News for your watchlist" : "Market news"}>
        <NewsGrid articles={news} />
      </Panel>
    </div>
  );
}
