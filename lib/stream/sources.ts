import type { UpstreamSource } from './types';

/** Finnhub's trade WebSocket (wss://ws.finnhub.io). Requires Node 22+ for the global WebSocket. */
export class FinnhubSource implements UpstreamSource {
  readonly name = 'finnhub';
  private ws: WebSocket | null = null;

  constructor(private readonly token: string) {}

  connect(h: Parameters<UpstreamSource['connect']>[0]) {
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${this.token}`);
    this.ws = ws;
    ws.onopen = () => h.onOpen();
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as { type?: string; data?: { s: string; p: number; t: number; v: number }[] };
        if (msg.type === 'trade' && Array.isArray(msg.data)) h.onTrades(msg.data);
      } catch {
        /* ignore malformed frames */
      }
    };
    const closed = (reason: string) => {
      if (this.ws !== ws) return;
      this.ws = null;
      h.onClose(reason);
    };
    ws.onclose = () => closed('closed');
    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
      closed('error');
    };
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }
  subscribe(symbol: string) {
    this.send({ type: 'subscribe', symbol });
  }
  unsubscribe(symbol: string) {
    this.send({ type: 'unsubscribe', symbol });
  }
  close() {
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {}
  }
}

/**
 * Deterministic-rate synthetic feed for benchmarks and local development:
 * a random walk per subscribed symbol at `tradesPerSecond`, stamped with the
 * real wall-clock time so latency measurements are meaningful.
 */
export class SyntheticSource implements UpstreamSource {
  readonly name = 'synthetic';
  private timer: ReturnType<typeof setInterval> | null = null;
  private symbols = new Map<string, number>();

  constructor(private readonly tradesPerSecond = 10) {}

  connect(h: Parameters<UpstreamSource['connect']>[0]) {
    queueMicrotask(() => h.onOpen());
    const period = Math.max(5, Math.round(1000 / this.tradesPerSecond));
    this.timer = setInterval(() => {
      if (!this.symbols.size) return;
      const now = Date.now();
      const trades = [];
      for (const [s, price] of this.symbols) {
        const next = Math.max(0.01, price * (1 + (Math.random() - 0.5) * 0.002));
        this.symbols.set(s, next);
        trades.push({ s, p: Math.round(next * 100) / 100, t: now, v: Math.ceil(Math.random() * 500) });
      }
      h.onTrades(trades);
    }, period);
  }
  subscribe(symbol: string) {
    if (!this.symbols.has(symbol)) this.symbols.set(symbol, 50 + Math.random() * 450);
  }
  unsubscribe(symbol: string) {
    this.symbols.delete(symbol);
  }
  close() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
