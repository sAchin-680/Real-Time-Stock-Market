import { describe, expect, it } from 'vitest';
import { canAlertFire, describeAlert, distanceToTrigger, isAlertTriggered } from '@/lib/finance/alerts';

describe('isAlertTriggered', () => {
  const q = { price: 100, changePercent: -3 };
  it.each([
    ['PRICE_ABOVE', 99, true],
    ['PRICE_ABOVE', 101, false],
    ['PRICE_BELOW', 100, true],
    ['PRICE_BELOW', 90, false],
    ['PCT_UP', 2, false],
    ['PCT_DOWN', 3, true],
    ['PCT_DOWN', 5, false],
  ] as const)('%s %d → %s', (condition, threshold, expected) => {
    expect(isAlertTriggered(condition, threshold, q)).toBe(expected);
  });

  it('never triggers without a valid price', () => {
    expect(isAlertTriggered('PRICE_BELOW', 10, { price: 0, changePercent: 0 })).toBe(false);
  });
});

describe('canAlertFire', () => {
  it('blocks inactive alerts', () => {
    expect(canAlertFire({ active: false, frequency: 'ONCE' }, '2026-10-01')).toBe(false);
  });
  it('de-duplicates daily alerts per trading date', () => {
    const alert = { active: true, frequency: 'DAILY' as const, lastTriggeredTradingDate: '2026-10-01' };
    expect(canAlertFire(alert, '2026-10-01')).toBe(false);
    expect(canAlertFire(alert, '2026-10-02')).toBe(true);
  });
});

describe('describeAlert / distanceToTrigger', () => {
  it('formats conditions', () => {
    expect(describeAlert('PRICE_ABOVE', 150)).toBe('Price ≥ $150.00');
    expect(describeAlert('PCT_DOWN', 5)).toBe('Day change ≤ -5%');
  });
  it('returns signed distance for price alerts only', () => {
    expect(distanceToTrigger('PRICE_ABOVE', 110, 100)).toBeCloseTo(10);
    expect(distanceToTrigger('PCT_UP', 5, 100)).toBeNull();
  });
});
