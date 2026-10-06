# Load testing the live stream

[`stream.js`](./stream.js) is a k6 test that opens hundreds to thousands of simultaneous Server-Sent Events streams and records delivery latency, time to first prices, delivery completeness and dropped streams. [`run.sh`](./run.sh) runs it at several concurrency levels while sampling server memory and hub counters, and [`summarize.mjs`](./summarize.mjs) writes [`RESULTS.md`](./RESULTS.md).

## 1. Build k6 with SSE support

Standard k6 can't read event streams, so build it with the [`xk6-sse`](https://github.com/phymbert/xk6-sse) extension (needs Go):

```bash
go install go.k6.io/xk6/cmd/xk6@latest
xk6 build --with github.com/phymbert/xk6-sse --output ./k6
```

## 2. Start the system under test

Use the synthetic feed so every run sees the same market, and a local database:

```bash
npm run build
cd .next/standalone && cp -r ../../public . && cp -r ../static .next/
ulimit -n 20000
NODE_ENV=production PORT=3200 MONGODB_URI=mongodb://127.0.0.1:27017/loadtest \
BETTER_AUTH_SECRET=<32+ chars> BETTER_AUTH_URL=http://localhost:3200 \
STREAM_SOURCE=synthetic SYNTHETIC_TPS=20 METRICS_TOKEN=<token> STREAM_CONNECTS_PER_MINUTE=1000000 \
node server.js
```

Or the relay (it signs nothing itself; mint a token with `lib/stream/token.ts` using the same secret):

```bash
npm run relay:build
STREAM_TOKEN_SECRET=<secret> STREAM_SOURCE=synthetic SYNTHETIC_TPS=20 MAX_STREAMS_PER_USER=100000 PORT=8090 \
npm run relay:start
```

> Never set `STREAM_SOURCE`, a high `STREAM_CONNECTS_PER_MINUTE` or `MAX_STREAMS_PER_USER` in production. They exist for benchmarks.

## 3. Run

```bash
export K6=./k6 METRICS_TOKEN=<token> HOLD=60
TARGET=app   RAMP=20 ./loadtest/run.sh 100 1000 4000 8000
TARGET=relay RAMP=20 TOKEN=<signed token> ./loadtest/run.sh 100 1000 4000 8000
TARGET=app   RAMP=0  ./loadtest/run.sh 1000          # burst: everyone connects at once
HOLD=60 node loadtest/summarize.mjs > loadtest/RESULTS.md
```

Raw k6 summaries and server metric samples are kept in [`results/`](./results).

## Knobs

| Variable | Default | Meaning |
| --- | --- | --- |
| `VUS` (from `run.sh` args) | 100 | Concurrent streams |
| `HOLD` | 60 | Seconds each stream stays open |
| `RAMP` | 20 | Seconds over which connections arrive (0 = burst) |
| `SYMBOLS_PER_STREAM` | 5 | Symbols per stream, drawn from a 20-symbol pool |
| `TARGET` | `app` | `app` (`/api/stream`, cookie) or `relay` (`/stream`, token) |
