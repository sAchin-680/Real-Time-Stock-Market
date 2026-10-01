"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/Logo";
import { NAV_ICONS } from "@/components/layout/nav-icons";

export const isNavActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

/** Slim icon rail with mnemonic codes, terminal style. */
export default function AppRail({ isDemo }: { isDemo?: boolean }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-[68px] shrink-0 flex-col items-center self-start border-r border-sidebar-border bg-sidebar lg:flex">
      <Link href="/" className="flex h-12 w-full items-center justify-center border-b border-sidebar-border" aria-label="Tickline home">
        <LogoMark size={26} />
      </Link>

      <nav className="flex w-full flex-1 flex-col gap-1 px-2 py-3" aria-label="Primary">
        {NAV_ITEMS.map(({ href, label, code }) => {
          const Icon = NAV_ICONS[href];
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              title={`${label} (${code})`}
              className={cn(
                "group relative flex flex-col items-center gap-1 rounded-md py-2 transition-colors",
                active ? "bg-sidebar-accent text-gray-100" : "text-gray-500 hover:bg-sidebar-accent/60 hover:text-gray-100"
              )}
            >
              {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-gray-100" />}
              <Icon className={cn("size-[18px]", active && "text-gray-100")} />
              <span className={cn("num text-[9px] font-semibold tracking-wider", active ? "text-gray-100" : "text-gray-500")}>{code}</span>
            </Link>
          );
        })}
      </nav>

      {isDemo && (
        <span className="num mb-3 rounded border border-gray-600 bg-gray-700 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-gray-400" title="Demo workspace: sample data, private to you, resets after 24h">
          DEMO
        </span>
      )}
    </aside>
  );
}
