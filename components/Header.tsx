import Image from "next/image";
import Link from "next/link";
import UserDropdown from "@/components/UserDropDown";
import SearchCommand from "@/components/SearchCommand";
import MarketStatusBadge from "@/components/MarketStatusBadge";
import { searchStocks } from "@/lib/actions/finhub.actions";
import { getWatchlistSymbols } from "@/lib/actions/watchlist.actions";

const Header = async ({ user }: { user: User }) => {
  const [initialStocks, watchlist] = await Promise.all([searchStocks(), getWatchlistSymbols()]);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-600/60 bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:bg-gray-900/70">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <Link href="/" className="lg:hidden">
          <Image src="/assets/icons/logo.svg" alt="Signalist" width={120} height={28} className="h-6 w-auto" />
        </Link>

        <div className="flex flex-1 justify-end sm:justify-start">
          <SearchCommand initialStocks={initialStocks} watchlistSymbols={watchlist} />
        </div>

        <MarketStatusBadge className="hidden md:inline-flex" />
        <UserDropdown user={user} />
      </div>
    </header>
  );
};
export default Header;
