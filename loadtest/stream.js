// k6 load test for /api/stream (Server-Sent Events).
//
// Requires a k6 binary built with the SSE extension:
//   xk6 build --with github.com/phymbert/xk6-sse
//
// Each virtual user = one browser tab holding one live stream for HOLD seconds.
// Connections arrive evenly over RAMP seconds, so all VUS streams overlap for HOLD − RAMP seconds.
// Latency is measured per tick as (time received by the client) − (tick.r, the
// moment the trade reached the server hub). Run the load generator on the same
// machine as the server so both clocks agree. See loadtest/README.md.
import http from 'k6/http';
import sse from 'k6/x/sse';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// TARGET=app → Next.js /api/stream with a session cookie; TARGET=relay → relay /stream with a signed TOKEN.
const TARGET = __ENV.TARGET || 'app';
const BASE = __ENV.BASE_URL || (TARGET === 'relay' ? 'http://localhost:8090' : 'http://localhost:3200');
const VUS = Number(__ENV.VUS || 100);
const HOLD_S = Number(__ENV.HOLD || 60);
const SYMBOLS_PER_STREAM = Number(__ENV.SYMBOLS_PER_STREAM || 5);
// Spread connection attempts over RAMP seconds (real users don't connect in the same millisecond;
// a zero ramp measures burst acceptance, which is bounded by the OS listen backlog).
const RAMP_S = Number(__ENV.RAMP ?? 20);
// 20-symbol universe: streams overlap the way real watchlists do.
const POOL = 'AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,JPM,V,XOM,KO,AMD,NFLX,PLTR,COIN,DIS,BA,WMT,COST,SPY'.split(',');

export const options = {
  scenarios: {
    streams: { executor: 'per-vu-iterations', vus: VUS, iterations: 1, maxDuration: `${HOLD_S + RAMP_S + 60}s` },
  },
  thresholds: {
    stream_opened: ['rate>0.99'],
    tick_latency_ms: ['p(95)<1000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

const latency = new Trend('tick_latency_ms', true);
const firstTick = new Trend('time_to_first_tick_ms', true);
const ticks = new Counter('ticks_received');
const opened = new Rate('stream_opened');
const dropped = new Counter('streams_dropped');

export function setup() {
  if (TARGET === 'relay') {
    if (!__ENV.TOKEN) throw new Error('TARGET=relay needs TOKEN (a signed stream token)');
    return { token: __ENV.TOKEN };
  }
  // One throwaway account; every VU reuses its session cookie.
  const email = `loadtest-${Date.now()}@example.test`;
  const res = http.post(`${BASE}/api/auth/sign-up/email`, JSON.stringify({ email, password: 'loadtest-password-1', name: 'Load Test' }), {
    headers: { 'Content-Type': 'application/json', Origin: BASE },
  });
  check(res, { 'signed up': (r) => r.status === 200 });
  const cookie = Object.entries(res.cookies)
    .map(([name, values]) => `${name}=${values[0].value}`)
    .join('; ');
  if (!cookie) throw new Error(`sign-up failed: ${res.status} ${res.body}`);
  return { cookie };
}

export default function ({ cookie, token }) {
  sleep(((__VU - 1) / VUS) * RAMP_S);
  const start = (__VU * 7) % POOL.length;
  const symbols = Array.from({ length: SYMBOLS_PER_STREAM }, (_, i) => POOL[(start + i) % POOL.length]).join(',');
  const openedAt = Date.now();
  let got = 0;
  let closedByUs = false;

  const url =
    TARGET === 'relay'
      ? `${BASE}/stream?symbols=${encodeURIComponent(symbols)}&token=${token}`
      : `${BASE}/api/stream?symbols=${encodeURIComponent(symbols)}`;
  const res = sse.open(url, { headers: cookie ? { Cookie: cookie } : {} }, (client) => {
    let first = true;
    client.on('event', (e) => {
      if (e.name !== 'ticks' && e.name !== 'snapshot') return;
      const now = Date.now();
      if (first) {
        firstTick.add(now - openedAt); // snapshot or first live tick: when the user first sees prices
        first = false;
      }
      if (e.name === 'snapshot') return; // cached last prices are not live deliveries
      const batch = JSON.parse(e.data);
      for (const t of batch) if (t.r) latency.add(now - t.r);
      got += batch.length;
      ticks.add(batch.length);
      if (now - openedAt >= HOLD_S * 1000) {
        closedByUs = true;
        client.close();
      }
    });
    client.on('error', () => {});
  });

  const ok = !!res && res.status === 200;
  opened.add(ok);
  if (!ok || !closedByUs) dropped.add(1);
}

export function handleSummary(data) {
  const out = __ENV.OUT || `loadtest/results/stream-${TARGET}-${__ENV.TPS || 20}tps-r${RAMP_S}-${VUS}.json`;
  return { [out]: JSON.stringify(data, null, 2), stdout: `\n${TARGET} ${VUS} streams: p50 ${fmt(data, 'med')} · p95 ${fmt(data, 'p(95)')} · dropped ${data.metrics.streams_dropped?.values.count ?? 0}\n` };
}
const fmt = (d, k) => `${Math.round(d.metrics.tick_latency_ms?.values[k] ?? NaN)}ms`;
