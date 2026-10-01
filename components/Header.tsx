import Link from "next/link";
import { Plus } from "lucide-react";
import UserDropdown from "@/components/UserDropDown";
import { Logo } from "@/components/brand/Logo";
import CommandBar from "@/components/layout/CommandBar";
import LiveIndicator from "@/components/layout/LiveIndicator";
import ExchangeClock from "@/components/layout/ExchangeClock";
import TickerTape, { CRYPTO_PAIRS, INDEX_PROXIES } from "@/components/layout/TickerTape";
import TradeDialog from "@/components/finance/TradeDialog";
import { Button } from "@/components/ui/button";
import { searchStocks } from "@/lib/actions/finhub.actions";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";
import { getQuotes } from "@/lib/server/finnhub";

const Header = async ({ user }: { user: User }) => {
  const [initialStocks, watchlist] = await Promise.all([searchStocks(), getWatchlistSymbols()]);
  const tickerSymbols = [...new Set([...Object.keys(INDEX_PROXIES), ...Object.keys(CRYPTO_PAIRS), ...watchlist])].slice(0, 30);
  const tickerQuotes = await getQuotes(tickerSymbols.filter((s) => !s.includes(":")));

  return (
    <header className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur supports-[backdrop-filter]:bg-gray-950/75">
      <div className="flex h-12 items-center gap-3 border-b border-gray-600 px-3 md:px-4">
        <Link href="/" className="shrink-0" aria-label="Tickline home">
          <Logo size={22} className="lg:hidden" />
          <span className="hidden text-[15px] font-semibold tracking-tight text-gray-100 lg:inline">
            Tick<span className="text-gray-100">line</span>
          </span>
        </Link>

        <div className="flex flex-1 justify-end sm:justify-center">
          <CommandBar initialStocks={initialStocks} watchlistSymbols={watchlist} />
        </div>

        <LiveIndicator className="hidden md:inline-flex" />
        <ExchangeClock className="hidden xl:flex" />
        <TradeDialog
          listenForShortcut
          trigger={
            <Button size="sm" className="h-8 rounded-md btn-primary px-3" title="New trade (T)">
              <Plus /> <span className="hidden sm:inline">Trade</span>
            </Button>
          }
        />
        <UserDropdown user={user} />
      </div>
      <TickerTape symbols={tickerSymbols} initial={tickerQuotes} />
    </header>
  );
};
export default Header;
