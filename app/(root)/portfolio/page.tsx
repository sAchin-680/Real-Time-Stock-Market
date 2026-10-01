import type { Metadata } from "next";
import { Briefcase, Download } from "lucide-react";
import { getPortfolioSnapshot, listTransactions } from "@/lib/actions/portfolio.actions";
import { Button } from "@/components/ui/button";
import { EmptyState, Panel } from "@/components/finance/primitives";
import AllocationBars from "@/components/finance/AllocationBars";
import ImportCsvDialog from "@/components/finance/ImportCsvDialog";
import MonthlyPnlChart from "@/components/finance/MonthlyPnlChart";
import PortfolioLive from "@/components/finance/PortfolioLive";
import RiskPanel from "@/components/finance/RiskPanel";
import TradeDialog from "@/components/finance/TradeDialog";
import TransactionsTable from "@/components/finance/TransactionsTable";
import MarketDataNotice from "@/components/finance/MarketDataNotice";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioPage() {
  const [snapshot, transactions] = await Promise.all([getPortfolioSnapshot(), listTransactions()]);
  const hasPositions = snapshot.holdings.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-subtitle">Positions marked to market with FIFO cost basis, realized P&amp;L and risk.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {transactions.length > 0 && (
            <Button variant="outline" asChild>
              <a href="/api/portfolio/export" download>
                <Download /> Export
              </a>
            </Button>
          )}
          <ImportCsvDialog />
          <TradeDialog />
        </div>
      </div>

      {!snapshot.marketDataAvailable && <MarketDataNotice />}

      {hasPositions ? (
        <>
          <PortfolioLive holdings={snapshot.holdings} totals={snapshot.totals} />

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel title="Sector allocation">
              <AllocationBars slices={snapshot.sectorAllocation} />
            </Panel>
            <Panel title="Risk & concentration">
              <RiskPanel risk={snapshot.risk} />
            </Panel>
            <Panel title="Realized P&L by month">
              <MonthlyPnlChart data={snapshot.monthlyRealized} />
            </Panel>
          </div>
        </>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Briefcase className="size-5" />}
            title={transactions.length ? "No open positions" : "Start tracking your portfolio"}
            description={
              transactions.length
                ? "All positions are closed. Your realized history is below."
                : "Add your first trade or import your broker history to see live value, P&L, allocation and risk."
            }
            action={
              <>
                <ImportCsvDialog />
                <TradeDialog />
              </>
            }
          />
        </div>
      )}

      <Panel title={`Transactions (${transactions.length})`}>
        <TransactionsTable transactions={transactions} />
      </Panel>
    </div>
  );
}
