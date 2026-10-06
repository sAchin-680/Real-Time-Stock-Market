# Live streaming: architecture, limits and the relay

Tickline pushes trades to the browser over **Server-Sent Events (SSE)**. This page explains how the stream works, the limits of running it on serverless functions, and the standalone relay that removes them.

## How it works

```text
Finnhub WebSocket ──► StreamHub ──► SSE writer ──► EventSource (browser market store)
      (1 upstream)     ref-counted     250 ms flush,       one connection per tab,
                       subscriptions   newest tick/symbol  shared by every component
```

- **One upstream, many viewers.** `lib/stream/hub.ts` holds a single upstream connection and reference-counts symbols: a symbol is subscribed upstream for the first viewer and dropped after the last one leaves. The upstream closes 30 s after the last viewer and reconnects with exponential backoff (1 s → 30 s) while anyone is listening.
- **Coalescing.** Bursts of trades collapse to the newest print per symbol, and each stream flushes at most every 250 ms. With a busy feed a delivered tick is never older than the gap between trades; with a sparse feed the flush window bounds it (≤ 250 ms).
- **Measurable.** Every tick carries `r`, the time it reached the hub, so delivery latency is `received_at − r`. See [loadtest/RESULTS.md](../loadtest/RESULTS.md).
- **One browser connection.** The client store (`lib/client/market-store.ts`) merges every component's symbols into a single `EventSource` plus a REST poller that keeps the previous-close baseline correct. If streaming is refused it falls back to polling and the UI shows **Delayed** instead of **Live**.

## Running on Vercel (serverless): the limits

The in-app route `app/api/stream/route.ts` works on Vercel, with two constraints that matter at scale:

| Limit | What happens | Mitigation |
| --- | --- | --- |
| **Function duration.** A function invocation can't run forever; the route declares `maxDuration = 300`. | The server ends each stream at 280 s. | **Make-before-break rotation:** at 275 s the server sends `event: rotate`. The client opens a replacement stream and closes the old one only after the new one is open, so there is **no gap** in prices. If a stream drops unexpectedly instead, `EventSource` reconnects after `retry: 1000` (1 s) and the server immediately replays the latest price per symbol. |
| **The hub is per instance.** "One shared upstream" is shared only within one warm function instance. | Under load Vercel runs several instances; each opens its own upstream socket and keeps its own subscriptions. That multiplies connections against the data provider's per-key limits and wastes work. | Run the **relay** (below): one long-lived process, one upstream socket for every user. |

Also worth knowing: each open stream occupies a function invocation for its lifetime, which is billed as active time.

## The relay (recommended for production scale)

`relay/server.ts` is a dependency-free Node service built on the same `lib/stream` code. It holds one upstream connection and serves `GET /stream` and `GET /healthz`.

```text
Browser ──(1) GET /api/stream/token──► Next.js app  (checks session, signs 15-min HMAC token)
   │
   └──(2) EventSource relay/stream?symbols=…&token=…──► Relay (verifies token) ──► one Finnhub socket
```

- **Auth without shared cookies.** The app mints a short-lived token signed with `STREAM_TOKEN_SECRET` (`lib/stream/token.ts`); the relay verifies it. Expired or forged tokens get a 401 and the client fetches a fresh one.
- **Graceful shutdown.** On `SIGTERM` the relay stops accepting, ends open streams and exits. Clients reconnect to another instance.
- **Abuse limits.** At most 20 concurrent streams per user (configurable), with CORS restricted to `ALLOWED_ORIGINS`.

### Deploy to Fly.io

```bash
fly launch --no-deploy --copy-config          # uses fly.toml + relay/Dockerfile
fly secrets set STREAM_TOKEN_SECRET=$(openssl rand -base64 32) \
  FINNHUB_API_KEY=… ALLOWED_ORIGINS=https://tickline-dash.vercel.app
fly deploy
```

Then set two variables on the app (Vercel) and redeploy:

| Variable | Value |
| --- | --- |
| `STREAM_RELAY_URL` | `https://tickline-relay.fly.dev` |
| `STREAM_TOKEN_SECRET` | the same secret as the relay |

With those unset, the app uses the in-app route. Nothing else changes. The same Docker image runs on Railway, Render or any container host.

### Run it locally

```bash
npm run relay:build
STREAM_TOKEN_SECRET=dev-secret-123456 STREAM_SOURCE=synthetic ALLOWED_ORIGINS=http://localhost:3000 \
  PORT=8080 npm run relay:start
curl localhost:8080/healthz
```
