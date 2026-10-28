# Performance Design — u2-app-shell

> Designs for NFR6.13–NFR6.16 and NFR9.5–NFR9.9 (`../nfr-requirements/performance-requirements.md`
> and the security requirements' review follow-ups N-02, N-05, N-06). U1's P1–P8 are unchanged; U2 adds P9–P14.

## P9 — Audit keyset seek (NFR6.13)

- Index `audit_log_business_keyset_idx ON audit_log (business_id, occurred_at DESC, id DESC)` in migration `0016_add_audit_log_keyset_idx.sql` (idempotent `IF NOT EXISTS`).
- Query: `WHERE a.business_id = $b AND a.retention_until > $now [AND (a.occurred_at, a.id) < ($t, $id)] ORDER BY a.occurred_at DESC, a.id DESC LIMIT $limit + 1`, `LEFT JOIN users u ON u.id = a.actor_user_id`.
- Budget: index seek and filter ≤ 60 ms for 51 rows; the join ≤ 20 ms by primary key; serialisation ≤ 20 ms.
- Benchmark: the large profile seeds 20 000 rows for the business (spread over 2 years), 2 000 for a second business, and 1 000 with `retention_until` in the past. It times 100 first-page and 100 cursor-page calls and asserts p95 ≤ 300 ms. An `EXPLAIN` on that profile asserts `audit_log_business_keyset_idx` appears in the plan (N-03).

## P10 — First page load in Chrome (NFR6.14)

`scripts/browser-check.ts` runs `bun run start` on a base-profile database, opens a new target with the cache disabled (`Network.setCacheDisabled`), loads `/` 5 times with a fresh browser context each time, and reads `performance.timing.loadEventEnd - performance.timing.navigationStart`. The median must be ≤ 2 000 ms. This closes U1's NFR6.7.

## P11 — 360 px walk (NFR9.6)

The same script sets `Emulation.setDeviceMetricsOverride` to 360 × 740 at scale 1, signs in as the Owner through the real form, and visits every screen route the role table allows the Owner, plus `/sign-in` and `/not-found`. On each it waits for the route's heading, then asserts `document.documentElement.scrollWidth <= document.documentElement.clientWidth`. Parameterised routes use a seeded order id.

## P12 — Walk budget (NFR6.16)

Each walk measures its own duration and prints `routes × roles` and milliseconds. The gate adds the three; if the sum is over 60 s it reruns the walks once, and fails if the rerun is also over 60 s, printing both times (N-06).

## P13 — No client caching (anti-requirement)

Screens fetch on mount and on retry; no response is cached in memory or storage. The audit screen appends pages in component state only.

## P14 — Stylesheet and screen states (NFR9.5, NFR9.7–NFR9.9)

- **Copy:** every new string is an i18n key with Bangla and English; times and counts go through `bnDigits` in Bangla.
- **Loading:** `ApiState` keeps U1's 300 ms delay (a timer started on mount, cleared on answer).
- **Announcements:** error views `role="alert"`; the save toast `aria-live="polite"`.
- **Stylesheet test** (Q5): no literal colour outside `tokens.css`; no fixed `width`/`min-width` over 360 px outside the `.scroll-x` container class; a `:focus-visible` outline from `--focus-ring` on `button, input, select, textarea, a, [tabindex]`.
- **Colour-only meaning:** every error, warning and success view carries text plus a label or icon; the existing contrast harness checks every token pair used by the new classes (N-02).
