# CI Pipeline Questions — B2 Orders

> Context: `.github/workflows/ci.yml` already exists (B1, extended in B2 with gates 12–20 for
> R2.1–R2.5, three benchmarks and the PCI deny-list). It has **never run on GitHub**: the remote has
> no workflow runs, and only `main` has been pushed. Running its commands locally on `b2-orders`
> (`749d0e1`+) showed three gaps against Build and Test.

## Q1 — CI tool

Decided: GitHub Actions (`.github/workflows/ci.yml`, remote `rhossain/SmartBiz`); team.md §Dep-5
defers hosting vendors, not CI. Kept as-is; recorded here for completeness.

[Answer]: A. GitHub Actions (existing)

## Q2 — Branch strategy

Decided: trunk-based, branches named by Bolt slug (`b2-orders`), squash-merge to `main`, CI on every
PR to `main` and on push to `main` and Bolt branches (team.md §Way of Working). Kept as-is.

[Answer]: A. Trunk-based, squash to main (existing)

## Q3 — The formatting gate fails on 115 files

Build stage 3 runs `prettier --check .`. It walks `coverage/`, `dist/` and `prototype/` (minutes),
and even scoped to `src tests` it reports **115 files** not formatted (B1 and B2 alike). It would fail
CI's first run. team.md §CS-1 says Prettier failure blocks the PR.

A. Add a `.prettierignore` (coverage, dist, prototype, aidlc, node_modules) and run `prettier --write` once over `src tests` as a formatting-only commit; keep the gate blocking (Recommended)
B. Keep the gate and leave formatting to a separate cleanup Bolt (CI stays red until then)
X. Other (please specify)

[Answer]: A. Add a `.prettierignore` (coverage, dist, prototype, aidlc, node_modules) and run `prettier --write` once over `src tests` as a formatting-only commit; keep the gate blocking (Recommended)

## Q4 — New gates from Build and Test, which fail today

Build and Test showed two checks CI does not run:
- a real-Postgres job (migrate twice, app-role grants, the order-path smoke, `jsonb_typeof` = object);
- `bun audit` with no Critical/High advisories.

Both fail today on the accepted defects T-JSONB and T-DEPS. team.md §Dep-6 says CI gates block merge
and are never weakened.

A. Add both as blocking gates now; `b2-orders` cannot merge until T-JSONB and T-DEPS are fixed (Recommended)
B. Add both as non-blocking (report-only) until the fixes land, then make them blocking
X. Other (please specify)

[Answer]: A. Add both as blocking gates now; `b2-orders` cannot merge until T-JSONB and T-DEPS are fixed (Recommended)

## Q5 — Artifact repository

No artifact registry is chosen (free tier only; hosting vendor deferred, team.md §Dep-3, §Dep-5).

A. Upload `dist/` as a GitHub Actions artifact named with the commit SHA, kept 30 days; no registry yet (Recommended)
B. No artifacts until the deployment pipeline picks a host
X. Other (please specify)

[Answer]: A. Upload `dist/` as a GitHub Actions artifact named with the commit SHA, kept 30 days; no registry yet (Recommended)

## Planned Output

What CI Pipeline will produce from these answers:

1. `.prettierignore` (coverage, dist, prototype, aidlc, node_modules), and `format` scoped to
   `prettier --check src tests`. One formatting-only commit runs `prettier --write src tests`, then
   type-check, lint and the full suite re-run to prove no behaviour changed.
2. `.github/workflows/ci.yml`, extended. Existing gates are kept unchanged, and none is weakened.
   - A new blocking **`realdb`** job: a `postgres:18` service container; `bun run migrate` twice
     (second run must skip all); an app-role grants check (`audit_log` INSERT/SELECT only); an
     app-role `UPDATE`/`DELETE` on `audit_log` must fail with 42501; the order-path smoke promoted
     from Build and Test evidence into `tests/realdb/`; and `jsonb_typeof = 'object'` for
     `orders.contact` and `audit_log.payload`.
   - A new blocking **`bun audit`** step that fails on any Critical or High advisory.
   - A **`dist/`** upload as `smartbiz-dist-<sha>`, kept 30 days.
   - **Expected now:** the `realdb` job and the audit step fail until T-JSONB and T-DEPS are fixed.
     `b2-orders` cannot merge to `main` until then.
3. `ci-config.md` and `quality-gates.md` in this directory, listing every gate, its command, its
   source rule and whether it blocks.
4. `verification/phase-check-construction.md`, the Construction → Operation boundary check. Its
   expected verdict is **not ready**: open defects T-JSONB and T-DEPS, and the order screens are not
   mounted (M-05).

Nothing is pushed to GitHub.

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
