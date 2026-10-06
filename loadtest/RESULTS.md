# Stream load test results

Measured 2026-10-06 on Apple M4 Pro (12 cores, 24 GB RAM), Node v26.10.0, macOS. k6 ran on the same machine.

## Method

- **System under test:** a single process, either the Next.js production server (`next start`, `/api/stream`) or the standalone relay (`relay/server.ts`, `/stream`). Both run the same `lib/stream` hub with **one shared upstream connection**.
- **Feed:** `STREAM_SOURCE=synthetic` at 20 trades/s per symbol, so every run sees an identical, busy market.
- **Clients:** k6 with xk6-sse. Each virtual user is one browser tab subscribing to 5 of 20 symbols (overlapping like real watchlists). Connections arrive evenly over 20 s, then every stream is held for 60 s.
- **Latency** = time the client received a tick − `tick.r`, the moment the trade reached the server hub. Client and server share a clock. The 250 ms flush sends only the newest trade per symbol, so with this busy feed a delivered tick is never older than the gap between trades. A sparse feed would be bounded by the 250 ms flush window instead.
- **Delivered** = ticks received ÷ ticks a stream should receive (4 flushes/s × 5 symbols × 60 s). 100 % means no client fell behind.
- **Peak RSS** = the server process's peak resident memory during the run, sampled every 2 s.

## Results: one upstream connection, many browser streams

| Server | Concurrent streams | Latency p50 | p95 | p99 | max | First prices (median) | Delivered | Opened | Dropped | Peak RSS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Next.js app | 100 | 28 ms | 48 ms | 50 ms | 58 ms | 5 ms | 100.0% | 100 | 0 | 189 MB |
| Next.js app | 1,000 | 25 ms | 48 ms | 51 ms | 94 ms | 3 ms | 100.0% | 1,000 | 0 | 335 MB |
| Next.js app | 4,000 | 16 ms | 44 ms | 49 ms | 69 ms | 1 ms | 99.6% | 4,000 | 0 | 963 MB |
| Next.js app | 8,000 | 24 ms | 48 ms | 63 ms | 221 ms | 1 ms | 99.2% | 8,000 | 0 | 1240 MB |
| Relay | 100 | 26 ms | 48 ms | 50 ms | 53 ms | 2 ms | 100.0% | 100 | 0 | 30 MB |
| Relay | 1,000 | 25 ms | 48 ms | 50 ms | 57 ms | 1 ms | 100.0% | 1,000 | 0 | 85 MB |

## Findings

- **Latency is flat with load.** Median 16–28 ms and p95 44–48 ms from 100 to 8,000 concurrent streams on one shared upstream connection.
- **Where it starts to strain: about 8,000 streams per process** (one laptop process). Nothing dropped, but delivery slipped to 99.2 %, p99 rose to 63 ms and the slowest tick took 221 ms. Memory, not CPU or latency, is the first limit: peak RSS grew to 1.2 GB.
- **The relay is about 4× leaner.** At 1,000 streams it peaked at 85 MB against 335 MB for the full Next.js server, with identical latency. That's why production scale belongs on the relay ([docs/streaming.md](../docs/streaming.md)).
- **Slow clients can't grow memory without bound.** Each client queue is capped and coalesced to the newest price per symbol (unit-tested; not part of this run).

## Burst connections (all clients connect at the same instant)

When every client connects in the same millisecond (k6 with no ramp), about half of 250–500 simultaneous connects were refused in an exploratory run. Latency for the streams that did connect was unchanged. The cause is the operating system's listen backlog, not the app: macOS caps pending connections at `kern.ipc.somaxconn = 128` (Linux defaults to 4096). Refused browsers reconnect automatically, and spreading arrivals over 20 s, as real users do, removed the effect entirely (zero refused at 8,000 streams).

Reproduce: see [README.md](./README.md).

