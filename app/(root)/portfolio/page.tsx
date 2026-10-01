import type { Metadata } from "next";
import { Briefcase, Download } from "lucide-react";
import { getPortfolioSnapshot, listTransactions } from "@/lib/actions/portfolio.actions";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Panel } from "@/components/finance/primitives";
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
    <div className="space-y-3">
      <PageHeader
        code="PORT"
        title="Portfolio"
        description="Positions marked to market tick by tick · FIFO cost basis · realized P&L · risk"
        actions={
          <>
            {transactions.length > 0 && (
              <Button variant="outline" asChild>
                <a href="/api/portfolio/export" download>
                  <Download /> Export
                </a>
              </Button>
            )}
            <ImportCsvDialog />
            <TradeDialog />
          </>
        }
      />

      {!snapshot.marketDataAvailable && <MarketDataNotice />}

      {hasPositions ? (
        <>
          <PortfolioLive holdings={snapshot.holdings} totals={snapshot.totals} />

          <div className="grid gap-3 xl:grid-cols-3">
            <Panel title="Sector allocation" code="SECT">
              <AllocationBars slices={snapshot.sectorAllocation} />
            </Panel>
            <Panel title="Risk & concentration" code="RISK">
              <RiskPanel risk={snapshot.risk} />
            </Panel>
            <Panel title="Realized P&L by month" code="PNL">
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

      <Panel title={`Transactions (${transactions.length})`} code="TXN">
        <TransactionsTable transactions={transactions} />
      </Panel>
    </div>
  );
}
