# Build and Test Summary — B2 Orders (U3-orders)

> Run 2, after loop-back 1. Inputs: the stage-level `construction/code-generation/`
> `code-generation-plan.md`, `unit-test-instructions.md` and `code-summary.md`, the NFR requirements
> under `construction/u3-orders/nfr-requirements/`, and the NFR design under
> `construction/u3-orders/nfr-design/`. Execution evidence: `test-results.md` and `evidence/`.

## Overall status

- **Build:** green (type-check, lint, `vite build`, `migrate` on real Postgres, idempotent).
- **Tests:** 217/217 green; 96.49 % lines; every B2 functional, coverage and benchmark target Met.
- **Result:** **FAILED, narrowly.** Two targets are Not Met and three are Unverified:
  - T-JSONB: a JSONB double-encoding defect, found only on real Postgres.
  - T-DEPS: dependency advisories.
  - NFR2.1, NFR1.4, NFR3.2: Unverified, because no stage in this workflow owns them.

**Owner decision (2026-10-27):** "Accept failure". T-JSONB and T-DEPS are carried as open defects.
NFR2.1, NFR1.4 and NFR3.2 are accepted as Unverified for this Bolt. No target was weakened.

**Follow-up (2026-10-27, after the workflow closed):** T-JSONB is fixed in `f5144d8` and T-DEPS in
`640cac9`. Both were verified locally: `tests/realdb` 5/5, `bun audit` clean, 217/217. The matrix
below records the run as approved and is left unchanged.

## Test type inventory

| Type | Instruction file | Status |
|------|------------------|--------|
| Unit | stage-level `unit-test-instructions.md` | 107/107 (18 files) |
| Integration | `integration-test-instructions.md` | in-suite boundaries pass; real-Postgres smoke passes except T-JSONB |
| Performance (micro-bench + 3G) | `performance-test-instructions.md` | 4 benchmarks pass; 3G run unowned |
| Security | `security-test-instructions.md` | gates pass; `bun audit` fails |
| Build | `build-instructions.md` | green; local real-Postgres section added |

## Coverage expectations per unit

| Unit | Floor | Measured |
|------|-------|----------|
| u3-orders `src/orders/**` | ≥ 80 % lines | 99.32 % (every file ≥ 80 %) |
| u3-orders high-risk (`parse-message`, `parse-message-segments`, `status-fsm`, `status-bucket`) | ≥ 90 % lines | 98.17 / 100 / 100 / 100 % |
| Whole `src/**` (mvp floor) | ≥ 80 % lines | 96.49 % |

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-BUILD | `build-instructions.md`; team.md §CS-1 | type-check, lint, build exit 0 | all exit 0 | `test-results.md` §Build | build-and-test | Met |
| T-SUITE | team.md §TP-3 | full suite green | 217 pass / 0 fail | `bun run coverage` | build-and-test | Met |
| T-COV-ALL | team.md §TP-2; NFR6.1 | ≥ 80 % lines `src/**` | 96.49 % | `test-results.md` §Coverage | build-and-test | Met |
| T-COV-ORDERS | `unit-test-instructions.md` §Coverage targets | ≥ 80 % lines `src/orders/**` | 99.32 % | `test-results.md` §Coverage | build-and-test | Met |
| T-COV-HIGHRISK | `unit-test-instructions.md` §Coverage targets | ≥ 90 % on high-risk modules | 98.17–100 % | `test-results.md` §Coverage | build-and-test | Met |
| R1.1 | `nfr-requirements/security-requirements.md` NFR5.1 | audit insert-only | suite pass; real DB SQLSTATE 42501 | `audit-immutability-migration.test.ts`; `evidence/realdb-smoke.ts` | build-and-test | Met |
| R1.2 | `security-requirements.md` NFR5.6 | gate on every U1 + U3 route; Owner inverse | pass | `three-layer-gate-absence.test.ts` | build-and-test | Met |
| R2.1 | `security-requirements.md` NFR5.7 | every order mutation appends audit first | suite pass; 5 rows on real DB | `order-audit-append.test.ts`; smoke | build-and-test | Met |
| R2.2 | `performance-requirements.md` NFR6.7.2 / NFR6.5 | segment isolation holds | pass incl. R-01 regression | `parseMessage-segments.test.ts` | build-and-test | Met |
| R2.3 | `nfr-design/performance-design.md`; FR10.2 | bucket math, sets inline | pass | `status-bucket.test.ts` | build-and-test | Met |
| R2.4 | `code-generation-plan.md`; FR5.3 | exhaustive 9-value switch | pass | `status-exhaustive.test.ts`; `tsc` | build-and-test | Met |
| R2.5 | `observability-requirements.md` NFR3.3 | deferred-input log event shape | pass | `deferred-input-logging.test.ts` | build-and-test | Met |
| NFR6.7.1 | `performance-requirements.md` | `parseMessage` p95 ≤ 20 ms, 200 items | pass | `parseMessage-bench.test.ts` | build-and-test | Met |
| NFR6.7.3 | `performance-requirements.md` | ≥ 95 % parse success | 22/22 | `parseMessage-segments.test.ts` | build-and-test | Met |
| NFR6.7.4 | `performance-requirements.md` | never throws on bad input | pass | `parseMessage-bad-input.test.ts` | build-and-test | Met |
| NFR2.5 | `performance-requirements.md` | bucket p95 ≤ 1 ms, 1 000 orders | pass | `status-bucket-bench.test.ts` | build-and-test | Met |
| NFR6.10 | `scalability-requirements.md` | list ≤ 1 s, 1 000 orders | pass | `orders-list-bench.test.ts` | build-and-test | Met |
| NFR2.c | `code-generation-plan.md` | gate dispatch p95 ≤ 2 ms incl. U3 | pass | `gate-bench.test.ts` | build-and-test | Met |
| NFR2.a | `performance-requirements.md` | HTML ≤ 200 KB gzip | 0.45 KB | `vite build` output | build-and-test | Met |
| NFR2.b | `performance-requirements.md` | JS ≤ 350 KB gzip | 47.32 KB | `vite build` output | build-and-test | Met |
| NFR5.4 | `security-requirements.md` | no PCI identifiers in `src/orders/` | pass | `pci-deny-list-orders.test.ts`; ESLint | build-and-test | Met |
| NFR5.5 | `security-requirements.md` | 5-year retention on order audit | `retention_until` present; no DELETE on `orders`/`audit_log` | real-DB grants query | build-and-test | Met |
| T-MIGRATE | `code-generation-plan.md`; FR5.1 | 0008–0010 apply idempotently | applied, then all skipped | `bun run migrate` ×2 on Postgres 18 | build-and-test | Met |
| T-REALDB | reviewer recommendation (code-generation review); `integration-test-instructions.md` | order paths work on real Postgres | all pass except JSONB typing | `evidence/realdb-smoke.ts` | build-and-test | Met |
| T-JSONB | NFR5.7 / FR12.1 (audit payload must be queryable structured data) | JSONB columns hold objects | `string` for `orders.contact` and `audit_log.payload` | `evidence/jsonb-probe.ts`; `jsonb_typeof` | code-generation | Not Met |
| T-DEPS | `security-test-instructions.md` §Pass criteria | no Critical/High advisories | 2 critical, 4 high | `bun audit` | code-generation | Not Met |
| NFR2.1 | `performance-requirements.md` | 3G page render p95 ≤ 3 s | not run | needs staging + Playwright | none (performance-validation not scheduled) | Unverified |
| NFR1.4 | `reliability-requirements.md` | order hot path ≤ 3 s p95 | not run | depends on NFR2.1 | none | Unverified |
| NFR3.2 | `observability-requirements.md` | slow-query dashboard covers order inserts | not run | vendor dashboard, not deployed | none (observability-setup not scheduled) | Unverified |

## Readiness assessment

| Readiness | Status | Why |
|-----------|--------|-----|
| Build-ready | yes | type-check, lint, build and migrations green |
| Test-ready | yes, with one defect | 217/217; T-JSONB open |
| Deployment-ready | **no** | T-JSONB and T-DEPS open; screens not mounted in the app (M-05); 3 NFRs unverified |

## Known limitations and outstanding items

- **T-JSONB:** fix in code-generation. Use `sql.json` in `insertAudit` and the order writes, and add a
  real-Postgres test. About 1 hour, low risk.
- **T-DEPS:** fix in code-generation. Upgrade zod 4.6.6+, vite 6.4.4+ and happy-dom 21.0.4, plus one
  zod line. This was trial-verified clean. About 30 minutes, low to medium risk.
- **NFR2.1, NFR1.4, NFR3.2:** no owning stage. The Owner must either add performance-validation and
  observability-setup to the workflow, or accept these as Unverified for this Bolt.
- **M-05 (code-summary Known gaps):** the router is not mounted in `src/index.tsx`, so the order screens
  cannot be reached in the running app. An Owner assignment is pending.
- **Open review items:** R-04 (pipeline figures still carry `earned` in data) and R-05 (customer PII in
  the 5-year audit payload).
- **Open questions:** OQ-NFR-D-B2-1, OQ-NFR-D-B2-2 and OQ-NFR-D-B2-3 are carried from NFR design.
