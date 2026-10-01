"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "@/components/layout/nav-icons";

const STORAGE_KEY = "signalist:sidebar-collapsed";

export const isNavActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export default function AppSidebar({ isDemo }: { isDemo?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col self-start border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[68px]" : "w-56"
      )}
    >
      <Link href="/" className={cn("flex h-14 items-center border-b border-sidebar-border", collapsed ? "justify-center" : "px-5")}>
        {collapsed ? (
          <Image src="/assets/icons/logo.svg" alt="Signalist" width={140} height={32} className="h-6 w-6 object-cover object-left" priority />
        ) : (
          <Image src="/assets/icons/logo.svg" alt="Signalist" width={140} height={32} className="h-6 w-auto" priority />
        )}
      </Link>

      <nav className="flex-1 px-2.5 py-3" aria-label="Primary">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label }) => {
            const Icon = NAV_ICONS[href];
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md py-2 text-[13px] font-medium transition-colors",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-sidebar-accent text-gray-100 shadow-[inset_2px_0_0_var(--color-yellow-400)]"
                      : "text-gray-500 hover:bg-sidebar-accent/60 hover:text-gray-100"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active && "text-yellow-400")} />
                  {!collapsed && label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="mx-2.5 mb-2 rounded-md border border-sidebar-border bg-gray-800/60 p-3 text-xs text-gray-500">
          {isDemo ? (
            <>
              <p className="font-medium text-yellow-400">Demo workspace</p>
              <p className="mt-1">Sample data, private to you. Resets after 24h.</p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-400">Live data</p>
              <p className="mt-1">Quotes refresh every 15s while the market is open.</p>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn("mb-10 flex items-center gap-2 px-5 py-2 text-xs text-gray-500 hover:text-gray-100", collapsed && "justify-center px-0")}
      >
        {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
