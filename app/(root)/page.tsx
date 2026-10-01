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
import { Delta, EmptyState, PageHeader, Panel, SymbolCell } from "@/components/finance/primitives";
import AllocationBars from "@/components/finance/AllocationBars";
import DashboardWorkspace from "@/components/finance/DashboardWorkspace";
import MarketDataNotice from "@/components/finance/MarketDataNotice";
import NewsGrid from "@/components/finance/NewsGrid";
import TradeDialog from "@/components/finance/TradeDialog";
import ImportCsvDialog from "@/components/finance/ImportCsvDialog";
import { ViewAllLink } from "@/components/finance/PortfolioLive";

const greeting = () => {
  const h = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/New_York" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

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
    .slice(0, 6);

  const date = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "America/New_York" });

  return (
    <div className="space-y-3">
      <PageHeader
        code="DASH"
        title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "trader"}`}
        description={`${date} · ${market.label}`}
        actions={<TradeDialog />}
      />

      {!snapshot.marketDataAvailable && <MarketDataNotice />}

      {snapshot.holdings.length ? (
        <DashboardWorkspace holdings={snapshot.holdings} totals={snapshot.totals} />
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Briefcase className="size-5" />}
            title="Build your portfolio"
            description="Record trades or import your broker history to stream live value, P&L, allocation and risk."
            action={
              <>
                <ImportCsvDialog />
                <TradeDialog />
              </>
            }
          />
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Sector exposure" code="SECT" action={<ViewAllLink href="/portfolio" />}>
          <AllocationBars slices={snapshot.sectorAllocation} max={6} />
        </Panel>

        <Panel title="Watchlist movers" code="MOV" action={<ViewAllLink href="/watchlist" />}>
          {movers.length ? (
            <ul className="divide-y divide-gray-600/60">
              {movers.map((m) => (
                <li key={m.symbol} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <SymbolCell symbol={m.symbol} name={m.company} logo={m.logo} />
                  <div className="text-right leading-tight">
                    <div className="num text-[13px] text-gray-100">{formatCurrency(m.price)}</div>
                    <Delta kind="percent" percent={m.changePercent} className="text-[11px]" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-[13px] text-gray-500">
              {watchlist.length ? "Waiting for prices." : "Add symbols with ⌘K to track their moves."}
            </p>
          )}
        </Panel>

        <Panel title="Alerts near trigger" code="ALRT" action={<ViewAllLink href="/alerts" />}>
          {upcoming.length ? (
            <ul className="divide-y divide-gray-600/60">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0 leading-tight">
                    <Link href={`/stocks/${a.symbol}`} className="num text-[13px] font-semibold text-gray-100 hover:text-white">{a.symbol}</Link>
                    <p className="num truncate text-[11px] text-gray-500">{describeAlert(a.condition, a.threshold)}</p>
                  </div>
                  <div className="text-right leading-tight">
                    <div className="num text-[13px] text-gray-100">{formatCurrency(a.currentPrice)}</div>
                    <span className="num text-[11px] text-gray-500">{a.distance === null ? "day move" : `${formatPercent(a.distance)} away`}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13px] text-gray-500">
              <Bell className="size-5" />
              No active alerts.
            </div>
          )}
        </Panel>
      </div>

      <Panel title="News" code="NEWS">
        <NewsGrid articles={news} />
      </Panel>
    </div>
  );
}
