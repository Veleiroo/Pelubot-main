# Railway Benchmark – May 2024

## Context
- **Platform:** Railway Plan with 8 vCPU / 8 GB RAM.
- **Service mode:** Full stack with Google Calendar in real mode (`PELUBOT_FAKE_GCAL=0`).
- **Load tool:** [`backend/tests/perf/pro_portal.k6.js`](../../backend/tests/perf/pro_portal.k6.js) executed with k6.
- **Procedure:** Instance restart between scenarios to ensure clean state.
- **Raw outputs:** Stored under [`backend/tests/perf/out/`](../../backend/tests/perf/out/).

## Scenario summary
| Scenario | VUs | p95 latency | Error rate | Notes |
| --- | --- | --- | --- | --- |
| Baseline (no user traffic) | 0 | 329 ms | – | Background sync cost dominated by Google Calendar.
| Read-heavy (15 VU read only) | 15 | 50 ms | 0 % | API remains fast when no writes hit Google Calendar.
| Write-heavy (15 VU mixed read/write) | 15 | 2 365 ms | 2.33 % business failures | Latency and errors caused by direct Google Calendar calls.

Write latency climbs sharply because each booking triggers synchronous Google Calendar operations. Without an asynchronous queue we cannot safely scale mixed 15 VU loads.

## Findings
1. **Google Calendar remains the bottleneck.** Synchronous calls dominate response time and propagate transient upstream failures directly to users.
2. **Backend without writes is healthy.** Read-only workloads stay below 100 ms p95, confirming that our own APIs, database, and cache layers are not limiting factors.
3. **Error profile is business-level.** The 2.33 % failure rate on writes corresponds to Google Calendar rejections/timeouts rather than infrastructure issues.

## Recommendations
- **Move Google Calendar sync to a queue.** Offloading writes to an asynchronous worker will decouple user latency from Google Calendar and allow us to scale past 15 VU mixed workloads.
- **Expose calendar failures clearly.** Surface upstream errors in observability dashboards and user-facing messaging so support can differentiate calendar issues from local bugs.
- **Harden write handlers.** Add retries, timeouts, and better fallback paths to reduce the impact of transient Google Calendar hiccups.
