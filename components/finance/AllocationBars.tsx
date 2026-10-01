import type { AllocationSlice } from "@/lib/finance/portfolio";
import { formatCurrency } from "@/lib/format";

/**
 * Ranked horizontal bars for share-of-portfolio. Single hue (magnitude job),
 * every bar directly labelled, so no legend or categorical palette is needed.
 */
export default function AllocationBars({ slices, max = 8 }: { slices: AllocationSlice[]; max?: number }) {
  if (!slices.length) return <p className="px-5 py-10 text-center text-sm text-gray-500">No open positions yet.</p>;

  const shown = slices.slice(0, max);
  const rest = slices.slice(max);
  if (rest.length) {
    shown.push({
      label: `Other (${rest.length})`,
      value: rest.reduce((s, r) => s + r.value, 0),
      weight: rest.reduce((s, r) => s + r.weight, 0),
    });
  }
  const top = Math.max(...shown.map((s) => s.weight));

  return (
    <ul className="space-y-3.5 p-4 md:p-5">
      {shown.map((slice) => (
        <li key={slice.label} title={`${slice.label}: ${formatCurrency(slice.value)} (${(slice.weight * 100).toFixed(1)}%)`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-gray-400">{slice.label}</span>
            <span className="num shrink-0 text-gray-100">
              {(slice.weight * 100).toFixed(1)}%<span className="ml-2 text-xs text-gray-500">{formatCurrency(slice.value, { compact: true })}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-viz-track" aria-hidden>
            <div className="h-full rounded-full bg-viz-bar" style={{ width: `${top ? (slice.weight / top) * 100 : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
