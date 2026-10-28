# Performance Requirements — u1-skeleton

> Derived from inception NFR6, plus NFR9 for the screens U1 adds or changes. Measurement conditions: `nfr-requirements-questions.md` Q1.

| ID | Requirement | Target | Percentile / statistic | Load condition | Measurement |
|----|-------------|--------|------------------------|----------------|-------------|
| NFR6.1 | API latency for every U1 route except sign-in and sign-up: `GET /api/health`, `GET /api/setup`, `GET /api/session`, `POST /api/auth/sign-out`, `GET /api/orders` (first page and a cursor page), `GET /api/orders/{id}`, `POST /api/orders`, `PATCH /api/orders/{id}`, `POST …/status`, `POST …/consignment` | ≤ 300 ms | p95 per route | 100 sequential calls per route after 10 warm-up calls; 1 000 seeded orders with 1–5 lines each; one signed-in session. Inception NFR6's "500 products" seed applies from U4, when products exist | `tests/perf/order-api.bench.ts` against a throwaway `postgres:18`; prints p50/p95/max per route and fails above target (AC2.1a.6) |
| NFR6.2 | Session resolve overhead per authenticated request | ≤ 20 ms | p95 | same run | measured as `GET /api/session` p95 |
| NFR6.3 | Sign-in and sign-up response | ≤ 1.5 s | max of 10 calls | argon2id m=64 MiB, t=3, p=1 | same benchmark; excluded from NFR6.1 by design |
| NFR6.4 | Health endpoint with the database down | ≤ 1.2 s | max | database stopped | 1 s query timeout (BR1.4) plus overhead |
| NFR6.5 | Browser bundle | ≤ 350 KB | gzip size of all emitted JS | `vite build` | build gate (BR7.2, AC1.7a.2); the build fails above |
| NFR6.6 | Server start to listening | ≤ 5 s | single run | migrated database | wiring check measures time to first successful `/api/health` |
| NFR6.7 | First page load in the Owner's browser | ≤ 2 s median of 5 cold loads | median | seeded data set | Deferred to Build and Test (AC1.7.4 lives in U2); recorded here so U1's bundle and server choices do not prevent it |

**Budgets inside NFR6.1** (guidance for NFR Design, not separate gates): session resolve ≤ 20 ms; list query ≤ 60 ms for 50 rows with items for the current revision only; JSON serialisation ≤ 20 ms; the rest is margin.

## Screens U1 adds or changes (NFR9)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR9.1 | Every new or changed U1 screen state — first-run sign-up, sign-in with the 401 and 429 messages, the lock screen, not-found, the request-state component (loading, empty, error banner), field errors on the order forms, the session-expired return — shows Bangla copy by default from the i18n table, with Bangla digits for numbers and minutes | happy-dom tests assert the Bangla strings and digits |
| NFR9.2 | Each of those states is reachable and operable by keyboard: focus moves to the error banner or the first invalid field after a failed submit; buttons submit with Enter; focus is visible | happy-dom focus tests |
| NFR9.3 | Colours come only from `tokens.css`; error and warning text is never conveyed by colour alone | contrast harness over tokens; review of new CSS |
| NFR9.4 | Status messages (saved, error banner) are announced: banners use `role="alert"`, saved messages `aria-live="polite"` | happy-dom attribute tests |

**Anti-requirements:** no target is set for throughput beyond one shop's use (see `scalability-requirements.md`); no caching layer is introduced to meet these targets.
