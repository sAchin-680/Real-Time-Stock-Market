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
