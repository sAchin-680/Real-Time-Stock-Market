import type { HubStats, Tick, UpstreamSource } from './types';

type Listener = (ticks: Tick[]) => void;

export interface StreamHubOptions {
  /** Max symbols one subscriber may request (Finnhub free tier allows 50 upstream). */
  maxSymbols?: number;
  /** Close the upstream this long after the last subscriber leaves. */
  idleCloseMs?: number;
  onLog?: (event: string, ctx?: Record<string, unknown>) => void;
}

/**
 * Fans one upstream market-data connection out to many subscribers.
 *
 * - Subscriptions are reference counted: a symbol is subscribed upstream when
 *   the first viewer asks for it and unsubscribed when the last one leaves.
 * - Bursts of trades are coalesced to the latest print per symbol and stamped
 *   with the server receive time (`r`), which is what latency is measured from.
 * - The upstream reconnects with exponential backoff (1s → 30s) while anyone is listening.
 *
 * Framework-free on purpose: the Next.js route and the standalone relay share it.
 */
export class StreamHub {
  private refCounts = new Map<string, number>();
  private listeners = new Set<{ symbols: Set<string>; fn: Listener }>();
  private lastPrice = new Map<string, Tick>();
  private connected = false;
  private connecting = false;
  private retry = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private counters = { ticksIn: 0, ticksOut: 0, reconnects: 0 };
  private readonly startedAt = new Date().toISOString();
  private readonly maxSymbols: number;
  private readonly idleCloseMs: number;
  private readonly log: NonNullable<StreamHubOptions['onLog']>;

  constructor(
    private readonly source: UpstreamSource,
    options: StreamHubOptions = {}
  ) {
    this.maxSymbols = options.maxSymbols ?? 50;
    this.idleCloseMs = options.idleCloseMs ?? 30_000;
    this.log = options.onLog ?? (() => {});
  }

  stats(): HubStats {
    return {
      source: this.source.name,
      upstreamConnected: this.connected,
      subscribers: this.listeners.size,
      upstreamSymbols: this.refCounts.size,
      ...this.counters,
      startedAt: this.startedAt,
    };
  }

  /** Latest known trade for each requested symbol, sent to new subscribers immediately. */
  snapshot(symbols: Iterable<string>): Tick[] {
    const out: Tick[] = [];
    for (const s of symbols) {
      const tick = this.lastPrice.get(s);
      if (tick) out.push(tick);
    }
    return out;
  }

  subscribe(symbols: readonly string[], fn: Listener): () => void {
    const wanted = new Set(symbols.slice(0, this.maxSymbols));
    const entry = { symbols: wanted, fn };
    this.listeners.add(entry);
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    for (const s of wanted) {
      const n = this.refCounts.get(s) ?? 0;
      this.refCounts.set(s, n + 1);
      if (n === 0 && this.connected) this.source.subscribe(s);
    }
    this.connect();

    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.listeners.delete(entry);
      for (const s of wanted) {
        const n = (this.refCounts.get(s) ?? 1) - 1;
        if (n <= 0) {
          this.refCounts.delete(s);
          if (this.connected) this.source.unsubscribe(s);
        } else this.refCounts.set(s, n);
      }
      if (!this.listeners.size) this.idleTimer = setTimeout(() => this.disconnect(), this.idleCloseMs);
    };
  }

  private connect() {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    this.source.connect({
      onOpen: () => {
        this.connecting = false;
        this.connected = true;
        this.retry = 0;
        for (const s of this.refCounts.keys()) this.source.subscribe(s);
        this.log('stream.upstream_connected', { source: this.source.name, symbols: this.refCounts.size });
      },
      onTrades: (trades) => this.ingest(trades),
      onClose: (reason) => {
        const wasUp = this.connected || this.connecting;
        this.connected = false;
        this.connecting = false;
        if (!wasUp || !this.listeners.size) return;
        const delay = Math.min(30_000, 1000 * 2 ** this.retry++);
        this.counters.reconnects++;
        this.log('stream.upstream_reconnect', { reason, delayMs: delay });
        this.retryTimer = setTimeout(() => this.connect(), delay);
      },
    });
  }

  private ingest(trades: { s: string; p: number; t: number; v: number }[]) {
    const r = Date.now();
    const latest = new Map<string, Tick>();
    for (const d of trades) {
      if (!(d.p > 0)) continue;
      const prev = latest.get(d.s);
      latest.set(d.s, { s: d.s, p: d.p, t: d.t, v: (prev?.v ?? 0) + (d.v ?? 0), r });
    }
    const ticks = [...latest.values()];
    this.counters.ticksIn += ticks.length;
    for (const tick of ticks) this.lastPrice.set(tick.s, tick);

    for (const l of this.listeners) {
      const relevant = ticks.filter((t) => l.symbols.has(t.s));
      if (relevant.length) {
        this.counters.ticksOut += relevant.length;
        l.fn(relevant);
      }
    }
  }

  private disconnect() {
    if (this.listeners.size) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.connected = false;
    this.connecting = false;
    this.source.close();
    this.log('stream.upstream_idle_closed');
  }
}
