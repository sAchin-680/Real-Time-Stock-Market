# Operations: health, uptime and SLO

## Service level objective

| Objective | Target | Error budget (30 days) |
| --- | --- | --- |
| **Availability:** `GET /api/health` returns `200` with `"status":"ok"` | **99.5 % of checks pass** | ≈ 3 h 36 min |
| **Stream freshness:** live ticks delivered p95 | **< 250 ms** from the trade reaching the server (measured: [loadtest/RESULTS.md](../loadtest/RESULTS.md)) | — |

If the error budget runs out, reliability work takes priority over features until it recovers.

## What the health check covers

`GET /api/health` (public, uncached):

- **Database:** pings MongoDB. A failure returns **503** with `"status":"degraded"`.
- **Market data:** reports whether the Finnhub key is configured.
- **Market session:** reports the current NYSE session, plus the deployed version (commit SHA) and uptime.

Process and stream metrics (memory, subscribers, ticks in/out, upstream reconnects) are at `GET /api/metrics`. It is disabled unless `METRICS_TOKEN` is set, and then requires `Authorization: Bearer <token>`.

## Monitoring

1. **GitHub Actions probe** (in the repo, already active): `.github/workflows/uptime.yml` checks production every 10 minutes from outside, retrying 3 times, and fails the run (which emails you) if the service is unhealthy. The Actions history is an uptime log.
2. **Better Stack monitor and public status page** (free tier, 3 minutes to set up):
   1. Create an account at <https://betterstack.com/uptime>, then **Monitors → Create monitor**.
   2. URL `https://tickline-dash.vercel.app/api/health`. Alert when the URL *doesn't contain a keyword*: `"status":"ok"`. Check every **3 minutes**, from multiple regions, and confirm with 2 regions before alerting.
   3. **Status pages → Create status page**, add the monitor, and publish it (for example at `status.tickline-dash…` or the free Better Stack subdomain).
   4. Put the status page link in the README next to the SLO.

For a public SLO dashboard, the Better Stack status page shows 90-day availability against the 99.5 % target.

## Tracing

Server actions, Finnhub calls and alert evaluation are traced with OpenTelemetry (`instrumentation.ts`, `lib/telemetry.ts`). Set `OTEL_EXPORTER_OTLP_ENDPOINT` and `OTEL_EXPORTER_OTLP_HEADERS` (for example Grafana Cloud → *Connections → OpenTelemetry*) to export traces. Useful queries:

- Error rate by action: spans `action.*` where `action.outcome = "error"`.
- Data-provider health: p95 duration and `finnhub.attempts > 1` (retries) on spans `finnhub /quote`.
- Alert job: `alerts.evaluate` duration and `alerts.fired`.

## Runbook

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Health `503`, `database: down` | MongoDB credentials, network access or cluster paused | Check Atlas (*Database Access*, *Network Access* `0.0.0.0/0`), then the `database.connection_failed` log for the exact error |
| UI shows **Delayed** instead of **Live** | Stream refused (no `FINNHUB_API_KEY`) or provider outage | Check `marketData` in health, then the `stream.upstream_reconnect` logs (and `/api/metrics` reconnects) |
| Live prices pause for a second every ~5 minutes | Should not happen: streams rotate make-before-break | Check the browser console for `rotate` events and the client store's handoff |
| Build fails on Vercel | Dependency or env change | Run `npm run check && npm run build` locally; CI runs the same steps |
