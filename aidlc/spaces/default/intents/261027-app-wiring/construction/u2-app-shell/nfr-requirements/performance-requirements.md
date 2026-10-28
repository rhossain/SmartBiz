# Performance Requirements — u2-app-shell

> Derived from inception NFR6 and NFR9; measurement conditions from `nfr-requirements-questions.md` Q1,
> Q2, Q4. IDs continue U1's (U1 ends at NFR6.12 and NFR9.4).

| ID | Requirement | Target | Percentile / statistic | Load condition | Measurement |
|----|-------------|--------|------------------------|----------------|-------------|
| NFR6.13 | `GET /api/audit`, first page and a cursor page (limit 50) | ≤ 300 ms | p95 per page kind | 100 sequential calls after 10 warm-up calls; 20 000 audit rows for the business, 2 000 for a second business, 1 000 past retention; one signed-in Owner | added to `tests/perf/order-api.bench.ts` (large profile); fails above target |
| NFR6.14 | First page load in Chrome on this machine | ≤ 2 s | median `loadEventEnd` of 5 cold loads | seeded base profile; built app served by `bun run start` | headless Chrome over DevTools protocol (Q2), Build and Test; not a pass when Chrome is missing (AC1.7.4) |
| NFR6.15 | Bundle after U2's screens | ≤ 350 KB gzip | gzip size of all emitted JS | `vite build` | the existing bundle gate (NFR6.5); U2 adds no runtime dependency |
| NFR6.16 | Walk run time in the local gate | ≤ 60 s total for the server, client and no-secret walks | single run | SQL stub and happy-dom, no database | the gate prints each walk's duration and fails above the budget (Q4) |

**Budget inside NFR6.13** (guidance for NFR Design): retention filter and keyset seek on one index ≤ 60 ms for 51 rows; the user email join ≤ 20 ms; the rest is margin.

## Screens (NFR9)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR9.5 | Every U2 screen and state (not-available, lock with the feature name, not-found, audit trail and its empty state, every `ApiState` view, the save toast) shows Bangla by default from the i18n table, with Bangla digits for times and counts | happy-dom tests assert the strings and digits |
| NFR9.6 | At 360 px wide no screen scrolls sideways and every action stays reachable | headless Chrome at 360 px asserts `scrollWidth <= clientWidth` on each screen (BR9.1); a missing browser is a known deviation for the Owner (F-10), not Deferred |
| NFR9.7 | Every control is reachable with Tab, forms submit with Enter, and focus is visible on `button`, `input`, `select`, `textarea`, `a` and `[tabindex]` | happy-dom keyboard tests and a stylesheet test (BR9.2, BR9.3) |
| NFR9.8 | Loading shows after 300 ms and not before; the save toast is announced politely; error views use `role="alert"` | happy-dom timer and attribute tests (BR5.1, BR6.2) |

**Anti-requirements:** no client-side caching of API data and no prefetching to meet these targets.
