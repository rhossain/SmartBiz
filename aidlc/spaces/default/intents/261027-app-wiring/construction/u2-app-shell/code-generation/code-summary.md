# Code Summary — u2-app-shell

> Code Generation for U2 (app shell), intent `261027-app-wiring`, branch `app-wiring`.
> Test-after, Standard strategy, 80 % line floor over every `src` file. Each layer was built,
> then its tests were written and run with the full suite before the next layer began.
> Plan: `code-generation-plan.md` (every box ticked). Paths changed: `source-manifest.json`.
> Coverage of ACs, rules and NFRs: `traceability.json`.

## Final gate result

After the review fixes G-01..G-07, `bun run gate` (default profile) on commit `1d4e820`, exit 0:

```
gate ok 1d4e8208e669: 481 tests pass, walks server 114 / client 159 checks, no-secret 2403 scans 1.3 s, lines 94.3 %, bundle 93.2 KB gz, mutants 19/19, bun audit clean, dependencies unchanged, secrets clean, tests/realdb 40 pass, wiring-check ok, browser: ok (36 ms, 12 screens), bench base ok (3.2 min)
```

The earlier `bun run gate --large` (the Bolt-merge form) on `79a49f4`, before the review, also
passed, including the 20 000-row audit profile and the `EXPLAIN` index check. Its line
reported the walks as one total; G-07 replaced that with the split figures above.

## Review fixes (review-01, READY; decided on the Owner's standing instruction)

| Finding | Change | Proof |
|---------|--------|-------|
| G-01 (Major) NFR9.9 | Every toast tone shows a visible label in its own element beside the message: "তথ্য" (info), "সতর্কতা" (warn), "সফল" (success, used for every save), "ত্রুটি" (error). The message element keeps exactly its text, role and `data-tone`. | `tests/unit/toast-label.test.tsx`; the Shell's save toast is checked in `tests/integration/app.test.tsx` |
| G-02 503 wording | No code change; recorded as decided deviation 2 below. | — |
| G-03 | The server walk gives each inside-role probe its own order (packed for a consignment link, with a fresh reference) and asserts the fixture's recorded success status (200/201), not merely "not 401/403". | `tests/integration/server-gate-absence.test.ts` |
| G-04 | Gate step 5b fails when any of the server, client and no-secret walks prints no count or 0 checks. ci.yml 6b says exit 2 is advisory on hosted runners and that `gate --large` refuses it locally. | `tests/unit/gate-facts.test.ts` |
| G-05 | A failed "আরও দেখুন" keeps the loaded rows, shows the error beside them, and its retry asks for the same cursor. | `tests/integration/audit-trail-screen.test.tsx` |
| G-06 | `ApiState`'s retry is closed by default: only `unreachable`/`db_unavailable`, or any kind when `read` is passed. The reads mark themselves: the order list, the order detail and both audit-trail requests. | `tests/unit/api-state.test.tsx` |
| G-07 | The gate line reports `walks server <n> / client <n> checks, no-secret <n> scans <s> s`. | `tests/unit/gate-facts.test.ts` |

## What was built, per step

| Step | Commit | What changed |
|------|--------|--------------|
| 1 | `20a2701` | `tests/spec/` skeleton (role table, fixtures, `dependencies.json`); header-only U2 modules; ESLint: `src/pres/**` may not import the router or the API client (F-01); `src/audit/screens/**` named as a browser file. |
| 2 | `632fb86` | Runner checked: 399 tests passed on U1's code; the U2 runnable-before-tests command passed 30 tests. |
| 3 | `a9f98ed` | Migration `0016_add_audit_log_keyset_idx.sql`: one index, `IF NOT EXISTS`, no grant. The D-05 precondition is stated in `audit-read.ts`: `insertAudit` writes `occurred_at` from the app clock at ms precision. |
| 4 | `f775267` | Text tests for 0016. Realdb migrations (run twice) and the exact grant set stay green. |
| 5 | `16c121c` | `readAuditPage`: one statement; retention-filtered; keyset seek; actor email joined; no payload. Cursor codec returns `invalid_input`. `exportAudit` has its own read in batches of 500, with payload. `listAuditForBusiness` is removed. Fail-closed stub handlers for both query shapes. |
| 6 | `e46f077` | Unit tests for the read and the export (U1's observability cases moved here). `audit-read.realdb.test.ts` covers the retention boundary, a tie broken by id, a foreign business and a foreign cursor, ms precision, and grants. |
| 7 | `632ceb3` | `viewForKind` (behaviour only). `useSubmitGuard` (`useRef` latch set before the first `await`). The return route keeps the path only and lists `/accept-invite`. Router parsers are keyed by route and parameter. |
| 8 | `aa0603e` | Tests for each piece of Step 7, including the running app sending no `t=`/`x=`. A bad `:id` lands on not-found with no fetch. Mutants: `return-route-keeps-query`, `save-guard-drops-latch`. |
| 9 | `be0757b` | `GET /api/audit`: strict query schema, shared response schema, business from the session, the app clock. A bad cursor gives 400 `fields:[cursor]` and is never echoed. Route registered; public allow-list unchanged. |
| 10 | `b9d8000` | Inline role table: 13 API rows and 18 screen rows. Recorded fixtures. Server walk and no-secret walk rewritten on the role table. Audit-route tests. Outage realdb test adds the audit route. Mutants: `audit-read-drops-retention`, `audit-route-public`. |
| 11 | `5438aca` | `ApiState` (`RequestState` is the same component), `NotAvailable`, a lock screen that names the feature and links home, and a route map with feature keys and `/accept-invite`. App builds the nav from the route map and hosts the toast in the Shell. Order forms use `useSubmitGuard`. Also: the audit trail screen and client, i18n keys, a `:focus-visible` rule from a token, `.scroll-x`, `components.css`. B1 placeholders removed. |
| 12 | `6bf1753` | Client walk rewritten on the role table. App now loads nothing for a route the role cannot open; the walk found this (D-04a). New tests: ApiState, audit trail screen, not-available, Shell, stylesheet, keyboard, contrast. Mutant: `client-gate-renders-forbidden`. |
| 13 | `79a49f4` | `scripts/browser-check.ts`, `scripts/check-dependencies.ts`, gate steps 5b/14b and signal forwarding (`scripts/lib/gate-facts.ts`, `run.ts`). Audit benchmark (base and large, with `ANALYZE` and `EXPLAIN`). Wiring check on the role table: every screen row, plus the audit headers. Also: the secret-scan line, ci.yml, README, `.env.example`. The browser check found a sideways scroll at 360 px on `/orders`, now fixed. |
| 14 | this commit | Code summary, source manifest, traceability. |

## Test results

| Suite | Result |
|-------|--------|
| Unit + integration (`bun run test`) | 481 pass, 0 fail (475 before the review fixes; U1 baseline: 399) |
| Walks, gate step 5b | role walks: server 114 checks, client 159 checks; no-secret walk: 2 403 string scans over 40 responses; 1.3 s in total against a 60 s budget |
| Real database (`tests/realdb`) | 40 pass (adds 6 audit-read tests and the audit 503 in the outage test) |
| Line coverage (every `src` file) | 94.3 % over 144 files; floor 80 %; nothing excluded |
| Mutants | 19 of 19 caught. U2 added 5: `return-route-keeps-query`, `save-guard-drops-latch`, `audit-read-drops-retention`, `audit-route-public`, `client-gate-renders-forbidden` |
| Wiring check | ok: 26 screens rendered, 32 role × route calls, audit read with C1 headers |
| Real-browser check | `browser: ok`: median first load 36 ms over 5 cold loads; 12 screens at 360 × 740 with no sideways scroll |
| Benchmark, base (after the review fixes) | `GET /api/audit` p95 14.5 ms, cursor page 81.7 ms (2 000 extra rows; target 300 ms) |
| Benchmark, large (`--large` on `79a49f4`, before the review) | `GET /api/audit` p95 4.3 ms, cursor page 3.6 ms (20 000 + 2 000 foreign + 1 000 expired rows); `EXPLAIN` names `audit_log_business_keyset_idx` for both pages. The fixes changed no audit read or SQL, so this was not rerun |
| Bundle | 93.2 KB gzip (limit 350 KB) |
| Dependencies | unchanged: 19 packages, equal to `tests/spec/dependencies.json` |

The browser check was also run on its failure paths, and each was checked for leaks:
- no Chrome at `CHROME_PATH`: exit 2;
- a non-Chrome binary: exit 1, after the 15 s DevTools timeout;
- Ctrl-C mid-run: exit 130, with 11 Chrome processes running before the interrupt and none after.

After each run, no `smartbiz-browser-*` profile and no `browser_*` database was left behind.

## Deviations from the design, with reasons

1. **The inline not-found view is a banner plus a home link, not a second `NotFound` screen** (plan step 11, "`not-found` renders `NotFound` inline").
   - A full screen would put a second heading inside the screen that asked.
   - U1's detail test expects `error-banner-message` = "পাওয়া যায়নি" with no retry, and F-05 keeps U1 tests green.
   - The view keeps the not-found copy and adds "হোমে যান".
2. **Decided (review G-02, on the Owner's standing instruction): `db_unavailable` keeps U1's catalogue copy**, "ডাটাবেস চালু নেই। কিছুক্ষণ পর আবার চেষ্টা করুন।".
   - It is the shipped catalogue, and four U1 tests pin it. R7's wording, "ডাটাবেসের সাথে যোগাযোগ হচ্ছে না", is superseded.
   - No separate "database-not-reachable" key was added.
3. **`nav.daily_card` changed from "দৈনিক হিসাব" to "দৈনিক কার্ড"**, the label frontend-components gives. The brief asks for the design's Bangla to be kept exactly.
4. **The client walk does not count `GET /api/session` as a gated call while it resolves a forbidden route** (D-04a). That call is the app's boot identity probe on every route, not the route's data. Every other gated API path counts.
5. **Public rows that only redirect carry `landsOn` in the role table.**
   - `/`, and `/sign-up` once the business exists, send a signed-out person to sign-in (F-02, U1 W3).
   - The walk asserts the sign-in heading and the landing hash for these rows.
   - `/lock` uses `lock-title` as its heading id, because the lock screen has no `screen-title` (E-01: reuse the shipped ids).
6. **The lock screen names the feature after the `/lock` redirect, not in place.** App remembers the redirecting route's feature. U1's app test expects the hash to become `/lock`.
7. **The order list's saved notice is now plain text** (`orders-saved-notice` kept). The Shell hosts the announced toast (F-05). Two polite live regions with the same words would announce twice.
8. **New files and removals the plan did not list:**
   - `src/pres/components.css`: component CSS that uses tokens only; plan step 11 asks for "component CSS".
   - `scripts/lib/gate-facts.ts` and `tests/unit/gate-facts.test.ts`: the gate's pure helpers, so they can be tested without importing `gate.ts`, which installs signal handlers.
   - `saveDraftGuarded` in `order-draft.ts`: so each form's guard knows whether the save landed.
   - The B1 `AuditTrailPlaceholder.tsx` and `DailyCardPlaceholder.tsx` were deleted, with their two cases in `tests/unit/screens.test.tsx`. The real audit trail and the not-available screen replace them, so they would be duplicates.
   - `source-manifest.json` lists both deleted paths. They do not exist on disk, by design.
9. **`browser-check.ts` reports which elements overflow** when a screen scrolls sideways. This is a diagnostic only; the assertion is unchanged.
10. **The gate waits up to 4 s after forwarding SIGINT/SIGTERM** before it removes the container, so the browser check can drop its database first (I-02).
11. **The order-list summary and money cells wrap at 360 px.** Added `.summary`, `.money-cell` and `overflow-wrap: anywhere` on the main area after the browser check found a 418 px sideways scroll.

## Missed or deferred targets

- **AC1.7.1: Deferred to U3.** Every route that exists now renders a named heading for the Owner. `/accept-invite`, `/reset` and `/recover` render the honest not-available screen until U3 builds them, and `/staff` does not exist yet (units R-02, F-10).
- **AC5.1.4: Deferred to U3/U4.** The public routes open without a session, as the walk shows. The catalog routes and `/staff` are not registered yet; those Units add them with rows in the role table.
- **AC5.3.2: Deferred to U3.** The `link` scan runs over every response, and the closed allow-list is `[]`. The two allow-listed routes are U3's.
- **NFR9.9 is met since review fix G-01.** Error banners and every toast tone carry a visible text label beside the message; `tests/unit/toast-label.test.tsx` pins them, and it is the OK target in `traceability.json`.
- **None of the gate targets were missed.** Coverage, walk time, bundle, the p95 targets, first load, 360 px, mutants, audit, grants and the dependency list are all met, and no threshold was changed.

## Left for Build and Test

- Verify on disk every manifest path and every OK target (project rule). The two deleted placeholders are expected to be absent.
- The squash body should carry the gate line above. This run was `--large`, as the Bolt 1 merge requires.
