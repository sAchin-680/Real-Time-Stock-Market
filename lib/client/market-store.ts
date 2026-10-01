'use client';

import type { MarketStatus } from '@/lib/market-hours';
import type { LiveQuote, QuotesResponse } from '@/lib/types';

export type StreamStatus = 'idle' | 'connecting' | 'live' | 'polling' | 'offline';

export interface TickPoint {
  t: number;
  p: number;
}

interface StreamTick {
  s: string;
  p: number;
  t: number;
  v: number;
}

const HISTORY_LIMIT = 240;
const POLL_OPEN_MS = 15_000;
const POLL_CLOSED_MS = 120_000;
const POLL_STREAMING_MS = 60_000; // baseline refresh only; prices come from the stream
const RESUBSCRIBE_DEBOUNCE_MS = 300;

/** Crypto/forex pairs ("BINANCE:BTCUSDT") stream 24/7 but have no REST quote baseline. */
export const isStreamOnly = (symbol: string) => symbol.includes(':');

/**
 * Client-side market data store shared by every component on the page:
 * one EventSource for live trades and one REST poller for day baselines.
 * Exposes an immutable snapshot for useSyncExternalStore.
 */
class MarketStore {
  private refs = new Map<string, number>();
  private quotes: Record<string, LiveQuote> = {};
  private history: Record<string, TickPoint[]> = {};
  private lastDirection: Record<string, 1 | -1 | 0> = {};
  private listeners = new Set<() => void>();
  private source: EventSource | null = null;
  private streamKey = '';
  private resubTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private streamUnavailable = false;

  status: StreamStatus = 'idle';
  market: MarketStatus | null = null;
  lastUpdate: number | null = null;
  version = 0;

  snapshot = { quotes: this.quotes, history: this.history, direction: this.lastDirection, status: this.status, market: this.market, lastUpdate: this.lastUpdate };

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snapshot;

  private emit() {
    this.version++;
    this.snapshot = {
      quotes: this.quotes,
      history: this.history,
      direction: this.lastDirection,
      status: this.status,
      market: this.market,
      lastUpdate: this.lastUpdate,
    };
    for (const l of this.listeners) l();
  }

  seed(initial: Record<string, LiveQuote>) {
    let changed = false;
    for (const [s, q] of Object.entries(initial)) {
      if (!this.quotes[s]) {
        this.quotes = { ...this.quotes, [s]: q };
        this.pushHistory(s, q.price, q.timestamp * 1000 || Date.now());
        changed = true;
      }
    }
    if (changed) this.emit();
  }

  register(symbols: readonly string[]) {
    for (const s of symbols) this.refs.set(s, (this.refs.get(s) ?? 0) + 1);
    this.scheduleResubscribe();
    return () => {
      for (const s of symbols) {
        const n = (this.refs.get(s) ?? 1) - 1;
        if (n <= 0) this.refs.delete(s);
        else this.refs.set(s, n);
      }
      this.scheduleResubscribe();
    };
  }

  private pushHistory(symbol: string, price: number, t: number) {
    const prev = this.history[symbol] ?? [];
    const last = prev[prev.length - 1];
    if (last && last.p === price && t - last.t < 1000) return;
    const next = prev.length >= HISTORY_LIMIT ? [...prev.slice(prev.length - HISTORY_LIMIT + 1), { t, p: price }] : [...prev, { t, p: price }];
    this.history = { ...this.history, [symbol]: next };
  }

  private applyTicks(ticks: StreamTick[]) {
    const quotes = { ...this.quotes };
    const direction = { ...this.lastDirection };
    for (const tick of ticks) {
      const prev = quotes[tick.s];
      const prevClose = prev?.prevClose ?? 0;
      direction[tick.s] = prev ? (tick.p > prev.price ? 1 : tick.p < prev.price ? -1 : direction[tick.s] ?? 0) : 0;
      quotes[tick.s] = {
        symbol: tick.s,
        price: tick.p,
        change: prevClose ? tick.p - prevClose : 0,
        changePercent: prevClose ? ((tick.p - prevClose) / prevClose) * 100 : 0,
        high: Math.max(prev?.high ?? tick.p, tick.p),
        low: Math.min(prev?.low || tick.p, tick.p),
        open: prev?.open ?? tick.p,
        prevClose,
        timestamp: Math.floor(tick.t / 1000),
      };
      this.pushHistory(tick.s, tick.p, tick.t);
    }
    this.quotes = quotes;
    this.lastDirection = direction;
    this.lastUpdate = Date.now();
    if (this.status !== 'live') this.status = 'live';
    this.emit();
  }

  private scheduleResubscribe() {
    if (typeof window === 'undefined') return;
    if (this.resubTimer) clearTimeout(this.resubTimer);
    this.resubTimer = setTimeout(() => this.resubscribe(), RESUBSCRIBE_DEBOUNCE_MS);
  }

  private resubscribe() {
    const symbols = [...this.refs.keys()].sort();
    const key = symbols.join(',');

    if (!symbols.length) {
      this.closeStream();
      this.stopPolling();
      this.status = 'idle';
      this.emit();
      return;
    }

    if (key !== this.streamKey) {
      this.streamKey = key;
      this.openStream(symbols);
      void this.poll(); // fetch baselines for any new symbols right away
    }
    if (!this.pollTimer) this.schedulePoll();
  }

  private openStream(symbols: string[]) {
    this.closeStream();
    if (this.streamUnavailable || typeof EventSource === 'undefined') {
      this.status = 'polling';
      this.emit();
      return;
    }

    this.status = 'connecting';
    this.emit();
    const es = new EventSource(`/api/stream?symbols=${encodeURIComponent(symbols.join(','))}`);
    this.source = es;

    es.addEventListener('ticks', (e) => {
      try {
        this.applyTicks(JSON.parse((e as MessageEvent).data));
      } catch {}
    });
    es.onopen = () => {
      if (this.status !== 'live') {
        this.status = 'live';
        this.emit();
      }
    };
    es.onerror = () => {
      // CLOSED means the server refused (e.g. 503 with no API key): stop retrying, keep polling.
      if (es.readyState === EventSource.CLOSED) {
        this.streamUnavailable = true;
        this.source = null;
        this.status = 'polling';
      } else {
        this.status = 'connecting';
      }
      this.emit();
    };
  }

  private closeStream() {
    this.source?.close();
    this.source = null;
  }

  private schedulePoll() {
    const interval = this.status === 'live' ? POLL_STREAMING_MS : this.market && !this.market.isOpen ? POLL_CLOSED_MS : POLL_OPEN_MS;
    this.pollTimer = setTimeout(async () => {
      this.pollTimer = null;
      if (document.visibilityState === 'visible') await this.poll();
      if (this.refs.size) this.schedulePoll();
    }, interval);
  }

  private stopPolling() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
  }

  private async poll() {
    const symbols = [...this.refs.keys()].filter((s) => !isStreamOnly(s));
    if (!symbols.length) return;
    try {
      const res = await fetch(`/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as QuotesResponse;
      const quotes = { ...this.quotes };
      const direction = { ...this.lastDirection };
      for (const [s, q] of Object.entries(data.quotes)) {
        const live = quotes[s];
        // A streamed price newer than the REST quote wins; REST still refreshes the baseline.
        const price = live && live.timestamp > q.timestamp ? live.price : q.price;
        if (live && price !== live.price) direction[s] = price > live.price ? 1 : -1;
        quotes[s] = { ...q, price, change: price - q.prevClose, changePercent: q.prevClose ? ((price - q.prevClose) / q.prevClose) * 100 : q.changePercent };
        this.pushHistory(s, price, Date.now());
      }
      this.quotes = quotes;
      this.lastDirection = direction;
      this.market = data.market;
      this.lastUpdate = Date.now();
      if (this.status === 'offline') this.status = this.source ? 'connecting' : 'polling';
      this.emit();
    } catch {
      if (!this.source) {
        this.status = 'offline';
        this.emit();
      }
    }
  }
}

export const marketStore = new MarketStore();
