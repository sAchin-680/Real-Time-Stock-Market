"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { isNavActive } from "@/components/layout/AppSidebar";

/** Compact navigation used inside the mobile user menu. */
const NavItems = () => {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1 p-1 font-medium">
      {NAV_ITEMS.map(({ href, label }) => {
        const Icon = NAV_ICONS[href];
        return (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:text-yellow-400",
                isNavActive(pathname, href) ? "text-gray-100" : "text-gray-500"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
export default NavItems;
