# Test Results — B2 Orders (U3-orders)

> Run 2 (after loop-back 1): 2026-10-26, local (macOS, bun 1.4.3, Docker 27.4 with `postgres:18`), branch
> `b2-orders` at `749d0e1`. Commands come from `build-instructions.md`, the stage-level
> `construction/code-generation/unit-test-instructions.md`, and the integration, performance and
> security instruction files. Run 1's results (all B2 targets Not Met, files missing) are superseded;
> its diagnosis is kept in the Loop-Back Log below.

## Verdict

**FAILED, narrowly.** The B2 Orders code is now on disk and every functional, coverage and benchmark
target is Met: 217/217 tests, 96.49 % lines, and every `OK` traceability target exists. Three things
still fail the stage's predicate:

1. **New defect found on real Postgres (T-JSONB, Not Met).** Every JSONB write is double-encoded. The
   code passes `JSON.stringify(value)` as `${…}::jsonb`; postgres.js types that parameter as JSON and
   serialises the string again, so the column holds a JSON *string*, not an object
   (`jsonb_typeof = 'string'`). Affected: `orders.contact` (`src/orders/order-rows.ts:176`, `contactJson`)
   and `audit_log.payload` (`src/audit/audit-service.ts:39–47`). The second is B1 code, so every B1
   audit row is affected too. The app still round-trips because the read path `JSON.parse`s strings,
   so the stub-based suite cannot see the defect. In an insert-only, 5-year audit table these rows
   could never be corrected.
   Probe (`evidence/jsonb-probe.ts`): `${JSON.stringify(o)}::jsonb` → `string`; `${sql.json(o)}` →
   `object`; `${JSON.stringify(o)}::text::jsonb` → `object`.
2. **Dependency advisories (T-DEPS, Not Met).** `bun audit` reports 13 advisories (2 critical, 4 high,
   6 moderate, 1 low) in happy-dom 13.10.1, vite 5.4.21 and zod 3.25.76 (runtime).
3. **Three targets with no owning later stage (Unverified).** NFR2.1, NFR1.4 and NFR3.2 need a
   deployed environment. Performance-validation and observability-setup are not in this workflow,
   so these targets cannot be deferred successfully.

## Build

| Command | Exit | Result |
|---------|------|--------|
| `bun run type-check` | 0 | zero errors |
| `bun run lint` | 0 | zero errors |
| `bun run build` | 0 | `dist/index.html` 0.45 KB gzip; JS 47.32 KB gzip; CSS 0.41 KB gzip |
| `bun run migrate` (real Postgres 18, run twice) | 0 / 0 | run 1 applied 0001–0010; run 2 skipped all 10 (idempotent) |

The JS bundle is unchanged from B1 (47.32 KB) because `src/index.tsx` does not mount the router, so
the order screens are not bundled yet (code-summary "Known gaps", M-05).

## Tests

Unit-scoped command from `unit-test-instructions.md` (18 files, run once):
**107 pass / 0 fail**, 3.69 s.

Project-wide `bun run coverage` (run once). The unit-scoped files are a subset and are not counted twice:

| Total | Passed | Failed | Skipped | Files | Duration |
|-------|--------|--------|---------|-------|----------|
| 217 | 217 | 0 | 0 | 45 | 7.8 s |

The benchmarks (`parseMessage-bench`, `status-bucket-bench`, `orders-list-bench`, `gate-bench`) run
inside this suite and assert their budgets. All pass.

## Coverage

`bun test --coverage` (text reporter), all files: **96.49 % lines, 89.98 % functions**.
`src/orders/**`: 99.32 % lines; no `src/orders/` file is below 80 %.
High-risk modules: `parse-message.ts` 98.17 %, `parse-message-segments.ts` 100 %,
`status-fsm.ts` 100 %, `status-bucket.ts` 100 %.

## Real-Postgres integration smoke

`evidence/realdb-smoke.ts`, run as `bt_app` (a login role that is a member of `app_role`) against
the migrated container:

| Check | Result |
|-------|--------|
| `createOrder` (2 lines, discounts, delivery) | `ORD-1002`, total 361000 paise |
| unknown `contact.extra` key | stripped (M-02 holds) |
| `updateOrder` delivery charge | total 363000 |
| `transitionStatus` new → confirmed → packed | both succeed (`FOR UPDATE` path works) |
| `linkConsignment` PT-1234, then a second link | `pathao`, then `already_linked` |
| `listOrders` keyset paging (limit 2) | page 2 shares no ids with page 1 |
| cross-tenant `getOrder` | `not_found` |
| audit rows for the order | create, update, transition ×2, consignment.link |
| `UPDATE` / `DELETE` on `audit_log` as app role | refused, SQLSTATE 42501 (R1.1 holds on a real DB) |
| 200 lines × 9999 × 10¹² paise | refused `invalid_input`; list still readable (M-01 holds) |
| `jsonb_typeof(orders.contact)` / `(audit_log.payload)` | **`string` / `string` (defect T-JSONB)** |

Real grants for `app_role`:
- `audit_log`: INSERT, SELECT.
- `orders`: INSERT, SELECT, UPDATE.
- `order_items`: DELETE, INSERT, SELECT. DELETE is used to replace lines on edit.
- `consignment_link`: INSERT, SELECT.

`audit_log.retention_until` is present.

## Security checks

| Check | Result |
|-------|--------|
| Secret sweep over `src/` | clean |
| R1.1 audit insert-only | pass (suite) and refused on real Postgres (42501) |
| R1.2 three-layer gate, every U1 + U3 route, Owner inverse | pass |
| NFR5.4 PCI deny-list (`pci-deny-list-orders.test.ts` + ESLint rule) | pass |
| Tenant isolation (real DB) | pass |
| `bun audit` | **13 advisories: 2 critical, 4 high, 6 moderate, 1 low** |

## Target Verification Matrix

Final verdicts for this run. `build-and-test-summary.md` carries the same matrix with source paths.

| Target ID | Expected | Actual | Verdict |
|-----------|----------|--------|---------|
| T-BUILD | type-check, lint, build exit 0 | all exit 0 | Met |
| T-SUITE | full suite green, 0 fail | 217/217 | Met |
| T-COV-ALL (NFR6.1) | ≥ 80 % lines `src/**` | 96.49 % | Met |
| T-COV-ORDERS | ≥ 80 % lines `src/orders/**` | 99.32 %, every file ≥ 80 % | Met |
| T-COV-HIGHRISK | ≥ 90 % on the high-risk modules | 98.17 / 100 / 100 / 100 % | Met |
| R1.1 (NFR5.1) | audit insert-only | suite pass; real DB 42501 | Met |
| R1.2 (NFR5.6) | gate on every U1 + U3 route; Owner inverse | pass | Met |
| R2.1 (NFR5.7, FR12.3) | every order mutation appends audit before the write | suite pass; real DB 5 rows | Met |
| R2.2 (NFR6.5, NFR6.7.2) | segment isolation | pass, incl. R-01 regression | Met |
| R2.3 (FR10.2) | bucket math, sets restated inline | pass | Met |
| R2.4 (FR5.3) | exhaustive 9-value switch | pass (runtime + `tsc`) | Met |
| R2.5 (NFR3.3) | deferred-input log shape | pass | Met |
| NFR6.7.1 | `parseMessage` p95 ≤ 20 ms, 200 items | bench pass | Met |
| NFR6.7.3 | ≥ 95 % parse success | 22/22 fixtures | Met |
| NFR6.7.4 | never throws on bad input | pass | Met |
| NFR2.5 | bucket p95 ≤ 1 ms, 1 000 orders | bench pass | Met |
| NFR6.10 | orders list ≤ 1 s, 1 000 orders | bench pass | Met |
| NFR2.c | gate dispatch p95 ≤ 2 ms incl. U3 | bench pass (budget 2 ms, M-06) | Met |
| NFR2.a / NFR2.b | ≤ 200 KB / ≤ 350 KB gzip | 0.45 KB / 47.32 KB | Met |
| NFR5.4 | no PCI identifiers in `src/orders/` | pass | Met |
| NFR5.5 | 5-year retention on order audit rows | `retention_until` present; no DELETE on `orders` or `audit_log` | Met |
| T-MIGRATE (FR5.1) | 0008–0010 apply idempotently | real Postgres, twice | Met |
| T-REALDB | order paths work on real Postgres | every check passes except JSONB typing | Met |
| T-JSONB | JSONB columns hold JSON objects | `jsonb_typeof` = `string` for `orders.contact` and `audit_log.payload` | **Not Met** |
| T-DEPS | no Critical/High advisories | 2 critical, 4 high | **Not Met** |
| NFR2.1 | 3G page render p95 ≤ 3 s | needs staging + Playwright; no later stage owns it | Unverified |
| NFR1.4 | order hot path ≤ 3 s p95 | depends on NFR2.1 | Unverified |
| NFR3.2 | slow-query dashboard covers order inserts | vendor dashboard; not deployed | Unverified |

## Failure diagnosis

- **Rung 1 (fix within this stage): not applicable.** None of the three causes is test config, a
  build script or environment setup. T-JSONB is in generated source code. T-DEPS is a library and
  version choice made at code generation. The Unverified targets need stages this workflow does not run.
- **Rung 2 (classify and estimate impact):**
  - **T-JSONB → code-generation.**
    - *Fix:* pass objects with `sql.json(value)` (or cast `::text::jsonb`) in `insertAudit` and the
      three order writes (`create-order.ts`, `update-order.ts`, and `contactJson` in `order-rows.ts`).
      Drop the read path's tolerance for JSON strings, and add a real-Postgres test that asserts
      `jsonb_typeof = 'object'`.
    - *Effort:* small: 4 call sites and 1 test, about 1 hour.
    - *Cost:* none.
    - *Risk:* low. The fix touches B1's `insertAudit`, which the R1.1 and R2.1 suites cover. No
      production rows exist yet, so nothing needs migrating.
  - **T-DEPS → code-generation.**
    - *Fix:* tried in a throwaway worktree. Upgrade to `zod@^4.6.6`, `vite@^6.4.4` and
      `happy-dom@21.0.4`, and change one line in `src/data/zod-schemas.ts`
      (`z.record(z.unknown())` → `z.record(z.string(), z.unknown())`).
    - *Trial result:* `bun audit` reported "No vulnerabilities found", `tsc` 0 errors, ESLint clean,
      217/217 tests, and the build passed (JS 47.68 KB gzip).
    - *Effort:* small, about 30 minutes plus review.
    - *Cost:* none.
    - *Risk:* low to medium. zod 4 is a runtime major version, but the suite passes unchanged.
  - **NFR2.1 / NFR1.4 / NFR3.2.** No fix is possible inside this workflow: they need a deployed
    environment and a stage that owns them. The Owner can add performance-validation and
    observability-setup to this workflow, or accept them as Unverified for this Bolt and carry them
    to the operation phase.
- **Rung 3 (automatic loop-back):** not taken. Construction autonomy is `gated`, so the decision goes
  to the Owner (rung 4).
- **Rung 4 (halt-and-ask), 2026-10-27:** the Owner chose **"Accept failure"** (Q2). T-JSONB and
  T-DEPS stay **Not Met** and are carried as open defects with the impact-estimated fixes above. They
  must be fixed before any production deploy, and the double-encoded audit rows before the first
  real business uses the system. NFR2.1, NFR1.4 and NFR3.2 stay **Unverified** (Q3, recorded as
  "Accept as Unverified for this Bolt" on the Owner's "Decide for me") and carry to the operation
  phase. No targets were weakened.

## Loop-Back Log

### Loop-back 1 — 2026-10-26T09:52:00Z

- **Diagnosis:** The Code Generation outputs for `u3-orders` (`code-summary.md`, `source-manifest.json`, `traceability.json`) report Steps 1–12 shipped, but 35 of the 46 created files are missing from the workspace: all of `src/orders/`, migrations `0008`–`0010`, and the 10 new tests. The B1 build and suite are green (108/108, 92.95% lines).
- **Root-cause stage:** code-generation (unit `u3-orders`).
- **Planned fix:** Re-run Code Generation for `u3-orders` against the existing plan with a fresh Plan Approval. Write every file in the plan's target structure, extend the 6 shared files in place, add the R2.x CI gate steps to `.github/workflows/ci.yml`, and verify every `source-manifest.json` path exists before completing the Unit. Optional scope for the Owner to confirm at Plan Approval: dependency upgrades for happy-dom (≥ 20) and vite (≥ 6.4.4), both dev-only, and zod (≥ 4.6.6, runtime major).
- **Estimated impact:** effort is one full code-generation pass (~22 modules, 3 migrations, 10–12 tests, 6 extended files). Financial cost is none (no new infrastructure or dependencies). Risk is low to medium: the B1 suite is the regression baseline, and the main exposure is router and gate edits. Decided by the Owner: "Retry with fix".
