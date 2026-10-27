# Phase Check — Construction → Operation (B2 Orders)

> Written by CI Pipeline Step 5 on 2026-10-27, branch `b2-orders` at `ea02ce0`.

## Verdict

**NOT READY: the Construction → Operation transition is held.** Every Unit is built and tested and
the cross-Unit gate passes. Three things still block the transition:
- two accepted defects stay open;
- one superseded traceability file carries stale targets;
- the order screens are not reachable in the running app.

## Checks

| Check | Result | Evidence |
|-------|--------|----------|
| All Units built and tested | **pass.** One Unit (`u3-orders`); 217/217 tests; type-check, lint and build clean; 96.49 % lines | `construction/build-and-test/test-results.md` |
| Cross-Unit FR/NFR/AC gate | **pass.** 34 of 39 OK with an existing target file, 5 Deferred with reasons, 0 uncovered | `construction/build-and-test/cross-unit-traceability.md` |
| Stage-level `construction/code-generation/traceability.json` | **pass.** 39 entries; every OK target exists | checked on disk |
| Per-Unit `construction/u3-orders/code-generation/traceability.json` | **unresolved.** It is the superseded first Code Generation pass, from before loop-back 1. Two of its OK targets name files that do not exist: `tests/unit/orders-list.test.ts` (NFR2.1, NFR6.10; the real file is `orders-list-bench.test.ts`). It still claims NFR2.1 OK although Build and Test found it Unverified. | checked on disk |
| Build and Test result | **accepted failure.** T-JSONB and T-DEPS Not Met; NFR2.1, NFR1.4 and NFR3.2 Unverified (Owner, Q2/Q3) | `build-and-test-summary.md` |
| CI enforces the Build and Test commands | **pass.** type-check, lint, format, test, coverage + floor, build, bundle size, R1.1–R1.3, R2.1–R2.5, benchmarks and the PCI deny-list are all gated. New: real-Postgres migrate twice, grants, `tests/realdb`, and `bun audit`. | `construction/ci-pipeline/quality-gates.md` |
| CI green | **no, by design.** `bun audit` and `realdb` step 5 fail on T-DEPS and T-JSONB (Owner, Q4 = blocking) | `ci-config.md` §Expected status |
| Code-generation review findings | R-03 (screens unmounted, M-05), R-04 (pipeline money still labelled `earned` in data) and R-05 (customer PII in the 5-year audit payload) remain open | `construction/code-generation/reviews/review-01.md` |

## Update 2026-10-27, after the workflow closed

At the Owner's request, items 1 and 2 below are now fixed on `b2-orders`:
- **T-JSONB**, fixed in `f5144d8`: JSONB values are cast `::text::jsonb`. `tests/realdb` passes 5/5 on
  a fresh Postgres 18, and `jsonb_typeof` is `object`.
- **T-DEPS**, fixed in `640cac9`: zod 4.6.7, vite 6.4.5 and happy-dom 21.0.4. `bun audit` finds no
  vulnerabilities.

After both fixes, unit and integration are 217/217 at 96.76 % lines; type-check, lint, format and
build are clean (JS 47.68 KB gzip). CI's two blocking gates should now pass. This is unconfirmed
until the branch is pushed and the workflow runs on GitHub. Items 3–5 remain open, so the verdict
stays **not ready**.

## What must happen before Operation

1. **Fix T-JSONB.** Use `sql.json(...)` in `insertAudit` and the order writes. The realdb job then
   goes green. Estimated at about 1 hour.
2. **Fix T-DEPS.** Upgrade to zod 4.6.6+, vite 6.4.4+ and happy-dom 21.0.4, plus one zod line.
   `bun audit` then passes. Already trial-verified; about 30 minutes.
3. **Retire or correct the superseded per-Unit traceability file**, so only the stage-level file
   speaks for B2.
4. **Assign M-05.** Mount the router and wire the order screens in `src/index.tsx`, so US1.10–US1.18
   are usable in the app.
5. **Owner decisions on R-04 and R-05** (pipeline basis in data; PII in the audit log) before the
   first real business uses the system.
