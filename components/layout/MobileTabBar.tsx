"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { isNavActive } from "@/components/layout/AppRail";

/** Bottom tab bar on small screens. */
export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-600 bg-gray-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Primary">
      {NAV_ITEMS.map(({ href, label }) => {
        const Icon = NAV_ICONS[href];
        const active = isNavActive(pathname, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2 text-[10px] font-medium", active ? "text-amber" : "text-gray-500")}>
            <Icon className="size-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
