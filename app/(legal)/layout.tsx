import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import LegalNav from "@/components/legal/LegalNav";
import { LEGAL } from "@/lib/legal";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="sticky top-0 z-30 border-b border-gray-600 bg-gray-950/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" aria-label="Tickline home">
            <Logo size={22} />
          </Link>
          <Link href="/" className="text-[13px] text-gray-400 hover:text-gray-100">Open app →</Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-10 md:grid-cols-[200px_1fr]">
        <LegalNav />
        <main className="min-w-0">{children}</main>
      </div>
      <footer className="border-t border-gray-600 py-6 text-center text-[11px] text-gray-500">
        © {new Date().getFullYear()} {LEGAL.product}. Market data by Finnhub and TradingView. Not investment advice.
      </footer>
    </div>
  );
}
