## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Iteration:** 1

### Prior findings

None.

### New findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | infrastructure-design/infrastructure-specification.md > Migration content (per file) | The five migration rows do not say each file must be idempotent on its own. `tests/realdb/migrations.realdb.test.ts` applies the raw file twice (`applyOne`, schema fingerprint), not only through the ledger, and every existing file (0008, 0015) is `IF NOT EXISTS` or DO-guarded. Composite FKs, named UNIQUE constraints and CHECKs added with a later `ALTER TABLE ADD CONSTRAINT` would fail on the second apply. cicd-pipeline.md's "re-run as no-ops" is therefore stronger than the ledger skip. | State that each file is idempotent (`CREATE TABLE IF NOT EXISTS` with inline constraints, `CREATE [UNIQUE] INDEX IF NOT EXISTS`, repeatable GRANT, DO-guard for any `ALTER ... ADD CONSTRAINT`), and that the realdb test applies each of 0018–0022 twice directly. | Open |
| R-02 | Minor | infrastructure-design/infrastructure-specification.md > row 0020 (customer_notes) | "FKs to customers and to itself" does not give the shape. R-01 of the NFR review pairs `UNIQUE (business_id, customer_id, id)` with a self-FK, but only the composite `(business_id, customer_id, revises_note_id)` → `(business_id, customer_id, id)` stops a revision pointing at another customer's or business's note. A plain `revises_note_id → id` would build and pass most tests. | Write the self-FK as that composite, and name the realdb assertion that a cross-customer revision is refused with 23503. | Open |
| R-03 | Minor | infrastructure-design/cicd-pipeline.md > Gates, rows "7 coverage" and "15 benchmark" | Gate numbering does not match `scripts/gate.ts`: coverage is step 6 and step 7 is "named invariants". The benchmark step runs the hard-coded `tests/perf/order-api.bench.ts` (base and `--profile=large`). A catalog profile (P23) in a new bench file would need a `gate.ts` edit, and a `ci.yml` edit, which contradicts Q2's "no gate step". | Correct the step numbers. Say whether P23 extends `order-api.bench.ts` (no gate change) or is a new file wired into `gate.ts` and `ci.yml`. | Open |
| R-04 | Minor | infrastructure-design/cicd-pipeline.md > Rollback, "Data" row | "Catalog rows and their change-log rows stay valid" ignores the nine new `audit_log` action strings. `audit_log.action` is free TEXT (0006), so a code-only revert after catalog writes leaves rows the older audit screen has no Bangla label for. The whole-Bolt rollback (restore the dump) avoids this. | Note that after catalog writes, a code-only revert shows unlabelled audit actions, so the dump restore is the clean rollback, or confirm the older label lookup has a fallback. | Open |
| R-05 | Minor | infrastructure-design/infrastructure-specification.md > Demo seed | `seed:demo:catalog` is not stated to be re-runnable. A second run would hit the `products_business_sku_lower_key` 409s. The spec does not say it needs `.env.demo` and an existing business, stops with a named message otherwise, or skips existing SKUs. | State the precondition and re-run behaviour (stop on the first SKU 409 with a clear message, or skip). | Open |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Manual check against `src/db/migrate.ts` | Runner applies files lexically, one transaction each, ledger in `_migrations`, no down-migrations | The 0018–0022 order matches the FK dependencies (suppliers, customers, notes, products, variants). The rollback claim (additive tables, dump restore) is consistent with the runner. |
| Manual check against `src/db/declared-grants.ts`, `tests/realdb/grants.realdb.test.ts` | Exact-set comparison against `DECLARED_GRANTS` | Adding five rows with SELECT/INSERT/UPDATE (SELECT/INSERT on notes) is the right change. |
| Manual check against `scripts/smoke.ts`, `scripts/seed-demo.ts` | Smoke has fixed steps (orders, staff); the seed refuses when a business exists | Adding two Owner GETs to the smoke and a separate catalog seed script fits. |

### Summary

The infrastructure design fits the actual runner, grant gate, smoke and seed. It keeps zero spend and one machine, adds no service, and does not weaken the audit insert-only grant. Five Minor gaps remain in how precisely the migration idempotency, the notes self-FK, the gate and benchmark mapping, the rollback caveat and the catalog seed are stated; none would make Code Generation build the wrong thing.

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| - | - | - | No findings | No action required | Resolved |
