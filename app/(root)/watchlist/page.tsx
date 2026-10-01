import type { Metadata } from "next";
import { getWatchlist } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/services/news";
import { PageHeader, Panel } from "@/components/finance/primitives";
import NewsGrid from "@/components/finance/NewsGrid";
import WatchlistTable from "@/components/finance/WatchlistTable";
import AlertFormDialog from "@/components/finance/AlertFormDialog";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const rows = await getWatchlist();
  const news = await getNews(rows.map((r) => r.symbol));

  return (
    <div className="space-y-3">
      <PageHeader
        code="WL"
        title="Watchlist"
        description={<>{rows.length} {rows.length === 1 ? "security" : "securities"} · live quotes, valuation and 52-week position · <kbd className="num rounded border border-gray-600 px-1">⌘K</kbd> to add</>}
        actions={<AlertFormDialog />}
      />

      <Panel title="Monitor" code="MON">
        <WatchlistTable rows={rows} />
      </Panel>

      <Panel title={rows.length ? "News for your watchlist" : "Market news"} code="NEWS">
        <NewsGrid articles={news} />
      </Panel>
    </div>
  );
}
