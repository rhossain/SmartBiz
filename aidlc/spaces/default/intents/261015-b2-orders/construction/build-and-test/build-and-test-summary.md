# Build and Test Summary — B2 Orders (U3-orders)

> Inputs: U3-orders `code-generation-plan.md`, `unit-test-instructions.md`,
> `code-summary.md`, the NFR requirements under
> `construction/u3-orders/nfr-requirements/`, and the NFR design files under
> `construction/u3-orders/nfr-design/`. Execution evidence is in `test-results.md`.

## Overall status

- **Build:** green (type-check, lint, `vite build`).
- **Tests:** 108/108 green, but all are B1. **No B2 code or tests exist on disk.**
- **Result:** **FAILED.** The code-generation outputs for `u3-orders` claim
  delivery that the workspace does not contain (35 of 46 manifest files
  missing). The root cause is upstream in code-generation. A dependency audit
  also found 2 critical and 4 high advisories.

## Test type inventory

| Type | Instruction file | Status |
|------|------------------|--------|
| Unit | U3-orders `unit-test-instructions.md` | defined; B2 test files missing |
| Integration | `integration-test-instructions.md` | defined; B2 integration test missing |
| Performance (micro-bench + 3G) | `performance-test-instructions.md` | micro-benchmarks missing; 3G run unowned |
| Security | `security-test-instructions.md` | B1 gates pass; B2 gates missing; audit fails |
| Build | `build-instructions.md` | green |

## Coverage expectations per unit

| Unit | Floor | Measured |
|------|-------|----------|
| u3-orders `src/orders/**` | ≥ 80% lines | not measurable (no files) |
| u3-orders high-risk (`parse-message`, `status-fsm`, `status-bucket`) | ≥ 90% lines | not measurable |
| Whole `src/**` (mvp floor) | ≥ 80% lines | 92.95% (B1 code only) |

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|-----------|--------|----------|--------|----------|--------------|---------|
| T-BUILD | `build-instructions.md`; team.md §CS-1 | type-check, lint, build exit 0 | all exit 0 | `test-results.md` §Build | build-and-test | Met |
| T-SUITE | team.md §TP-3 | full suite green | 108 pass / 0 fail (B1 only) | `test-results.md` §Tests | build-and-test | Met |
| T-COV-ALL | team.md §TP-2; NFR6.1 | ≥ 80% lines `src/**` | 92.95% | `test-results.md` §Coverage | build-and-test | Met |
| T-COV-ORDERS | `unit-test-instructions.md` §Expected coverage | ≥ 80% lines `src/orders/**` | no files | `test-results.md` §Coverage | build-and-test | Not Met |
| T-COV-HIGHRISK | `unit-test-instructions.md` §Expected coverage | ≥ 90% on 3 modules | no files | `test-results.md` §Coverage | build-and-test | Not Met |
| R1.1 | `nfr-requirements/security-requirements.md` NFR5.1 | gate passes | 5/5 | `bun test tests/unit/audit-immutability-migration.test.ts` | build-and-test | Met |
| R1.2 | `security-requirements.md` NFR5.6 | gate on every U1 + U3 route; Owner inverse | U1 only | `three-layer-gate-absence.test.ts` 3/3; `routes.ts:18` stub | build-and-test | Not Met |
| R2.1 | `security-requirements.md` NFR5.7 | every order mutation appends audit | test missing | manifest check | build-and-test | Not Met |
| R2.2 | `performance-requirements.md` NFR6.7.2 / NFR6.5 | segment isolation holds | test missing | manifest check | build-and-test | Not Met |
| R2.3 | `nfr-design/performance-design.md`; FR10.2 | bucket math correct, constants inline | test missing | manifest check | build-and-test | Not Met |
| R2.4 | `code-generation-plan.md` item 11; FR5.3 | exhaustive 9-value switch | test missing | manifest check | build-and-test | Not Met |
| R2.5 | `observability-requirements.md` NFR3.3 | deferred-input log event shape | test missing | manifest check | build-and-test | Not Met |
| NFR6.7.1 | `performance-requirements.md` | `parseMessage` p95 ≤ 20 ms, ≤ 200 items | bench missing | manifest check | build-and-test | Not Met |
| NFR6.7.3 | `performance-requirements.md` | ≥ 95% parse success on seeded fixtures | test missing | manifest check | build-and-test | Not Met |
| NFR6.7.4 | `performance-requirements.md` | never throws on bad input | test missing | manifest check | build-and-test | Not Met |
| NFR2.5 | `performance-requirements.md` | bucket p95 ≤ 1 ms, ≤ 1 000 orders | bench missing | manifest check | build-and-test | Not Met |
| NFR6.10 | `scalability-requirements.md` | orders list ≤ 1 s, 1 000 orders | bench missing | manifest check | build-and-test | Not Met |
| NFR2.c | `code-generation-plan.md` item 12 | gate dispatch p95 ≤ 2 ms incl. U3 | U1 routes only | `gate-bench.test.ts` 1/1 | build-and-test | Not Met |
| NFR2.a | `performance-requirements.md` | HTML ≤ 200 KB gzip | 0.45 KB | `vite build` output | build-and-test | Met |
| NFR2.b | `performance-requirements.md` | JS ≤ 350 KB gzip | 47.32 KB | `vite build` output | build-and-test | Met |
| NFR5.4 | `security-requirements.md` | no PCI identifiers in `src/orders/` | dir + test missing | manifest check | build-and-test | Not Met |
| NFR5.5 | `security-requirements.md` | 5-year retention on order audit | migration missing | `src/db/migrations/` listing | build-and-test | Not Met |
| T-MIGRATE | `code-generation-plan.md` Step 2; FR5.1 | 0008–0010 apply idempotently | files missing | `src/db/migrations/` listing | build-and-test | Not Met |
| T-DEPS | `security-test-instructions.md` §Pass criteria | no Critical/High advisories | 2 critical, 4 high | `bun audit` | build-and-test | Not Met |
| NFR2.1 | `performance-requirements.md` | 3G page render p95 ≤ 3 s | not run | needs staging + Playwright | none (performance-validation skipped) | Unverified |
| NFR1.4 | `reliability-requirements.md` | order hot path ≤ 3 s p95 | not run | depends on NFR2.1 + R2.x | none | Unverified |
| NFR3.2 | `observability-requirements.md` | slow-query dashboard covers order inserts | not run | vendor dashboard, not deployed | none | Unverified |

## Readiness assessment

| Readiness | Status | Why |
|-----------|--------|-----|
| Build-ready | yes | toolchain and B1 build green |
| Test-ready | **no** | B2 tests and code absent |
| Deployment-ready | **no** | B2 not built; dependency advisories open |

## Known limitations and outstanding items

- The U3-orders code-generation outputs are inconsistent with the workspace. They have to be regenerated (with a fresh Plan Approval) before this stage can pass.
- Dependency advisories (happy-dom, vite, zod) need an upgrade decision.
- NFR2.1, NFR1.4 and NFR3.2 have no owning later stage in this workflow (performance-validation and observability-setup are skipped), so they stay Unverified even after a green re-run.
- Open questions carried from the NFR design stage: OQ-NFR-D-B2-1 (3G vs 4G budget), OQ-NFR-D-B2-2 (200-item cap is a product decision?), OQ-NFR-D-B2-3 (bucket constants).
