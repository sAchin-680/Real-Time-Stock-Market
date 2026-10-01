import { describe, expect, it } from 'vitest';
import { getMarketStatus } from '@/lib/market-hours';

// 2026-10-01 is a Thursday; New York is UTC-4 (EDT).
const at = (iso: string) => getMarketStatus(new Date(iso));

describe('getMarketStatus', () => {
  it('detects the regular session', () => {
    expect(at('2026-10-01T13:30:00Z').session).toBe('open');
    expect(at('2026-10-01T19:59:00Z').isOpen).toBe(true);
  });
  it('detects pre-market and after-hours', () => {
    expect(at('2026-10-01T12:00:00Z').session).toBe('pre');
    expect(at('2026-10-01T20:00:00Z').session).toBe('post');
    expect(at('2026-10-02T01:00:00Z').session).toBe('closed');
  });
  it('is closed on weekends and holidays', () => {
    expect(at('2026-10-03T15:00:00Z')).toMatchObject({ isOpen: false, reason: 'weekend' });
    expect(at('2026-11-26T15:00:00Z')).toMatchObject({ isOpen: false, reason: 'holiday' });
  });
  it('honours early closes', () => {
    // Day after Thanksgiving closes at 1pm ET (18:00Z in EST).
    expect(at('2026-11-27T17:30:00Z').isOpen).toBe(true);
    expect(at('2026-11-27T18:30:00Z').session).toBe('post');
  });
  it('reports the exchange-local trading date', () => {
    expect(at('2026-10-02T02:00:00Z').tradingDate).toBe('2026-10-01');
  });
});

import { formatDuration, getNextSessionChange } from '@/lib/market-hours';

describe('getNextSessionChange', () => {
  it('counts down to the close during the session', () => {
    const c = getNextSessionChange(new Date('2026-10-01T18:00:00Z')); // 2:00pm ET
    expect(c.label).toBe('Closes');
    expect(formatDuration(c.ms)).toBe('2h 0m');
  });
  it('counts down to the next open across a weekend', () => {
    const c = getNextSessionChange(new Date('2026-10-02T21:00:00Z')); // Fri 5pm ET
    expect(c.label).toBe('Opens');
    expect(formatDuration(c.ms)).toBe('2d 16h'); // Mon 9:30am ET
  });
  it('skips holidays', () => {
    const c = getNextSessionChange(new Date('2026-11-25T21:00:00Z')); // Wed before Thanksgiving
    expect(c.label).toBe('Opens');
    expect(c.ms).toBeGreaterThan(36 * 3600_000); // Friday, not Thursday
  });
});
