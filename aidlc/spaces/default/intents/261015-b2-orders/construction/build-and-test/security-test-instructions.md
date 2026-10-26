# Security Test Instructions — B2 Orders (U3-orders)

> Security engineer's view of the U3 security requirements (NFR5.x) and the
> CI gates named in `code-generation-plan.md` and `code-summary.md`. All
> checks below run locally without a deployed environment, except the
> optional DAST pass.

## Threat focus for U3 (STRIDE, abridged)

| Threat | U3 surface | Control | Check |
|--------|-----------|---------|-------|
| Elevation of privilege | U3 routes | three-layer gate (auth → capability → business rule), NFR5.6 | R1.2 `three-layer-gate-absence.test.ts` walks every route |
| Repudiation | order create / transition / update | audit row appended before the write, NFR5.7 / FR12.3 | R2.1 `order-audit-append.test.ts` |
| Tampering | `audit_log` table | DB-level insert-only grant, NFR5.1 | R1.1 `audit-immutability-migration.test.ts` |
| Information disclosure | cross-business reads | single-tenant guard, FR12.4 | IT-B2-3 in `order-create-integration.test.ts` |
| Information disclosure | payment data | no card / bank fields in `src/orders/`, NFR5.4 | ESLint deny-list + `pci-deny-list-orders.test.ts` |
| Denial of service | paste-parse input | 200-item cap enforced inside `parseMessage`, never throws, NFR6.7.4 | `paste-parse.test.ts` cap case + bad-input cases |

## How to run

```bash
bun test tests/unit/three-layer-gate-absence.test.ts      # R1.2
bun test tests/unit/audit-immutability-migration.test.ts  # R1.1
bun test tests/unit/order-audit-append.test.ts            # R2.1
bun test tests/unit/pci-deny-list-orders.test.ts          # NFR5.4
bun run lint                                              # PCI deny-list rule
bun audit                                                 # dependency CVEs (no new deps in B2)
grep -rnE '(password|secret|api[_-]?key)\s*[:=]\s*["'"'"'][^"'"'"']+' src/   # hard-coded secret sweep; expect no output
```

## Pass criteria

- Every command above exits 0; the secret sweep prints nothing.
- No Critical/High dependency advisories from `bun audit`.
- Input validation: every U3 entry point validates with the zod schemas in `src/data/zod-schemas.ts` before touching the database.

## Optional DAST

OWASP ZAP baseline against staging after deploy. This workflow has no
Operation-phase stage that owns it, so it is advisory and not a gate here.
