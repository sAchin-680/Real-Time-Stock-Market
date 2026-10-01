"use client";

import type { Holding, PortfolioTotals } from "@/lib/finance/portfolio";
import { usePortfolioLive } from "@/hooks/usePortfolioLive";
import { Panel } from "@/components/finance/primitives";
import { HoldingsTable, KpiStrip, ViewAllLink } from "@/components/finance/PortfolioLive";
import Contributors from "@/components/finance/Contributors";
import HoldingsHeatmap from "@/components/finance/HoldingsHeatmap";
import SessionValueChart from "@/components/finance/SessionValueChart";

/** Live portfolio workspace: one data source drives KPIs, chart, heatmap, positions and attribution. */
export default function DashboardWorkspace({ holdings: initialHoldings, totals: initialTotals }: { holdings: Holding[]; totals: PortfolioTotals }) {
  const { holdings, totals, quotes, history, benchmark } = usePortfolioLive(initialHoldings, initialTotals);

  return (
    <div className="space-y-3">
      <KpiStrip totals={totals} benchmark={benchmark} />

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="min-h-0 xl:col-span-8">
          <SessionValueChart value={totals.marketValue} dayChange={totals.dayChange} height={196} />
        </div>
        <Panel title="Heatmap" code="HMAP" className="xl:col-span-4">
          <HoldingsHeatmap holdings={holdings} height={196} />
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <Panel title="Positions" code="POS" className="xl:col-span-8" action={<ViewAllLink href="/portfolio" />}>
          <HoldingsTable holdings={holdings} quotes={quotes} history={history} variant="compact" limit={8} />
        </Panel>
        <Panel title="Day P&L attribution" code="ATTR" className="xl:col-span-4">
          <Contributors holdings={holdings} limit={8} />
        </Panel>
      </div>
    </div>
  );
}
