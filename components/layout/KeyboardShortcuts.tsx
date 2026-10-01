"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const OPEN_SEARCH_EVENT = "tickline:open-search";
export const OPEN_TRADE_EVENT = "tickline:open-trade";
export const OPEN_HELP_EVENT = "tickline:open-help";

const GOTO: Record<string, { href: string; label: string }> = {
  d: { href: "/", label: "Dashboard" },
  p: { href: "/portfolio", label: "Portfolio" },
  w: { href: "/watchlist", label: "Watchlist" },
  a: { href: "/alerts", label: "Alerts" },
  m: { href: "/markets", label: "Markets" },
};

const SHORTCUTS: [string[], string][] = [
  [["⌘", "K"], "Command bar"],
  [["/"], "Command bar"],
  [["T"], "New trade"],
  ...Object.entries(GOTO).map(([k, v]) => [["G", k.toUpperCase()], `Go to ${v.label}`] as [string[], string]),
  [["?"], "Show shortcuts"],
];

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

/** Global keyboard navigation (vim-style "g" chords) and a help sheet. */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (document.querySelector("[role=dialog]") && e.key !== "?") return;
      const key = e.key.toLowerCase();

      if (pendingG.current !== null) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        if (GOTO[key]) {
          e.preventDefault();
          router.push(GOTO[key].href);
        }
        return;
      }

      if (key === "g") {
        pendingG.current = window.setTimeout(() => (pendingG.current = null), 1200);
      } else if (key === "/") {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
      } else if (key === "t") {
        e.preventDefault();
        window.dispatchEvent(new Event(OPEN_TRADE_EVENT));
      } else if (e.key === "?") {
        e.preventDefault();
        setHelp((v) => !v);
      }
    };
    const onHelp = () => setHelp(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_HELP_EVENT, onHelp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_HELP_EVENT, onHelp);
    };
  }, [router]);

  return (
    <Dialog open={help} onOpenChange={setHelp}>
      <DialogContent className="border-gray-600 bg-gray-800 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Keyboard shortcuts</DialogTitle>
          <DialogDescription>Move around without leaving the keyboard.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-gray-600/50 text-sm">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label + keys.join()} className="flex items-center justify-between py-2">
              <span className="text-gray-400">{label}</span>
              <span className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="num min-w-6 rounded border border-gray-600 bg-gray-900 px-1.5 py-0.5 text-center text-xs text-gray-100">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
