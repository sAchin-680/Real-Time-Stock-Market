"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "@/components/layout/nav-icons";

export const isNavActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export default function AppSidebar({ isDemo }: { isDemo?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Link href="/" className="flex h-16 items-center px-6">
        <Image src="/assets/icons/logo.svg" alt="Signalist" width={140} height={32} className="h-7 w-auto" priority />
      </Link>

      <nav className="flex-1 px-3 py-4" aria-label="Primary">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const Icon = NAV_ICONS[href];
            const active = isNavActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-gray-100 shadow-[inset_2px_0_0_var(--color-yellow-400)]"
                      : "text-gray-500 hover:bg-sidebar-accent/60 hover:text-gray-100"
                  )}
                >
                  <Icon className={cn("size-4", active && "text-yellow-400")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-lg border border-sidebar-border bg-gray-800/60 p-3 text-xs text-gray-500">
        {isDemo ? (
          <>
            <p className="font-medium text-yellow-400">Demo workspace</p>
            <p className="mt-1">Sample data, private to you. Resets after 24h.</p>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-400">Market data</p>
            <p className="mt-1">Quotes refresh every 15s during market hours.</p>
          </>
        )}
      </div>
    </aside>
  );
}
