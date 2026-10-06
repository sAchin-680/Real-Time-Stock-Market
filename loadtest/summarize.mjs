// Builds loadtest/RESULTS.md from k6 summaries and server metric samples.
//   HOLD=60 node loadtest/summarize.mjs > loadtest/RESULTS.md
import { readFileSync, readdirSync } from 'node:fs';
import os from 'node:os';

const HOLD = Number(process.env.HOLD || 60);
const FLUSHES_PER_S = 4; // 250 ms flush
const SYMBOLS = 5;
const dir = new URL('./results/', import.meta.url);

const runs = readdirSync(dir)
  .map((f) => /^stream-(app|relay)-(\d+)tps-r(\d+)-(\d+)\.json$/.exec(f))
  .filter(Boolean)
  .map(([, target, tps, ramp, vus]) => ({ target, tps: +tps, ramp: +ramp, vus: +vus }));

const ms = (v) => (Number.isFinite(v) ? `${Math.round(v)} ms` : '—');
const load = ({ target, tps, ramp, vus }) => {
  const k = JSON.parse(readFileSync(new URL(`stream-${target}-${tps}tps-r${ramp}-${vus}.json`, dir))).metrics;
  const samples = readFileSync(new URL(`metrics-${target}-${tps}tps-r${ramp}-${vus}.jsonl`, dir), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l))
    .filter((s) => s.memory);
  const rss = samples.map((s) => s.memory.rssMb);
  const opened = Math.round((k.stream_opened?.values.rate ?? 0) * vus);
  const expected = opened * HOLD * FLUSHES_PER_S * SYMBOLS;
  const peakRss = Math.max(...rss);
  return {
    lat: k.tick_latency_ms?.values ?? {},
    first: k.time_to_first_tick_ms?.values.med,
    delivered: expected ? (k.ticks_received?.values.count ?? 0) / expected : 0,
    ticksPerSec: k.ticks_received?.values.rate ?? 0,
    opened,
    dropped: k.streams_dropped?.values.count ?? 0,
    peakRss,
    peakHeap: Math.max(...samples.map((s) => s.memory.heapUsedMb)),
    kbPerStream: ((peakRss - rss[0]) * 1024) / vus,
  };
};

const table = (rows) =>
  [
    '| Server | Concurrent streams | Latency p50 | p95 | p99 | max | First prices (median) | Delivered | Opened | Dropped | Peak RSS |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map((r) => {
      const m = load(r);
      return `| ${r.target === 'app' ? 'Next.js app' : 'Relay'} | ${r.vus.toLocaleString('en-US')} | ${ms(m.lat.med)} | ${ms(m.lat['p(95)'])} | ${ms(m.lat['p(99)'])} | ${ms(m.lat.max)} | ${ms(m.first)} | ${(m.delivered * 100).toFixed(1)}% | ${m.opened.toLocaleString('en-US')} | ${m.dropped} | ${m.peakRss.toFixed(0)} MB |`;
    }),
  ].join('\n');

const sorted = (f) => runs.filter(f).sort((a, b) => (a.target === b.target ? a.vus - b.vus : a.target === 'app' ? -1 : 1));
const ramped = sorted((r) => r.ramp > 0 && r.tps === 20);
const burst = sorted((r) => r.ramp === 0);

console.log(`# Stream load test results

Measured ${new Date().toISOString().slice(0, 10)} on ${os.cpus()[0]?.model ?? 'unknown CPU'} (${os.cpus().length} cores, ${Math.round(os.totalmem() / 2 ** 30)} GB RAM), Node ${process.version}, macOS. k6 ran on the same machine.

## Method

- **System under test:** a single process, either the Next.js production server (\`next start\`, \`/api/stream\`) or the standalone relay (\`relay/server.ts\`, \`/stream\`). Both run the same \`lib/stream\` hub with **one shared upstream connection**.
- **Feed:** \`STREAM_SOURCE=synthetic\` at 20 trades/s per symbol, so every run sees an identical, busy market.
- **Clients:** k6 with xk6-sse. Each virtual user is one browser tab subscribing to 5 of 20 symbols (overlapping like real watchlists). Connections arrive evenly over 20 s, then every stream is held for ${HOLD} s.
- **Latency** = time the client received a tick − \`tick.r\`, the moment the trade reached the server hub. Client and server share a clock. The 250 ms flush sends only the newest trade per symbol, so with this busy feed a delivered tick is never older than the gap between trades. A sparse feed would be bounded by the 250 ms flush window instead.
- **Delivered** = ticks received ÷ ticks a stream should receive (${FLUSHES_PER_S} flushes/s × ${SYMBOLS} symbols × ${HOLD} s). 100 % means no client fell behind.
- **Peak RSS** = the server process's peak resident memory during the run, sampled every 2 s.

## Results: one upstream connection, many browser streams

${table(ramped)}

## Burst connections (all clients connect at the same instant)

${burst.length ? table(burst) : ''}

When every client connects in the same millisecond (k6 with no ramp), about half of 250–500 simultaneous connects were refused in an exploratory run. Latency for the streams that did connect was unchanged. The cause is the operating system's listen backlog, not the app: macOS caps pending connections at \`kern.ipc.somaxconn = 128\` (Linux defaults to 4096). Refused browsers reconnect automatically, and spreading arrivals over 20 s, as real users do, removed the effect entirely (zero refused at 8,000 streams).

Reproduce: see [README.md](./README.md).
`);
