export interface Tick {
  /** Symbol as subscribed (e.g. "AAPL", "BINANCE:BTCUSDT"). */
  s: string;
  /** Last trade price. */
  p: number;
  /** Exchange trade time, epoch ms. */
  t: number;
  /** Volume of the coalesced trades. */
  v: number;
  /** Server receive time, epoch ms: when the trade reached our hub. Used to measure delivery latency. */
  r: number;
}

/** A market data feed the hub can subscribe symbols on. */
export interface UpstreamSource {
  readonly name: string;
  /** Opens the feed; `onTrades` receives raw trades, `onState` connection changes. */
  connect(handlers: {
    onTrades: (trades: { s: string; p: number; t: number; v: number }[]) => void;
    onOpen: () => void;
    onClose: (reason: string) => void;
  }): void;
  subscribe(symbol: string): void;
  unsubscribe(symbol: string): void;
  close(): void;
}

export interface HubStats {
  source: string;
  upstreamConnected: boolean;
  subscribers: number;
  upstreamSymbols: number;
  ticksIn: number;
  ticksOut: number;
  reconnects: number;
  startedAt: string;
}
