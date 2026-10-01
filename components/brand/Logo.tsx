import { cn } from "@/lib/utils";

/** Tickline mark: a price tick rising off a baseline, on an amber tile. */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#F5A524" />
      <path d="M6.5 22.5h19" stroke="#0A0C10" strokeOpacity=".28" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6.5 19.5 12 14l4.2 3.6L25.5 8.5" fill="none" stroke="#0A0C10" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.5" cy="8.5" r="2.4" fill="#0A0C10" />
    </svg>
  );
}

export function Logo({ size = 24, className, compact = false }: { size?: number; className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-gray-100">
          Tick<span className="text-amber">line</span>
        </span>
      )}
    </span>
  );
}

export const BRAND = {
  name: "Tickline",
  tagline: "The real-time terminal for your portfolio",
} as const;
