#!/usr/bin/env bash
# Polls server metrics every 2s into a JSONL file until killed.
#   METRICS_TOKEN=… ./loadtest/sample-metrics.sh http://localhost:3200/api/metrics out.jsonl
#   ./loadtest/sample-metrics.sh http://localhost:8090/healthz out.jsonl          (relay)
set -euo pipefail
url="$1"; out="$2"
: > "$out"
while true; do
  curl -s -H "Authorization: Bearer ${METRICS_TOKEN:-}" "$url" >> "$out" && echo >> "$out"
  sleep 2
done
