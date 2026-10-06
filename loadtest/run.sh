#!/usr/bin/env bash
# Runs the stream load test at several concurrency levels and writes results.
# TPS must match the server's SYNTHETIC_TPS (it only labels the results).
#   K6=/path/to/k6-with-sse METRICS_TOKEN=… TARGET=app TPS=20 ./loadtest/run.sh 100 1000 4000
#   K6=… TARGET=relay TOKEN=<signed token> ./loadtest/run.sh 100 1000 4000
set -euo pipefail
cd "$(dirname "$0")/.."
K6="${K6:-k6}"; TARGET="${TARGET:-app}"; HOLD="${HOLD:-60}"; TPS="${TPS:-20}"; RAMP="${RAMP:-20}"
if [ "$TARGET" = relay ]; then BASE_URL="${BASE_URL:-http://localhost:8090}"; METRICS_URL="$BASE_URL/healthz"
else BASE_URL="${BASE_URL:-http://localhost:3200}"; METRICS_URL="$BASE_URL/api/metrics"; fi
ulimit -n 20000 || true
for vus in "${@:-100 250 500 1000}"; do
  echo "== $TARGET: $vus concurrent streams (ramp ${RAMP}s, hold ${HOLD}s)"
  ./loadtest/sample-metrics.sh "$METRICS_URL" "loadtest/results/metrics-$TARGET-${TPS}tps-r$RAMP-$vus.jsonl" & sampler=$!
  VUS="$vus" HOLD="$HOLD" TPS="$TPS" RAMP="$RAMP" TARGET="$TARGET" BASE_URL="$BASE_URL" "$K6" run --quiet loadtest/stream.js || true
  kill "$sampler" 2>/dev/null || true
  sleep 35   # let the hub go idle between runs
done
HOLD="$HOLD" node loadtest/summarize.mjs > loadtest/RESULTS.md
