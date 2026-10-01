import 'server-only';

import { getFinnhubToken } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface Tick {
  /** Symbol as subscribed (e.g. "AAPL", "BINANCE:BTCUSDT"). */
  s: string;
  /** Last trade price. */
  p: number;
  /** Trade time, epoch ms. */
  t: number;
  /** Volume of the batched trades. */
  v: number;
}

type Listener = (ticks: Tick[]) => void;

const WS_URL = 'wss://ws.finnhub.io';
const MAX_SYMBOLS = 50; // Finnhub free-tier subscription cap
const IDLE_CLOSE_MS = 30_000;

/**
 * One upstream Finnhub WebSocket per server instance, fanned out to many
 * browser connections. Subscriptions are reference counted so a symbol is only
 * unsubscribed upstream when the last viewer leaves.
 */
class StreamHub {
  private ws: WebSocket | null = null;
  private connecting = false;
  private retry = 0;
  private refCounts = new Map<string, number>();
  private listeners = new Set<{ symbols: Set<string>; fn: Listener }>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPrice = new Map<string, Tick>();

  get available() {
    return Boolean(getFinnhubToken()) && typeof WebSocket !== 'undefined';
  }

  /** Latest known trade for each requested symbol (sent to new subscribers immediately). */
  snapshot(symbols: Iterable<string>): Tick[] {
    const out: Tick[] = [];
    for (const s of symbols) {
      const tick = this.lastPrice.get(s);
      if (tick) out.push(tick);
    }
    return out;
  }

  subscribe(symbols: string[], fn: Listener): () => void {
    const wanted = new Set(symbols.slice(0, MAX_SYMBOLS));
    const entry = { symbols: wanted, fn };
    this.listeners.add(entry);
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    for (const s of wanted) {
      const n = this.refCounts.get(s) ?? 0;
      this.refCounts.set(s, n + 1);
      if (n === 0) this.send({ type: 'subscribe', symbol: s });
    }
    this.connect();

    return () => {
      this.listeners.delete(entry);
      for (const s of wanted) {
        const n = (this.refCounts.get(s) ?? 1) - 1;
        if (n <= 0) {
          this.refCounts.delete(s);
          this.send({ type: 'unsubscribe', symbol: s });
        } else this.refCounts.set(s, n);
      }
      if (!this.listeners.size) {
        this.idleTimer = setTimeout(() => this.close(), IDLE_CLOSE_MS);
      }
    };
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private connect() {
    if (!this.available || this.ws || this.connecting) return;
    this.connecting = true;

    const ws = new WebSocket(`${WS_URL}?token=${getFinnhubToken()}`);
    this.ws = ws;

    ws.onopen = () => {
      this.connecting = false;
      this.retry = 0;
      for (const s of this.refCounts.keys()) this.send({ type: 'subscribe', symbol: s });
      logger.info('stream.upstream_connected', { symbols: this.refCounts.size });
    };

    ws.onmessage = (event) => {
      let msg: { type?: string; data?: { s: string; p: number; t: number; v: number }[] };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;

      // Collapse a burst of trades into the latest print per symbol.
      const latest = new Map<string, Tick>();
      for (const d of msg.data) {
        if (!(d.p > 0)) continue;
        const prev = latest.get(d.s);
        latest.set(d.s, { s: d.s, p: d.p, t: d.t, v: (prev?.v ?? 0) + (d.v ?? 0) });
      }
      const ticks = [...latest.values()];
      for (const tick of ticks) this.lastPrice.set(tick.s, tick);

      for (const l of this.listeners) {
        const relevant = ticks.filter((t) => l.symbols.has(t.s));
        if (relevant.length) l.fn(relevant);
      }
    };

    const reset = (reason: string) => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connecting = false;
      if (!this.listeners.size) return;
      const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
      logger.warn('stream.upstream_reconnect', { reason, delayMs: delay });
      setTimeout(() => this.connect(), delay);
    };
    ws.onclose = () => reset('closed');
    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
      reset('error');
    };
  }

  private close() {
    if (this.listeners.size) return;
    const ws = this.ws;
    this.ws = null;
    this.connecting = false;
    try {
      ws?.close();
    } catch {}
  }
}

declare global {
  var __ticklineStreamHub: StreamHub | undefined;
}

/** Survives dev hot reloads so we never open duplicate upstream sockets. */
export const streamHub: StreamHub = (globalThis.__ticklineStreamHub ??= new StreamHub());
