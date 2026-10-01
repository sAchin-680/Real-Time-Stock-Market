"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronRight, CircleHelp, Loader2, Plus } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import WatchlistButton from "@/components/WatchlistButton";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { OPEN_HELP_EVENT, OPEN_SEARCH_EVENT, OPEN_TRADE_EVENT } from "@/components/layout/KeyboardShortcuts";
import { searchStocks } from "@/lib/actions/finhub.actions";
import { NAV_ITEMS } from "@/lib/constants";

const ACTIONS = [
  { code: "TRADE", label: "New trade", icon: Plus, event: OPEN_TRADE_EVENT },
  { code: "HELP", label: "Keyboard shortcuts", icon: CircleHelp, event: OPEN_HELP_EVENT },
] as const;

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

/**
 * Terminal-style command bar: tickers ("AAPL" ⏎), mnemonics ("PORT", "WL"),
 * actions ("TRADE") and company search in one input.
 */
export default function CommandBar({
  initialStocks,
  watchlistSymbols = [],
}: {
  initialStocks: StockWithWatchlistStatus[];
  watchlistSymbols?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockWithWatchlistStatus[]>(initialStocks);
  const [watchlist, setWatchlist] = useState(() => new Set(watchlistSymbols));

  const q = term.trim();
  const upper = q.toUpperCase();

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
    if (!q) {
      setStocks(initialStocks);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchStocks(q);
        if (!cancelled) setStocks(results);
      } catch {
        if (!cancelled) setStocks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, initialStocks]);

  const commands = useMemo(
    () => NAV_ITEMS.filter((n) => !q || n.code.startsWith(upper) || n.label.toUpperCase().startsWith(upper)),
    [q, upper]
  );
  const actions = useMemo(() => ACTIONS.filter((a) => !q || a.code.startsWith(upper) || a.label.toUpperCase().includes(upper)), [q, upper]);
  const directTicker = TICKER_RE.test(upper) && !commands.some((c) => c.code === upper) && !actions.some((a) => a.code === upper);

  const close = () => {
    setOpen(false);
    setTerm("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-9 w-9 items-center gap-2 rounded-md border border-gray-600 bg-gray-950 text-[13px] text-gray-500 transition-colors hover:border-gray-500 sm:w-full sm:max-w-xl sm:px-3"
        aria-label="Open command bar"
      >
        <ChevronRight className="mx-auto size-4 text-amber sm:mx-0" />
        <span className="hidden flex-1 truncate text-left sm:inline">
          Ticker or command — <span className="num text-gray-400">AAPL</span>, <span className="num text-gray-400">PORT</span>, <span className="num text-gray-400">WL</span>
        </span>
        <kbd className="num hidden rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-400 sm:inline">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} className="search-dialog" shouldFilter={false} title="Command bar" description="Open a ticker, run a command or search companies">
        <div className="search-field">
          <CommandInput value={term} onValueChange={setTerm} placeholder="AAPL ⏎ · PORT · TRADE · or search a company…" className="search-input num" />
          {loading && <Loader2 className="search-loader" />}
        </div>
        <CommandList className="search-list">
          {!loading && <CommandEmpty className="search-list-empty">No matches</CommandEmpty>}

          {directTicker && (
            <CommandGroup heading="Go">
              <CommandItem value={`go-${upper}`} onSelect={() => go(`/stocks/${encodeURIComponent(upper)}`)} className="cmd-item">
                <ArrowRight className="size-4 text-amber" />
                <span className="num font-semibold text-gray-100">{upper}</span>
                <span className="text-gray-500">open security</span>
                <kbd className="num ml-auto text-[10px] text-gray-500">GO ⏎</kbd>
              </CommandItem>
            </CommandGroup>
          )}

          {commands.length > 0 && (
            <CommandGroup heading="Functions">
              {commands.map((c) => {
                const Icon = NAV_ICONS[c.href];
                return (
                  <CommandItem key={c.code} value={`nav-${c.code}`} onSelect={() => go(c.href)} className="cmd-item">
                    <Icon className="size-4 text-gray-500" />
                    <span className="num w-12 font-semibold text-amber">{c.code}</span>
                    <span className="text-gray-100">{c.label}</span>
                    <kbd className="num ml-auto text-[10px] text-gray-500">G {c.key}</kbd>
                  </CommandItem>
                );
              })}
              {actions.map((a) => (
                <CommandItem
                  key={a.code}
                  value={`act-${a.code}`}
                  onSelect={() => {
                    close();
                    setTimeout(() => window.dispatchEvent(new Event(a.event)), 50);
                  }}
                  className="cmd-item"
                >
                  <a.icon className="size-4 text-gray-500" />
                  <span className="num w-12 font-semibold text-amber">{a.code}</span>
                  <span className="text-gray-100">{a.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {stocks.length > 0 && (
            <CommandGroup heading={q ? "Securities" : "Popular"}>
              {stocks.map((stock) => (
                <CommandItem key={stock.symbol} value={`sec-${stock.symbol}`} onSelect={() => go(`/stocks/${encodeURIComponent(stock.symbol)}`)} className="cmd-item">
                  <span className="num w-16 shrink-0 font-semibold text-gray-100">{stock.symbol}</span>
                  <span className="min-w-0 flex-1 truncate text-gray-400">{stock.name}</span>
                  <span className="num hidden text-[11px] text-gray-500 sm:inline">{stock.exchange}</span>
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
        <div className="flex items-center gap-4 border-t border-gray-600 px-4 py-2 text-[11px] text-gray-500">
          <span><kbd className="num">↑↓</kbd> navigate</span>
          <span><kbd className="num">⏎</kbd> open</span>
          <span><kbd className="num">esc</kbd> close</span>
        </div>
      </CommandDialog>
    </>
  );
}
