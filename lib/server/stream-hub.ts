import 'server-only';

import { getFinnhubToken } from '@/lib/env';
import { logger } from '@/lib/logger';
import { StreamHub } from '@/lib/stream/hub';
import { FinnhubSource, SyntheticSource } from '@/lib/stream/sources';

export type { Tick } from '@/lib/stream/types';

/**
 * Process-wide hub. STREAM_SOURCE=synthetic swaps Finnhub for a generated feed
 * (benchmarks, offline development); never set it in production.
 */
function createHub() {
  const synthetic = process.env.STREAM_SOURCE === 'synthetic';
  const source = synthetic ? new SyntheticSource(Number(process.env.SYNTHETIC_TPS) || 10) : new FinnhubSource(getFinnhubToken());
  return new StreamHub(source, { onLog: (event, ctx) => logger.info(event, ctx) });
}

declare global {
  var __ticklineStreamHub: StreamHub | undefined;
}

/** Survives dev hot reloads so we never open duplicate upstream sockets. */
export const streamHub: StreamHub = (globalThis.__ticklineStreamHub ??= createHub());

export const isStreamingAvailable = () =>
  typeof WebSocket !== 'undefined' && (process.env.STREAM_SOURCE === 'synthetic' || Boolean(getFinnhubToken()));
