import { afterEach, describe, expect, it, vi } from 'vitest';
import { StreamHub } from '@/lib/stream/hub';
import { createSseStream, parseSymbols } from '@/lib/stream/sse';
import type { Tick, UpstreamSource } from '@/lib/stream/types';

type Handlers = Parameters<UpstreamSource['connect']>[0];

class FakeSource implements UpstreamSource {
  readonly name = 'fake';
  handlers: Handlers | null = null;
  subscribed = new Set<string>();
  calls: string[] = [];
  connects = 0;
  connect(h: Handlers) {
    this.connects++;
    this.handlers = h;
  }
  open() {
    this.handlers!.onOpen();
  }
  trades(trades: { s: string; p: number; t?: number; v?: number }[]) {
    this.handlers!.onTrades(trades.map((t) => ({ t: 1, v: 1, ...t })));
  }
  subscribe(s: string) {
    this.subscribed.add(s);
    this.calls.push(`+${s}`);
  }
  unsubscribe(s: string) {
    this.subscribed.delete(s);
    this.calls.push(`-${s}`);
  }
  close() {
    this.calls.push('close');
  }
}

afterEach(() => vi.useRealTimers());

describe('StreamHub', () => {
  it('reference-counts upstream subscriptions across subscribers', () => {
    const src = new FakeSource();
    const hub = new StreamHub(src);
    const a = hub.subscribe(['AAPL', 'MSFT'], () => {});
    src.open();
    const b = hub.subscribe(['AAPL'], () => {});
    expect([...src.subscribed].sort()).toEqual(['AAPL', 'MSFT']);
    expect(src.calls.filter((c) => c === '+AAPL')).toHaveLength(1);
    a();
    expect([...src.subscribed]).toEqual(['AAPL']);
    b();
    expect(src.subscribed.size).toBe(0);
    expect(src.connects).toBe(1);
  });

  it('coalesces bursts to the latest print, stamps receive time and routes by symbol', () => {
    vi.useFakeTimers().setSystemTime(1_000);
    const src = new FakeSource();
    const hub = new StreamHub(src);
    const got: Tick[][] = [];
    hub.subscribe(['AAPL'], (t) => got.push(t));
    src.open();
    src.trades([
      { s: 'AAPL', p: 1, v: 2 },
      { s: 'AAPL', p: 2, v: 3 },
      { s: 'MSFT', p: 9 },
    ]);
    expect(got).toEqual([[{ s: 'AAPL', p: 2, t: 1, v: 5, r: 1_000 }]]);
    expect(hub.snapshot(['AAPL', 'MSFT']).map((t) => t.s)).toEqual(['AAPL', 'MSFT']);
    expect(hub.stats()).toMatchObject({ ticksIn: 2, ticksOut: 1, subscribers: 1, upstreamSymbols: 1 });
  });

  it('reconnects with exponential backoff while subscribers remain', () => {
    vi.useFakeTimers();
    const src = new FakeSource();
    const hub = new StreamHub(src);
    hub.subscribe(['AAPL'], () => {});
    src.open();
    src.handlers!.onClose('error');
    expect(src.connects).toBe(1);
    vi.advanceTimersByTime(1_000);
    expect(src.connects).toBe(2);
    src.handlers!.onClose('error'); // still connecting → 2s backoff
    vi.advanceTimersByTime(1_999);
    expect(src.connects).toBe(2);
    vi.advanceTimersByTime(1);
    expect(src.connects).toBe(3);
    src.open();
    expect(src.subscribed.has('AAPL')).toBe(true); // resubscribed after reconnect
    expect(hub.stats().reconnects).toBe(2);
  });

  it('closes the upstream after the idle timeout', () => {
    vi.useFakeTimers();
    const src = new FakeSource();
    const hub = new StreamHub(src, { idleCloseMs: 5_000 });
    const off = hub.subscribe(['AAPL'], () => {});
    src.open();
    off();
    off(); // idempotent
    vi.advanceTimersByTime(4_999);
    expect(src.calls).not.toContain('close');
    vi.advanceTimersByTime(1);
    expect(src.calls).toContain('close');
  });
});

describe('createSseStream', () => {
  it('sends retry, snapshot and batched ticks, then unsubscribes on abort', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    const src = new FakeSource();
    const hub = new StreamHub(src);
    const warm = hub.subscribe(['AAPL'], () => {});
    src.open();
    src.trades([{ s: 'AAPL', p: 100 }]);
    warm();

    const ctrl = new AbortController();
    const reader = createSseStream(hub, ['AAPL'], { flushMs: 100, signal: ctrl.signal }).getReader();
    const dec = new TextDecoder();
    const read = async () => dec.decode((await reader.read()).value);

    expect(await read()).toBe('retry: 1000\n\n');
    const snap = await read();
    expect(snap).toMatch(/^event: snapshot\n/);
    expect(snap).toContain('"p":100');
    src.trades([{ s: 'AAPL', p: 101 }]);
    src.trades([{ s: 'AAPL', p: 102 }]);
    vi.advanceTimersByTime(100);
    const batch = await read();
    expect(batch).toContain('"p":102');
    expect(batch).not.toContain('"p":101');
    ctrl.abort();
    expect(hub.stats().subscribers).toBe(0);
    expect((await reader.read()).done).toBe(true);
  });

  it('skips flushes while a slow client is behind, then catches up with the newest price', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    const src = new FakeSource();
    const hub = new StreamHub(src);
    const stream = createSseStream(hub, ['AAPL'], { flushMs: 100, heartbeatMs: 60_000 });
    const reader = stream.getReader();
    await reader.read(); // retry
    src.open();
    // Don't read: fill the client queue (high-water mark 16) with 30 flushes.
    for (let i = 1; i <= 30; i++) {
      src.trades([{ s: 'AAPL', p: i }]);
      vi.advanceTimersByTime(100);
    }
    const dec = new TextDecoder();
    const chunks: string[] = [];
    for (let i = 0; i < 16; i++) chunks.push(dec.decode((await reader.read()).value));
    expect(chunks.every((c) => c.startsWith('event: ticks'))).toBe(true); // queue capped at 16, not 30
    vi.advanceTimersByTime(100); // space freed → next flush delivers the newest price
    expect(dec.decode((await reader.read()).value)).toContain('"p":30');
    await reader.cancel();
  });

  it('announces rotation before its lifetime ends, then closes', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] });
    const src = new FakeSource();
    const hub = new StreamHub(src);
    const reader = createSseStream(hub, ['AAPL'], { lifetimeMs: 10_000, rotateBeforeMs: 3_000, heartbeatMs: 60_000 }).getReader();
    const dec = new TextDecoder();
    await reader.read(); // retry
    vi.advanceTimersByTime(7_000);
    expect(dec.decode((await reader.read()).value)).toBe('event: rotate\ndata: {}\n\n');
    vi.advanceTimersByTime(3_000);
    expect((await reader.read()).done).toBe(true);
    expect(hub.stats().subscribers).toBe(0);
  });

  it('parses and caps symbols', () => {
    expect(parseSymbols(' aapl,MSFT,aapl,<x>,BINANCE:BTCUSDT')).toEqual(['AAPL', 'MSFT', 'BINANCE:BTCUSDT']);
    expect(parseSymbols(null)).toEqual([]);
    expect(parseSymbols(Array.from({ length: 80 }, (_, i) => `S${i}`).join(','), 50)).toHaveLength(50);
  });
});
