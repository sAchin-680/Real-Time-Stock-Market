"use client";

import { useEffect, useState, useTransition } from "react";
import { BellPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createAlert, updateAlert } from "@/lib/actions/alert.actions";
import { ALERT_CONDITIONS, ALERT_FREQUENCIES, describeAlert, type AlertCondition, type AlertFrequency } from "@/lib/finance/alerts";
import { formatCurrency } from "@/lib/format";
import type { AlertDTO } from "@/lib/types";

export default function AlertFormDialog({
  symbol,
  company,
  currentPrice,
  alert,
  trigger,
}: {
  symbol?: string;
  company?: string;
  currentPrice?: number;
  /** When provided the dialog edits this alert. */
  alert?: AlertDTO;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initial = () => ({
    symbol: alert?.symbol ?? symbol ?? "",
    company: alert?.company ?? company ?? "",
    name: alert?.name ?? (symbol ? `${symbol} alert` : ""),
    condition: (alert?.condition ?? "PRICE_ABOVE") as AlertCondition,
    threshold: alert ? String(alert.threshold) : currentPrice ? (currentPrice * 1.05).toFixed(2) : "",
    frequency: (alert?.frequency ?? "ONCE") as AlertFrequency,
  });
  const [form, setForm] = useState(initial);

  useEffect(() => {
    if (open) {
      setForm(initial());
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const unit = ALERT_CONDITIONS.find((c) => c.value === form.condition)?.unit ?? "$";
  const threshold = Number(form.threshold);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const payload = { ...form, company: form.company || form.symbol };
      const res = alert ? await updateAlert(alert.id, payload) : await createAlert(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? { form: res.error });
        return;
      }
      toast.success(alert ? "Alert updated" : "Alert created", { description: `${res.data.symbol} · ${describeAlert(res.data.condition, res.data.threshold)}` });
      setOpen(false);
    });
  };

  const err = (k: string) => errors[k] && <p className="text-xs text-loss">{errors[k]}</p>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <BellPlus /> {alert ? "Edit alert" : "New alert"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-gray-600 bg-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-100">{alert ? "Edit alert" : "Create price alert"}</DialogTitle>
          <DialogDescription>
            Checked every 5 minutes during market hours. You&apos;ll get an email and see it here when it triggers.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {!symbol && !alert && (
            <div className="space-y-1.5">
              <Label htmlFor="alert-symbol" className="form-label">Symbol</Label>
              <Input id="alert-symbol" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="AAPL" className="form-input num" required autoFocus />
              {err("symbol")}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="alert-name" className="form-label">Name</Label>
            <Input id="alert-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={60} placeholder="Breakout above resistance" className="form-input" required />
            {err("name")}
          </div>

          <div className="grid grid-cols-[1fr_140px] gap-3">
            <div className="space-y-1.5">
              <Label className="form-label">Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: v as AlertCondition }))}>
                <SelectTrigger className="select-trigger"><SelectValue /></SelectTrigger>
                <SelectContent className="border-gray-600 bg-gray-800 text-white">
                  {ALERT_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="focus:bg-gray-600 focus:text-white">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-threshold" className="form-label">Threshold ({unit})</Label>
              <Input id="alert-threshold" type="number" step="any" min="0" inputMode="decimal" value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))} className="form-input num" required />
            </div>
          </div>
          {err("threshold")}

          <div className="space-y-1.5">
            <Label className="form-label">Frequency</Label>
            <Select value={form.frequency} onValueChange={(v) => setForm((f) => ({ ...f, frequency: v as AlertFrequency }))}>
              <SelectTrigger className="select-trigger"><SelectValue /></SelectTrigger>
              <SelectContent className="border-gray-600 bg-gray-800 text-white">
                {ALERT_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value} className="focus:bg-gray-600 focus:text-white">{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {threshold > 0 && (
            <p className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-400">
              Notify me when <span className="font-semibold text-gray-100">{form.symbol || "the stock"}</span>:{" "}
              <span className="num text-yellow-400">{describeAlert(form.condition, threshold)}</span>
              {currentPrice ? <span className="text-gray-500"> · now {formatCurrency(currentPrice)}</span> : null}
            </p>
          )}
          {errors.form && <p className="text-sm text-loss">{errors.form}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending} className="bg-yellow-400 text-gray-900 hover:bg-yellow-500">
              {pending && <Loader2 className="animate-spin" />} {alert ? "Save changes" : "Create alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
