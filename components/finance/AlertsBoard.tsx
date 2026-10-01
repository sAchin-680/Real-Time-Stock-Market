"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, BellOff, History, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkMyAlertsNow, deleteAlert, setAlertActive } from "@/lib/actions/alert.actions";
import { describeAlert, distanceToTrigger } from "@/lib/finance/alerts";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { AlertDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge, Delta, EmptyState, KpiCard } from "@/components/finance/primitives";
import AlertFormDialog from "@/components/finance/AlertFormDialog";
import ConfirmDialog from "@/components/finance/ConfirmDialog";

const timeAgo = (iso?: string) => {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
};

function AlertCard({ alert }: { alert: AlertDTO }) {
  const [pending, startTransition] = useTransition();
  const [showHistory, setShowHistory] = useState(false);
  const distance = alert.currentPrice ? distanceToTrigger(alert.condition, alert.threshold, alert.currentPrice) : null;

  const toggle = () =>
    startTransition(async () => {
      const res = await setAlertActive(alert.id, !alert.active);
      if (!res.ok) toast.error("Couldn't update alert", { description: res.error });
      else toast.success(res.data.active ? "Alert resumed" : "Alert paused");
    });

  return (
    <li className={cn("panel p-4 transition-opacity md:p-5", !alert.active && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/stocks/${alert.symbol}`} className="num font-semibold text-gray-100 hover:text-gray-100">{alert.symbol}</Link>
            <Badge tone={alert.active ? "gain" : "neutral"}>{alert.active ? "Active" : "Paused"}</Badge>
            <Badge>{alert.frequency === "DAILY" ? "Daily" : "Once"}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-gray-400">{alert.name}</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={toggle} disabled={pending} aria-label={alert.active ? "Pause alert" : "Resume alert"} title={alert.active ? "Pause" : "Resume"} className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-700 hover:text-gray-100">
            {pending ? <Loader2 className="size-4 animate-spin" /> : alert.active ? <BellOff className="size-4" /> : <Bell className="size-4" />}
          </button>
          <AlertFormDialog
            alert={alert}
            currentPrice={alert.currentPrice}
            trigger={
              <button type="button" aria-label="Edit alert" title="Edit" className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-700 hover:text-gray-100">
                <Pencil className="size-4" />
              </button>
            }
          />
          <ConfirmDialog
            title="Delete this alert?"
            description={`${alert.symbol} · ${describeAlert(alert.condition, alert.threshold)}`}
            onConfirm={async () => {
              const res = await deleteAlert(alert.id);
              if (!res.ok) {
                toast.error("Couldn't delete", { description: res.error });
                return false;
              }
              toast.success("Alert deleted");
            }}
            trigger={
              <button type="button" aria-label="Delete alert" title="Delete" className="flex size-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-700 hover:text-loss">
                <Trash2 className="size-4" />
              </button>
            }
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-gray-500">Condition</dt>
          <dd className="num mt-0.5 whitespace-nowrap text-xs text-gray-100 sm:text-sm">{describeAlert(alert.condition, alert.threshold)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Last price</dt>
          <dd className="num mt-0.5 text-gray-100">
            {formatCurrency(alert.currentPrice)} {alert.changePercent !== undefined && <Delta kind="percent" percent={alert.changePercent} showIcon={false} className="ml-1 text-xs" />}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Distance</dt>
          <dd className="num mt-0.5 text-gray-400">{distance === null ? "—" : formatPercent(distance)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Triggered</dt>
          <dd className="mt-0.5 text-gray-400">
            <span className="num">{alert.triggerCount}×</span> · {timeAgo(alert.lastTriggeredAt)}
          </dd>
        </div>
      </dl>

      {alert.history.length > 0 && (
        <div className="mt-3 border-t border-gray-600/50 pt-3">
          <button type="button" onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400">
            <History className="size-3.5" /> {showHistory ? "Hide" : "Show"} trigger history
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 text-xs">
              {alert.history.map((h) => (
                <li key={h.triggeredAt} className="num flex justify-between text-gray-400">
                  <span>{new Date(h.triggeredAt).toLocaleString()}</span>
                  <span>{formatCurrency(h.price)} ({formatPercent(h.changePercent)})</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function AlertsBoard({ alerts }: { alerts: AlertDTO[] }) {
  const [filter, setFilter] = useState<"all" | "active" | "paused">("all");
  const [checking, startCheck] = useTransition();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      active: alerts.filter((a) => a.active).length,
      paused: alerts.filter((a) => !a.active).length,
      today: alerts.filter((a) => a.lastTriggeredAt && new Date(a.lastTriggeredAt).toDateString() === today).length,
      total: alerts.reduce((s, a) => s + a.triggerCount, 0),
    };
  }, [alerts]);

  const shown = alerts.filter((a) => filter === "all" || (filter === "active" ? a.active : !a.active));

  const checkNow = () =>
    startCheck(async () => {
      const res = await checkMyAlertsNow();
      if (!res.ok) return void toast.error("Check failed", { description: res.error });
      if (!res.data.length) toast.info("No alerts triggered", { description: "All conditions checked against the latest prices." });
      else toast.success(`${res.data.length} alert${res.data.length > 1 ? "s" : ""} triggered`, { description: res.data.map((f) => `${f.symbol} @ ${formatCurrency(f.price)}`).join(", ") });
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Alerts</h1>
          <p className="page-subtitle">Price and daily-move alerts, evaluated every 5 minutes while the market is open.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={checkNow} disabled={checking || !stats.active}>
            {checking ? <Loader2 className="animate-spin" /> : <RefreshCw />} Check now
          </Button>
          <AlertFormDialog trigger={<Button className="btn-primary"><Bell /> New alert</Button>} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiCard label="Active" value={stats.active} />
        <KpiCard label="Paused" value={stats.paused} />
        <KpiCard label="Triggered today" value={stats.today} />
        <KpiCard label="All-time triggers" value={stats.total} />
      </div>

      {alerts.length ? (
        <>
          <div className="flex gap-1 rounded-md bg-gray-800 p-1 text-sm w-fit">
            {(["all", "active", "paused"] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded px-3 py-1 font-medium capitalize", filter === f ? "bg-gray-600 text-gray-100" : "text-gray-500 hover:text-gray-400")}>
                {f}
              </button>
            ))}
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {shown.map((a) => (
              <AlertCard key={a.id} alert={a} />
            ))}
          </ul>
        </>
      ) : (
        <div className="panel">
          <EmptyState
            icon={<Bell className="size-5" />}
            title="No alerts yet"
            description="Get notified when a stock crosses a price or moves sharply in a day."
            action={<AlertFormDialog trigger={<Button className="btn-primary"><Bell /> Create your first alert</Button>} />}
          />
        </div>
      )}
    </div>
  );
}
