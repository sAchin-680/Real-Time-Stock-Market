"use client";

import { useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "@/lib/actions/portfolio.actions";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { TransactionDTO } from "@/lib/types";
import { Badge, EmptyState } from "@/components/finance/primitives";
import ConfirmDialog from "@/components/finance/ConfirmDialog";

const PAGE_SIZE = 15;
const SIDE_TONE = { BUY: "gain", SELL: "loss", DIVIDEND: "info" } as const;

export default function TransactionsTable({ transactions }: { transactions: TransactionDTO[] }) {
  const [query, setQuery] = useState("");
  const [side, setSide] = useState<"ALL" | TransactionDTO["side"]>("ALL");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return transactions.filter((t) => (side === "ALL" || t.side === side) && (!q || t.symbol.includes(q) || t.notes.toUpperCase().includes(q)));
  }, [transactions, query, side]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (!transactions.length) {
    return <EmptyState title="No transactions yet" description="Record a trade or import a CSV from your broker to start tracking P&L." />;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-600/60 px-4 py-3 md:px-5">
        <label className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <span className="sr-only">Filter transactions</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by symbol or note"
            className="h-9 w-full rounded-md border border-gray-600 bg-gray-900 pl-8 pr-3 text-sm text-gray-100 placeholder:text-gray-500 focus:border-yellow-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-1 rounded-md bg-gray-900 p-1 text-xs">
          {(["ALL", "BUY", "SELL", "DIVIDEND"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSide(s);
                setPage(0);
              }}
              className={`rounded px-2.5 py-1 font-medium ${side === s ? "bg-gray-600 text-gray-100" : "text-gray-500 hover:text-gray-400"}`}
            >
              {s === "ALL" ? "All" : s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Symbol</th>
              <th className="text-right">Shares</th>
              <th className="text-right">Price</th>
              <th className="text-right">Fees</th>
              <th className="text-right">Total</th>
              <th>Notes</th>
              <th className="w-10"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="num text-gray-400">{t.executedAt.slice(0, 10)}</td>
                <td>
                  <Badge tone={SIDE_TONE[t.side]}>{t.side[0] + t.side.slice(1).toLowerCase()}</Badge>
                </td>
                <td className="font-semibold">{t.symbol}</td>
                <td className="num text-right text-gray-400">{formatQuantity(t.quantity)}</td>
                <td className="num text-right text-gray-400">{formatCurrency(t.price)}</td>
                <td className="num text-right text-gray-500">{t.fees ? formatCurrency(t.fees) : "—"}</td>
                <td className="num text-right font-medium">{formatCurrency(t.total)}</td>
                <td className="max-w-[220px] truncate text-gray-500" title={t.notes}>{t.notes || "—"}</td>
                <td>
                  <ConfirmDialog
                    title={`Delete this ${t.side.toLowerCase()}?`}
                    description={`${t.symbol} · ${formatQuantity(t.quantity)} @ ${formatCurrency(t.price)} on ${t.executedAt.slice(0, 10)}. P&L will be recalculated.`}
                    onConfirm={async () => {
                      const res = await deleteTransaction(t.id);
                      if (!res.ok) {
                        toast.error("Couldn't delete", { description: res.error });
                        return false;
                      }
                      toast.success("Transaction deleted");
                    }}
                    trigger={
                      <button type="button" aria-label={`Delete ${t.symbol} transaction`} className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-700 hover:text-loss">
                        <Trash2 className="size-4" />
                      </button>
                    }
                  />
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="py-10 text-center text-gray-500">No transactions match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-600/60 px-4 py-3 text-xs text-gray-500 md:px-5">
          <span className="num">
            {current * PAGE_SIZE + 1}–{Math.min(filtered.length, (current + 1) * PAGE_SIZE)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="rounded border border-gray-600 px-3 py-1 hover:text-gray-400 disabled:opacity-40">Previous</button>
            <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="rounded border border-gray-600 px-3 py-1 hover:text-gray-400 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
