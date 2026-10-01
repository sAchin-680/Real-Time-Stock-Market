export type AlertCondition = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PCT_UP' | 'PCT_DOWN';
export type AlertFrequency = 'ONCE' | 'DAILY';

export const ALERT_CONDITIONS: { value: AlertCondition; label: string; unit: '$' | '%' }[] = [
  { value: 'PRICE_ABOVE', label: 'Price rises above', unit: '$' },
  { value: 'PRICE_BELOW', label: 'Price falls below', unit: '$' },
  { value: 'PCT_UP', label: 'Day gain exceeds', unit: '%' },
  { value: 'PCT_DOWN', label: 'Day loss exceeds', unit: '%' },
];

export const ALERT_FREQUENCIES: { value: AlertFrequency; label: string }[] = [
  { value: 'ONCE', label: 'Once, then pause' },
  { value: 'DAILY', label: 'At most once per day' },
];

export interface AlertQuote {
  price: number;
  changePercent: number;
}

export function isAlertTriggered(condition: AlertCondition, threshold: number, quote: AlertQuote): boolean {
  if (!(quote.price > 0)) return false;
  switch (condition) {
    case 'PRICE_ABOVE':
      return quote.price >= threshold;
    case 'PRICE_BELOW':
      return quote.price <= threshold;
    case 'PCT_UP':
      return quote.changePercent >= threshold;
    case 'PCT_DOWN':
      return quote.changePercent <= -Math.abs(threshold);
  }
}

/**
 * Whether an alert is allowed to fire now given its frequency.
 * `tradingDate` is the exchange-local date (YYYY-MM-DD) used for daily de-duplication.
 */
export function canAlertFire(
  alert: { active: boolean; frequency: AlertFrequency; lastTriggeredTradingDate?: string | null },
  tradingDate: string
): boolean {
  if (!alert.active) return false;
  if (alert.frequency === 'DAILY') return alert.lastTriggeredTradingDate !== tradingDate;
  return true; // ONCE alerts are deactivated after firing.
}

export function describeAlert(condition: AlertCondition, threshold: number): string {
  switch (condition) {
    case 'PRICE_ABOVE':
      return `Price ≥ $${threshold.toFixed(2)}`;
    case 'PRICE_BELOW':
      return `Price ≤ $${threshold.toFixed(2)}`;
    case 'PCT_UP':
      return `Day change ≥ +${threshold}%`;
    case 'PCT_DOWN':
      return `Day change ≤ -${Math.abs(threshold)}%`;
  }
}

/** How far the current quote is from triggering, as a signed percentage of the price (price alerts only). */
export function distanceToTrigger(condition: AlertCondition, threshold: number, price: number): number | null {
  if (!(price > 0)) return null;
  if (condition === 'PRICE_ABOVE' || condition === 'PRICE_BELOW') return ((threshold - price) / price) * 100;
  return null;
}
