"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal";
import { cn } from "@/lib/utils";

export default function LegalNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Legal" className="md:sticky md:top-24 md:self-start">
      <p className="label mb-3">Legal</p>
      <ul className="flex gap-2 md:flex-col md:gap-1">
        {LEGAL_PAGES.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              aria-current={pathname === p.href ? "page" : undefined}
              className={cn(
                "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                pathname === p.href ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:text-gray-100"
              )}
            >
              {p.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
