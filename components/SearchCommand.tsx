"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, TrendingUp } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import WatchlistButton from "@/components/WatchlistButton";
import { searchStocks } from "@/lib/actions/finhub.actions";
import { OPEN_SEARCH_EVENT } from "@/components/layout/KeyboardShortcuts";

export default function SearchCommand({
  initialStocks,
  watchlistSymbols = [],
}: {
  initialStocks: StockWithWatchlistStatus[];
  watchlistSymbols?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
  const [watchlist, setWatchlist] = useState(() => new Set(watchlistSymbols));

  const term = searchTerm.trim();

  useEffect(() => setWatchlist(new Set(watchlistSymbols)), [watchlistSymbols]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!term) {
      setStocks(initialStocks);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchStocks(term);
        if (!cancelled) setStocks(results);
      } catch {
        if (!cancelled) setStocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [term, initialStocks]);

  const go = (symbol: string) => {
    setOpen(false);
    setSearchTerm("");
    router.push(`/stocks/${encodeURIComponent(symbol)}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center gap-3 rounded-lg border border-gray-600 bg-gray-800 text-sm text-gray-500 transition-colors hover:border-gray-500 hover:text-gray-400 sm:w-full sm:max-w-md sm:justify-start sm:px-3"
        aria-label="Search stocks"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden flex-1 text-left sm:inline">Search symbols or companies…</span>
        <kbd className="hidden rounded border border-gray-600 bg-gray-700 px-1.5 py-0.5 font-mono text-[10px] text-gray-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog" shouldFilter={false} title="Search stocks" description="Search by ticker or company name">
        <div className="search-field">
          <CommandInput value={searchTerm} onValueChange={setSearchTerm} placeholder="Search by ticker or company name…" className="search-input" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {!loading && <CommandEmpty className="search-list-empty">{term ? "No results found" : "No stocks available"}</CommandEmpty>}
          {stocks.length > 0 && (
            <CommandGroup heading={term ? `Results (${stocks.length})` : "Popular"} className="text-gray-500">
              {stocks.map((stock) => (
                <CommandItem
                  key={stock.symbol}
                  value={stock.symbol}
                  onSelect={() => go(stock.symbol)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 data-[selected=true]:bg-gray-700"
                >
                  <TrendingUp className="size-4 text-gray-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-100">{stock.name}</div>
                    <div className="text-xs text-gray-500">
                      <span className="num text-gray-400">{stock.symbol}</span> · {stock.exchange} · {stock.type}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <WatchlistButton
                      type="icon"
                      symbol={stock.symbol}
                      company={stock.name}
                      isInWatchlist={watchlist.has(stock.symbol)}
                      onWatchlistChange={(symbol, added) =>
                        setWatchlist((prev) => {
                          const next = new Set(prev);
                          if (added) next.add(symbol);
                          else next.delete(symbol);
                          return next;
                        })
                      }
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
