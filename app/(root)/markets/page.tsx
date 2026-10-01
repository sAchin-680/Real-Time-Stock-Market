import type { Metadata } from "next";
import TradingViewWidget from "@/components/TradingViewWidget";
import { PageHeader, Panel } from "@/components/finance/primitives";
import { HEATMAP_WIDGET_CONFIG, MARKET_DATA_WIDGET_CONFIG, MARKET_OVERVIEW_WIDGET_CONFIG, TOP_STORIES_WIDGET_CONFIG } from "@/lib/constants";

export const metadata: Metadata = { title: "Markets" };

const scriptUrl = "https://s3.tradingview.com/external-embedding/embed-widget-";

export default function MarketsPage() {
  return (
    <div className="space-y-3">
      <PageHeader code="MKT" title="Markets" description="Cross-asset overview · S&P 500 sector heatmap · quotes · top stories" />

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Market overview" code="OVR" bodyClassName="p-2">
          <TradingViewWidget scriptUrl={`${scriptUrl}market-overview.js`} config={MARKET_OVERVIEW_WIDGET_CONFIG} height={600} />
        </Panel>
        <Panel title="S&P 500 heatmap" code="HMAP" className="xl:col-span-2" bodyClassName="p-2">
          <TradingViewWidget scriptUrl={`${scriptUrl}stock-heatmap.js`} config={HEATMAP_WIDGET_CONFIG} height={600} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Top stories" code="TOP" bodyClassName="p-2">
          <TradingViewWidget scriptUrl={`${scriptUrl}timeline.js`} config={TOP_STORIES_WIDGET_CONFIG} height={600} />
        </Panel>
        <Panel title="Quotes" code="QT" className="xl:col-span-2" bodyClassName="p-2">
          <TradingViewWidget scriptUrl={`${scriptUrl}market-quotes.js`} config={MARKET_DATA_WIDGET_CONFIG} height={600} />
        </Panel>
      </div>
    </div>
  );
}
