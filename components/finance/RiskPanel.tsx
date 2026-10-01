import { Info, ShieldAlert, ShieldCheck, ShieldHalf } from "lucide-react";
import type { RiskMetrics } from "@/lib/finance/portfolio";
import { Badge } from "@/components/finance/primitives";

const LEVEL = {
  low: { tone: "gain", icon: ShieldCheck, label: "Diversified", text: "No single position dominates the portfolio." },
  moderate: { tone: "warn", icon: ShieldHalf, label: "Moderate concentration", text: "A few positions drive most of the risk." },
  high: { tone: "loss", icon: ShieldAlert, label: "Concentrated", text: "Returns depend heavily on one or two names." },
} as const;

function Metric({ label, value, hint }: { label: string; value: React.ReactNode; hint: string }) {
  return (
    <div className="rounded-lg border border-gray-600/60 bg-gray-900/40 p-3">
      <dt className="flex items-center gap-1 text-xs text-gray-500" title={hint}>
        {label}
        <Info className="size-3 opacity-60" aria-hidden />
      </dt>
      <dd className="num mt-1 text-lg font-semibold text-gray-100">{value}</dd>
    </div>
  );
}

export default function RiskPanel({ risk }: { risk: RiskMetrics }) {
  const level = LEVEL[risk.concentration];
  const Icon = level.icon;

  return (
    <div className="space-y-4 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <Badge tone={level.tone} className="shrink-0">
          <Icon className="size-3.5" aria-hidden />
          {level.label}
        </Badge>
        <p className="text-sm text-gray-500">{level.text}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3">
        <Metric
          label="Portfolio beta"
          value={risk.beta === null ? "—" : risk.beta.toFixed(2)}
          hint={`Value-weighted beta vs the market (covers ${(risk.betaCoverage * 100).toFixed(0)}% of holdings). 1.0 moves with the market.`}
        />
        <Metric
          label="Effective positions"
          value={risk.effectivePositions ? risk.effectivePositions.toFixed(1) : "—"}
          hint="1 / HHI — how many equally sized positions would give the same concentration."
        />
        <Metric
          label="Largest position"
          value={risk.topPosition ? `${risk.topPosition.symbol} · ${(risk.topPosition.weight * 100).toFixed(1)}%` : "—"}
          hint="Share of portfolio value in the single biggest holding."
        />
        <Metric
          label="Largest sector"
          value={risk.topSector ? `${(risk.topSector.weight * 100).toFixed(0)}%` : "—"}
          hint={risk.topSector ? `${risk.topSector.label} exposure as a share of portfolio value.` : "Sector exposure."}
        />
      </dl>
      {risk.topSector && <p className="text-xs text-gray-500">Top sector: <span className="text-gray-400">{risk.topSector.label}</span></p>}
    </div>
  );
}
