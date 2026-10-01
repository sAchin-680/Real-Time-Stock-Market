import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import UserDropdown from "@/components/UserDropDown";
import SearchCommand from "@/components/SearchCommand";
import MarketStatusBadge from "@/components/MarketStatusBadge";
import TickerTape, { CRYPTO_PAIRS, INDEX_PROXIES } from "@/components/layout/TickerTape";
import LiveIndicator from "@/components/layout/LiveIndicator";
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
    <header className="sticky top-0 z-40 bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75">
      <div className="flex h-14 items-center gap-3 border-b border-gray-600/50 px-4 md:px-6">
        <Link href="/" className="lg:hidden">
          <Image src="/assets/icons/logo.svg" alt="Signalist" width={120} height={28} className="h-6 w-auto" />
        </Link>

        <div className="flex flex-1 justify-end sm:justify-start">
          <SearchCommand initialStocks={initialStocks} watchlistSymbols={watchlist} />
        </div>

        <LiveIndicator className="hidden sm:inline-flex" />
        <MarketStatusBadge className="hidden md:inline-flex" />
        <TradeDialog
          listenForShortcut
          trigger={
            <Button size="sm" className="h-9 bg-yellow-400 px-3 font-semibold text-gray-900 hover:bg-yellow-500" title="New trade (T)">
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
