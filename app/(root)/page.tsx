import Link from "next/link";
import { Bell, Briefcase } from "lucide-react";
import { getPortfolioSnapshot } from "@/lib/actions/portfolio.actions";
import { getWatchlist } from "@/lib/actions/watchlist.actions";
import { listAlerts } from "@/lib/actions/alert.actions";
import { getSessionUser } from "@/lib/server/session";
import { getNews } from "@/lib/services/news";
import { describeAlert, distanceToTrigger } from "@/lib/finance/alerts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getMarketStatus } from "@/lib/market-hours";
import { Delta, EmptyState, Panel, SymbolCell } from "@/components/finance/primitives";
import AllocationBars from "@/components/finance/AllocationBars";
import MarketDataNotice from "@/components/finance/MarketDataNotice";
import NewsGrid from "@/components/finance/NewsGrid";
import PortfolioLive from "@/components/finance/PortfolioLive";
import TradeDialog from "@/components/finance/TradeDialog";
import ImportCsvDialog from "@/components/finance/ImportCsvDialog";
import TradingViewWidget from "@/components/TradingViewWidget";
import { HEATMAP_WIDGET_CONFIG } from "@/lib/constants";

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/New_York" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const ViewAll = ({ href }: { href: string }) => (
  <Link href={href} className="text-xs font-medium text-yellow-400 hover:text-yellow-500">View all →</Link>
);

export default async function Dashboard() {
  const [user, snapshot, watchlist, alerts] = await Promise.all([getSessionUser(), getPortfolioSnapshot(), getWatchlist(), listAlerts()]);
  const news = await getNews([...snapshot.holdings.map((h) => h.symbol), ...watchlist.map((w) => w.symbol)].slice(0, 8));
  const market = getMarketStatus();

  const movers = [...watchlist]
    .filter((w) => w.changePercent !== undefined)
    .sort((a, b) => Math.abs(b.changePercent!) - Math.abs(a.changePercent!))
    .slice(0, 6);

  const upcoming = alerts
    .filter((a) => a.active)
    .map((a) => ({ ...a, distance: a.currentPrice ? distanceToTrigger(a.condition, a.threshold, a.currentPrice) : null }))
    .sort((a, b) => Math.abs(a.distance ?? Infinity) - Math.abs(b.distance ?? Infinity))
    .slice(0, 5);

  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">
            {greeting()}, {user?.name?.split(" ")[0]}
          </h1>
          <p className="page-subtitle">
            {date} · {market.label}
          </p>
        </div>
        <TradeDialog />
      </div>

      {!snapshot.marketDataAvailable && <MarketDataNotice />}

      {snapshot.holdings.length ? (
        <PortfolioLive holdings={snapshot.holdings} totals={snapshot.totals} variant="compact" />
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Briefcase className="size-5" />}
            title="Build your portfolio"
            description="Add trades or import your broker history to see live value, P&L, allocation and risk."
            action={
              <>
                <ImportCsvDialog />
                <TradeDialog />
              </>
            }
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Allocation by sector" action={<ViewAll href="/portfolio" />}>
          <AllocationBars slices={snapshot.sectorAllocation} max={6} />
        </Panel>

        <Panel title="Watchlist movers" action={<ViewAll href="/watchlist" />}>
          {movers.length ? (
            <ul className="divide-y divide-gray-600/50">
              {movers.map((m) => (
                <li key={m.symbol} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <SymbolCell symbol={m.symbol} name={m.company} logo={m.logo} />
                  <div className="text-right">
                    <div className="num text-sm text-gray-100">{formatCurrency(m.price)}</div>
                    <Delta kind="percent" percent={m.changePercent} className="text-xs" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-10 text-center text-sm text-gray-500">
              {watchlist.length ? "Waiting for live prices." : "Star stocks with ⌘K to see their moves here."}
            </p>
          )}
        </Panel>

        <Panel title="Closest alerts" action={<ViewAll href="/alerts" />}>
          {upcoming.length ? (
            <ul className="divide-y divide-gray-600/50">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 md:px-5">
                  <div className="min-w-0">
                    <Link href={`/stocks/${a.symbol}`} className="num font-semibold text-gray-100 hover:text-yellow-400">{a.symbol}</Link>
                    <p className="num truncate text-xs text-yellow-400/90">{describeAlert(a.condition, a.threshold)}</p>
                  </div>
                  <div className="text-right text-xs">
                    <div className="num text-sm text-gray-100">{formatCurrency(a.currentPrice)}</div>
                    <span className="text-gray-500">{a.distance === null ? "daily move" : `${formatPercent(a.distance)} away`}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-5 py-10 text-center text-sm text-gray-500">
              <Bell className="size-5 text-gray-500" />
              No active alerts.
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Latest news">
        <NewsGrid articles={news} />
      </Panel>

      <Panel title="S&P 500 heatmap" bodyClassName="p-2">
        <TradingViewWidget scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js" config={HEATMAP_WIDGET_CONFIG} height={560} />
      </Panel>
    </div>
  );
}
