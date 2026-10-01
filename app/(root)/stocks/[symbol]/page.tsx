import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, ExternalLink } from "lucide-react";
import TradingViewWidget from "@/components/TradingViewWidget";
import WatchlistButton from "@/components/WatchlistButton";
import AlertFormDialog from "@/components/finance/AlertFormDialog";
import StockHeader from "@/components/finance/StockHeader";
import TradeDialog from "@/components/finance/TradeDialog";
import { Badge, Delta, Panel, RangeBar } from "@/components/finance/primitives";
import { Button } from "@/components/ui/button";
import { getStockOverview } from "@/lib/actions/stock.actions";
import { describeAlert } from "@/lib/finance/alerts";
import { formatCurrency, formatMarketCapMillions, formatNumber, formatPercent, formatQuantity } from "@/lib/format";
import { CANDLE_CHART_WIDGET_CONFIG, COMPANY_FINANCIALS_WIDGET_CONFIG, TECHNICAL_ANALYSIS_WIDGET_CONFIG } from "@/lib/constants";
import { symbolSchema } from "@/lib/validation";

const scriptUrl = `https://s3.tradingview.com/external-embedding/embed-widget-`;

export async function generateMetadata({ params }: StockDetailsPageProps): Promise<Metadata> {
  const { symbol } = await params;
  return { title: decodeURIComponent(symbol).toUpperCase() };
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="num text-right text-gray-100">{value}</dd>
    </div>
  );
}

export default async function StockDetails({ params }: StockDetailsPageProps) {
  const { symbol: raw } = await params;
  if (!symbolSchema.safeParse(decodeURIComponent(raw)).success) notFound();

  const stock = await getStockOverview(raw);
  const { symbol, metrics: m, quote, position } = stock;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <StockHeader stock={stock} />
        <div className="flex flex-wrap gap-2">
          <WatchlistButton symbol={symbol} company={stock.name} isInWatchlist={stock.inWatchlist} />
          <AlertFormDialog symbol={symbol} company={stock.name} currentPrice={quote?.price} trigger={<Button variant="outline" className="h-10"><Bell /> Alert</Button>} />
          <TradeDialog symbol={symbol} defaultPrice={quote?.price} />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <Panel bodyClassName="p-2">
            <TradingViewWidget scriptUrl={`${scriptUrl}advanced-chart.js`} config={CANDLE_CHART_WIDGET_CONFIG(symbol)} className="custom-chart" height={560} />
          </Panel>
          <Panel title="Financials" code="FA" bodyClassName="p-2">
            <TradingViewWidget scriptUrl={`${scriptUrl}financials.js`} config={COMPANY_FINANCIALS_WIDGET_CONFIG(symbol)} height={464} />
          </Panel>
        </div>

        <div className="space-y-3">
          {position && (
            <Panel title="Your position" code="POS" action={<Link href="/portfolio" className="text-xs font-medium text-gray-400 hover:text-gray-100">Portfolio →</Link>}>
              <dl className="divide-y divide-gray-600/50 px-4 md:px-5">
                <Stat label="Shares" value={formatQuantity(position.quantity)} />
                <Stat label="Average cost" value={formatCurrency(position.avgCost)} />
                <Stat label="Market value" value={formatCurrency(position.marketValue)} />
                <Stat label="Unrealized P&L" value={<Delta value={position.unrealizedPnl} percent={position.unrealizedPercent} className="justify-end" />} />
                {position.realizedPnl !== 0 && <Stat label="Realized P&L" value={<Delta value={position.realizedPnl} showIcon={false} className="justify-end" />} />}
              </dl>
            </Panel>
          )}

          <Panel title="Key statistics" code="DES">
            <dl className="divide-y divide-gray-600/50 px-4 md:px-5">
              <Stat label="Market cap" value={formatMarketCapMillions(stock.marketCap)} />
              <Stat label="P/E (TTM)" value={m.peTTM ? formatNumber(m.peTTM, 1) : "—"} />
              <Stat label="EPS (TTM)" value={formatCurrency(m.epsTTM)} />
              <Stat label="Beta" value={m.beta ? formatNumber(m.beta, 2) : "—"} />
              <Stat label="Dividend yield" value={m.dividendYield ? formatPercent(m.dividendYield, { signed: false }) : "—"} />
              <Stat label="52W return" value={m.week52Return !== undefined ? <Delta kind="percent" percent={m.week52Return} className="justify-end" /> : "—"} />
              <Stat label="Net margin" value={m.netMargin !== undefined ? formatPercent(m.netMargin, { signed: false }) : "—"} />
              <Stat label="ROE (TTM)" value={m.roe !== undefined ? formatPercent(m.roe, { signed: false }) : "—"} />
              <Stat label="Avg volume (10D)" value={m.avgVolume10D ? `${formatNumber(m.avgVolume10D, 2)}M` : "—"} />
              <div className="py-3">
                <dt className="mb-2 text-sm text-gray-500">52-week range</dt>
                <dd><RangeBar low={m.week52Low} high={m.week52High} value={quote?.price} /></dd>
              </div>
            </dl>
          </Panel>

          <Panel title={`Alerts (${stock.alerts.length})`} code="ALRT" action={<Link href="/alerts" className="text-xs font-medium text-gray-400 hover:text-gray-100">Manage →</Link>}>
            {stock.alerts.length ? (
              <ul className="divide-y divide-gray-600/50">
                {stock.alerts.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm md:px-5">
                    <div className="min-w-0">
                      <p className="truncate text-gray-100">{a.name}</p>
                      <p className="num text-xs text-gray-400">{describeAlert(a.condition, a.threshold)}</p>
                    </div>
                    <Badge tone={a.active ? "gain" : "neutral"}>{a.active ? "Active" : "Paused"}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-sm text-gray-500">No alerts for {symbol}.</p>
            )}
          </Panel>

          <Panel title="Technicals" code="TECH" bodyClassName="p-2">
            <TradingViewWidget scriptUrl={`${scriptUrl}technical-analysis.js`} config={TECHNICAL_ANALYSIS_WIDGET_CONFIG(symbol)} height={400} />
          </Panel>

          {stock.weburl && (
            <a href={stock.weburl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-100">
              Company website <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
