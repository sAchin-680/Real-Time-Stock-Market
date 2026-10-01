export type MarketSession = 'pre' | 'open' | 'post' | 'closed';

export interface MarketStatus {
  session: MarketSession;
  isOpen: boolean;
  label: string;
  /** Exchange-local date, YYYY-MM-DD (America/New_York). */
  tradingDate: string;
  reason?: 'weekend' | 'holiday';
}

// Full-day NYSE closures.
const NYSE_HOLIDAYS = new Set([
  '2025-01-01', '2025-01-09', '2025-01-20', '2025-02-17', '2025-04-18', '2025-05-26',
  '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25', '2026-06-19',
  '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18',
  '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);

// 1:00 PM ET early closes.
const NYSE_EARLY_CLOSES = new Set(['2025-11-28', '2025-12-24', '2026-11-27', '2026-12-24', '2027-11-26']);

const PRE_OPEN = 4 * 60;
const OPEN = 9 * 60 + 30;
const CLOSE = 16 * 60;
const EARLY_CLOSE = 13 * 60;
const POST_CLOSE = 20 * 60;

const nyFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function getNewYorkParts(now: Date) {
  const parts = Object.fromEntries(nyFormatter.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday as string,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** US equity market session for a given instant (regular + extended hours). */
export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const { date, weekday, minutes } = getNewYorkParts(now);

  if (weekday === 'Sat' || weekday === 'Sun') {
    return { session: 'closed', isOpen: false, label: 'Market closed', tradingDate: date, reason: 'weekend' };
  }
  if (NYSE_HOLIDAYS.has(date)) {
    return { session: 'closed', isOpen: false, label: 'Market holiday', tradingDate: date, reason: 'holiday' };
  }

  const close = NYSE_EARLY_CLOSES.has(date) ? EARLY_CLOSE : CLOSE;

  if (minutes >= OPEN && minutes < close) {
    return { session: 'open', isOpen: true, label: 'Market open', tradingDate: date };
  }
  if (minutes >= PRE_OPEN && minutes < OPEN) {
    return { session: 'pre', isOpen: false, label: 'Pre-market', tradingDate: date };
  }
  if (minutes >= close && minutes < POST_CLOSE) {
    return { session: 'post', isOpen: false, label: 'After hours', tradingDate: date };
  }
  return { session: 'closed', isOpen: false, label: 'Market closed', tradingDate: date };
}

export interface SessionCountdown {
  /** e.g. "Closes", "Opens", "Pre-market opens" */
  label: string;
  /** Milliseconds until the next session boundary. */
  ms: number;
}

/**
 * Time until the next regular-session boundary (open or close). Walks forward
 * minute-by-minute in coarse steps, so it naturally skips weekends and holidays.
 */
export function getNextSessionChange(now: Date = new Date()): SessionCountdown {
  const current = getMarketStatus(now);
  const step = 60_000;
  // Coarse 15-minute stride, then refine to the minute.
  for (let t = now.getTime() + step; t < now.getTime() + 8 * 24 * 3600_000; t += 15 * step) {
    if (getMarketStatus(new Date(t)).isOpen !== current.isOpen) {
      let lo = t - 15 * step;
      while (getMarketStatus(new Date(lo + step)).isOpen === current.isOpen) lo += step;
      const boundary = lo + step;
      // Align to the exact minute boundary.
      const aligned = boundary - (boundary % step);
      return { label: current.isOpen ? 'Closes' : 'Opens', ms: Math.max(0, aligned - now.getTime()) };
    }
  }
  return { label: 'Opens', ms: 0 };
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}
