/**
 * Tickline stream relay — a long-running service that holds ONE upstream market
 * data connection and fans it out to every browser over Server-Sent Events.
 *
 * Why: on serverless (Vercel) each function instance has its own hub and every
 * stream is cut off at the function's max duration. A single long-lived process
 * removes both limits. Deploy with relay/Dockerfile (Fly.io config: fly.toml).
 *
 *   GET /stream?symbols=AAPL,MSFT&token=<signed>   SSE (events: ticks, rotate)
 *   GET /healthz                                     liveness + hub stats
 *
 * Env: STREAM_TOKEN_SECRET (required), FINNHUB_API_KEY, ALLOWED_ORIGINS
 *      (comma-separated app origins), PORT (8080), STREAM_SOURCE=synthetic for tests.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { StreamHub } from '../lib/stream/hub';
import { FinnhubSource, SyntheticSource } from '../lib/stream/sources';
import { SSE_HEADERS, createSseStream, parseSymbols } from '../lib/stream/sse';
import { verifyStreamToken } from '../lib/stream/token';

const PORT = Number(process.env.PORT) || 8080;
const SECRET = process.env.STREAM_TOKEN_SECRET || '';
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
const MAX_STREAMS_PER_USER = Number(process.env.MAX_STREAMS_PER_USER) || 20;

if (!SECRET) {
  console.error('STREAM_TOKEN_SECRET is required');
  process.exit(1);
}

const log = (event: string, ctx: Record<string, unknown> = {}) => console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...ctx }));

const source =
  process.env.STREAM_SOURCE === 'synthetic'
    ? new SyntheticSource(Number(process.env.SYNTHETIC_TPS) || 10)
    : new FinnhubSource(process.env.FINNHUB_API_KEY || '');
const hub = new StreamHub(source, { onLog: log });
const perUser = new Map<string, number>();
const open = new Set<AbortController>();
let draining = false;

function cors(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
}

const json = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://relay');
  cors(req, res);

  if (url.pathname === '/healthz') {
    const mem = process.memoryUsage();
    return json(res, draining ? 503 : 200, {
      status: draining ? 'draining' : 'ok',
      stream: hub.stats(),
      memory: { rssMb: +(mem.rss / 2 ** 20).toFixed(1), heapUsedMb: +(mem.heapUsed / 2 ** 20).toFixed(1) },
      uptimeSeconds: Math.round(process.uptime()),
    });
  }

  if (url.pathname !== '/stream' || req.method !== 'GET') return json(res, 404, { error: 'Not found' });
  if (draining) return json(res, 503, { error: 'Draining' });

  const claims = verifyStreamToken(url.searchParams.get('token'), SECRET);
  if (!claims) return json(res, 401, { error: 'Invalid or expired token' });

  const symbols = parseSymbols(url.searchParams.get('symbols'));
  if (!symbols.length) return json(res, 400, { error: 'No symbols' });

  const count = perUser.get(claims.sub) ?? 0;
  if (count >= MAX_STREAMS_PER_USER) return json(res, 429, { error: 'Too many streams' });
  perUser.set(claims.sub, count + 1);

  const ctrl = new AbortController();
  open.add(ctrl);
  // Long-lived process: no serverless cut-off, but still rotate hourly to rebalance across instances.
  const body = createSseStream(hub, symbols, { lifetimeMs: 60 * 60_000, signal: ctrl.signal });
  res.writeHead(200, SSE_HEADERS);
  const stream = Readable.fromWeb(body as import('node:stream/web').ReadableStream);
  stream.pipe(res);

  const done = () => {
    if (!open.delete(ctrl)) return;
    ctrl.abort();
    const n = (perUser.get(claims.sub) ?? 1) - 1;
    if (n <= 0) perUser.delete(claims.sub);
    else perUser.set(claims.sub, n);
  };
  req.on('close', done);
  stream.on('end', done);
});

server.keepAliveTimeout = 65_000;
server.listen(PORT, () => log('relay.listening', { port: PORT, source: source.name, origins: ORIGINS }));

// Graceful shutdown: stop accepting, end streams (clients reconnect elsewhere), exit.
const shutdown = (signal: string) => {
  if (draining) return;
  draining = true;
  log('relay.draining', { signal, streams: open.size });
  server.close();
  for (const ctrl of open) ctrl.abort();
  setTimeout(() => process.exit(0), 3_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
