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
