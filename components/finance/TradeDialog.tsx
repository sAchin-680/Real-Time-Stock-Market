"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTransaction } from "@/lib/actions/portfolio.actions";
import type { TransactionSide } from "@/lib/finance/portfolio";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OPEN_TRADE_EVENT } from "@/components/layout/KeyboardShortcuts";

const SIDES: { value: TransactionSide; label: string }[] = [
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "DIVIDEND", label: "Dividend" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function TradeDialog({
  symbol: fixedSymbol,
  defaultPrice,
  defaultSide = "BUY",
  trigger,
  listenForShortcut = false,
}: {
  symbol?: string;
  defaultPrice?: number;
  defaultSide?: TransactionSide;
  trigger?: React.ReactNode;
  /** Open when the global "T" shortcut fires (enable on exactly one instance). */
  listenForShortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    symbol: fixedSymbol ?? "",
    side: defaultSide,
    quantity: "",
    price: defaultPrice ? defaultPrice.toFixed(2) : "",
    fees: "0",
    executedAt: today(),
    notes: "",
  });

  useEffect(() => {
    if (!listenForShortcut) return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_TRADE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TRADE_EVENT, onOpen);
  }, [listenForShortcut]);

  useEffect(() => {
    if (open) {
      setErrors({});
      setForm((f) => ({ ...f, symbol: fixedSymbol ?? f.symbol, price: defaultPrice ? defaultPrice.toFixed(2) : f.price, executedAt: today() }));
    }
  }, [open, fixedSymbol, defaultPrice]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const qty = Number(form.quantity) || 0;
  const price = Number(form.price) || 0;
  const fees = Number(form.fees) || 0;
  const total = form.side === "BUY" ? qty * price + fees : qty * price - fees;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addTransaction({ ...form, executedAt: `${form.executedAt}T16:00:00Z` });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        toast.error("Couldn't save trade", { description: res.error });
        return;
      }
      toast.success(`${form.side === "DIVIDEND" ? "Dividend" : form.side === "BUY" ? "Buy" : "Sell"} recorded`, {
        description: `${res.data.symbol} · ${formatCurrency(res.data.total)}`,
      });
      setForm((f) => ({ ...f, quantity: "", notes: "", fees: "0" }));
      setOpen(false);
    });
  };

  const field = (name: string) => errors[name] && <p className="text-xs text-loss">{errors[name]}</p>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-500">
            <Plus /> Add trade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-gray-600 bg-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Record a transaction{fixedSymbol ? ` · ${fixedSymbol}` : ""}</DialogTitle>
          <DialogDescription>Cost basis uses FIFO. Buy fees are added to cost; sell fees reduce proceeds.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div role="radiogroup" aria-label="Transaction type" className="grid grid-cols-3 gap-1 rounded-lg bg-gray-900 p-1">
            {SIDES.map((s) => (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={form.side === s.value}
                onClick={() => setForm((f) => ({ ...f, side: s.value }))}
                className={cn(
                  "rounded-md py-1.5 text-sm font-medium transition-colors",
                  form.side === s.value ? (s.value === "SELL" ? "bg-loss-fill text-white" : s.value === "BUY" ? "bg-gain-fill text-white" : "bg-gray-600 text-gray-100") : "text-gray-500 hover:text-gray-400"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>

          {!fixedSymbol && (
            <div className="space-y-1.5">
              <Label htmlFor="trade-symbol" className="form-label">Symbol</Label>
              <Input id="trade-symbol" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" className="form-input num uppercase" autoFocus required />
              {field("symbol")}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade-qty" className="form-label">{form.side === "DIVIDEND" ? "Shares held" : "Shares"}</Label>
              <Input id="trade-qty" type="number" inputMode="decimal" step="any" min="0" value={form.quantity} onChange={set("quantity")} className="form-input num" required autoFocus={!!fixedSymbol} />
              {field("quantity")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade-price" className="form-label">{form.side === "DIVIDEND" ? "Dividend / share" : "Price / share"}</Label>
              <Input id="trade-price" type="number" inputMode="decimal" step="any" min="0" value={form.price} onChange={set("price")} className="form-input num" required />
              {field("price")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade-fees" className="form-label">Fees</Label>
              <Input id="trade-fees" type="number" inputMode="decimal" step="any" min="0" value={form.fees} onChange={set("fees")} className="form-input num" />
              {field("fees")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade-date" className="form-label">Date</Label>
              <Input id="trade-date" type="date" max={today()} value={form.executedAt} onChange={set("executedAt")} className="form-input num" required />
              {field("executedAt")}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="trade-notes" className="form-label">Notes <span className="text-gray-500">(optional)</span></Label>
            <Input id="trade-notes" value={form.notes} onChange={set("notes")} maxLength={280} placeholder="Thesis, broker, account…" className="form-input" />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-900 px-4 py-3 text-sm">
            <span className="text-gray-500">{form.side === "BUY" ? "Total cost" : form.side === "SELL" ? "Net proceeds" : "Dividend income"}</span>
            <span className="num text-base font-semibold text-gray-100">{formatCurrency(total)}</span>
          </div>
          {errors.form && <p className="text-sm text-loss">{errors.form}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending} className="bg-yellow-400 text-gray-900 hover:bg-yellow-500">
              {pending && <Loader2 className="animate-spin" />} Save transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
