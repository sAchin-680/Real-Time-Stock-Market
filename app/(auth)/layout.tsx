import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BellRing, Gauge, Layers } from "lucide-react";
import { Logo, BRAND } from "@/components/brand/Logo";
import { getSessionUser } from "@/lib/server/session";

const FEATURES = [
  { icon: Activity, title: "Tick-by-tick P&L", text: "Trades stream straight into your positions — no refresh, no 15-minute delay." },
  { icon: Layers, title: "Real accounting", text: "FIFO lots, fees in cost basis, realized vs unrealized, dividends." },
  { icon: Gauge, title: "Risk you can read", text: "Beta, concentration, sector exposure and day-P&L attribution." },
  { icon: BellRing, title: "Alerts that fire", text: "Price and day-move triggers checked every 5 minutes, sent by email." },
];

// Illustrative sample for the preview only.
const PREVIEW = [
  { s: "NVDA", w: 3, c: 2.4 },
  { s: "MSFT", w: 2.6, c: 0.8 },
  { s: "AAPL", w: 2.2, c: -0.6 },
  { s: "AMZN", w: 1.6, c: 1.3 },
  { s: "JPM", w: 1.3, c: -1.1 },
  { s: "XOM", w: 1, c: 0.2 },
];

// 4×3 grid: NVDA 2×2, MSFT 2×1, AAPL 1×1, AMZN 1×1, JPM 2×1, XOM 2×1.
const SPANS = ["col-span-2 row-span-2", "col-span-2", "", "", "col-span-2", "col-span-2"];

const tile = (c: number) =>
  Math.abs(c) < 0.1 ? "#1f1f23" : `color-mix(in srgb, var(${c > 0 ? "--gain-fill" : "--loss-fill"}) ${Math.round(30 + Math.min(1, Math.abs(c) / 3) * 60)}%, #18181b)`;

function TerminalPreview() {
  return (
    <div className="panel w-full max-w-[560px] overflow-hidden shadow-2xl shadow-black/60" aria-hidden>
      <div className="flex h-8 items-center gap-1.5 border-b border-gray-600 px-3">
        <span className="size-2 rounded-full bg-gray-600" />
        <span className="size-2 rounded-full bg-gray-600" />
        <span className="size-2 rounded-full bg-gray-600" />
        <span className="num ml-3 text-[10px] text-gray-500">tickline · DASH</span>
        <span className="num ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-gain">
          <span className="size-1.5 animate-pulse rounded-full bg-gain" /> LIVE
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-gray-600/60">
        {[
          ["NET LIQ", "$248,310.42", ""],
          ["DAY P&L", "+$3,184.07", "text-gain"],
          ["VS S&P 500", "+0.61%", "text-gain"],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-gray-800 px-3 py-2.5">
            <p className="text-[9px] font-semibold tracking-[0.08em] text-gray-500">{l}</p>
            <p className={`num mt-0.5 text-sm font-semibold text-gray-100 ${c}`}>{v}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-3 p-3">
        <svg viewBox="0 0 200 90" className="col-span-3 h-[110px] w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pv" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--gain-fill)" stopOpacity=".3" />
              <stop offset="100%" stopColor="var(--gain-fill)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2="200" y1="62" y2="62" stroke="#3f3f46" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <path d="M0 64 L14 60 L26 66 L40 55 L54 58 L68 47 L82 50 L96 41 L110 45 L124 33 L138 37 L152 26 L166 30 L180 19 L200 14 L200 90 L0 90Z" fill="url(#pv)" />
          <path d="M0 64 L14 60 L26 66 L40 55 L54 58 L68 47 L82 50 L96 41 L110 45 L124 33 L138 37 L152 26 L166 30 L180 19 L200 14" fill="none" stroke="var(--gain-fill)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="col-span-2 grid h-[110px] grid-cols-4 grid-rows-3 gap-0.5 overflow-hidden rounded">
          {PREVIEW.map((p, i) => (
            <div
              key={p.s}
              className={`flex flex-col items-center justify-center ${SPANS[i]}`}
              style={{ background: tile(p.c) }}
            >
              <span className="num text-[9px] font-semibold text-white/90">{p.s}</span>
              {i < 2 && <span className="num text-[8px] text-white/70">{p.c > 0 ? "+" : ""}{p.c.toFixed(1)}%</span>}
            </div>
          ))}
        </div>
      </div>
      <table className="w-full border-t border-gray-600 text-[11px]">
        <tbody>
          {PREVIEW.slice(0, 4).map((p) => (
            <tr key={p.s} className="border-t border-gray-600/50 first:border-t-0">
              <td className="num px-3 py-1.5 font-semibold text-gray-100">{p.s}</td>
              <td className="num px-3 py-1.5 text-right text-gray-400">{(p.w * 41.3).toFixed(2)}</td>
              <td className={`num px-3 py-1.5 text-right ${p.c >= 0 ? "text-gain" : "text-loss"}`}>{p.c >= 0 ? "+" : ""}{p.c.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
  if (await getSessionUser()) redirect("/");

  return (
    <main className="flex min-h-screen flex-col bg-gray-900 lg:flex-row">
      <section className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-[44%] lg:max-w-[620px] lg:px-14">
        <Link href="/" aria-label={BRAND.name}>
          <Logo size={26} />
        </Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</div>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500">
          <span>© {new Date().getFullYear()} Tickline</span>
          <Link href="/terms" className="hover:text-gray-100">Terms</Link>
          <Link href="/privacy" className="hover:text-gray-100">Privacy</Link>
          <Link href="/disclaimer" className="hover:text-gray-100">Disclaimer</Link>
          <span className="basis-full sm:basis-auto">Market data by Finnhub &amp; TradingView. Not investment advice.</span>
        </footer>
      </section>

      <section className="terminal-grid relative hidden flex-1 flex-col justify-center overflow-hidden border-l border-gray-600 bg-gray-950 px-12 py-12 lg:flex xl:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="relative max-w-[600px]">
          <p className="num text-[11px] font-semibold tracking-[0.12em] text-gray-500">REAL-TIME PORTFOLIO TERMINAL</p>
          <h2 className="mt-3 text-4xl font-semibold leading-[1.1] tracking-tight text-gray-100 xl:text-[44px]">
            Your portfolio,
            <br />
            <span className="text-gray-500">moving at market speed.</span>
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <f.icon className="mt-0.5 size-4 shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-100">{f.title}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-gray-500">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <TerminalPreview />
            <p className="mt-2 text-[10px] text-gray-500">Preview with sample data.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Layout;
