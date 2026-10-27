# Infrastructure Design — Questions (u2-app-shell)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Constraints as for
> U1: zero spend (project.md Forbidden), "deployed" = running on this machine (team.md Deployment), hosted
> GitHub Actions disabled, the local gate run is the merge evidence. U1's infrastructure
> (`../../u1-skeleton/infrastructure-design/`) stays in force; U2 adds to it.

## Q1. Does U2 change the runtime topology?

A. No. Same one bun process on 127.0.0.1, same Docker `postgres:18.6` (`smartbiz-db` for dev/live, a throwaway container per gate run). U2 adds one index migration (`0016`) and no table, grant, port, process or service
B. Add a separate process for the audit trail
X. Other (please specify)

[Answer]: A. The audit read is one more route on the existing pipeline; nothing in U2 needs a new runtime piece.

## Q2. Where does Chrome come from for the real-browser check?

A. The Owner's installed Google Chrome, located through `CHROME_PATH` (default `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). Each run uses a fresh temporary profile directory that the script deletes at the end, so the Owner's own Chrome profile, cookies and history are never touched. No Chrome download, no Docker Chrome image
B. A pinned Chrome Docker image
X. Other (please specify)

[Answer]: A. It is already on this machine and free; a temporary profile keeps the check isolated from the Owner's browsing. A Docker image would add about 1 GiB on a disk with 9 GiB free.

## Q3. How is the new index applied to the live database?

A. Like every migration: `bun run migrate` with the admin URL, after the pre-merge `pg_dump` the merge checklist already takes. `CREATE INDEX IF NOT EXISTS` (not `CONCURRENTLY`; the table is small and the shop is one person) so a re-run does nothing
B. `CREATE INDEX CONCURRENTLY`
X. Other (please specify)

[Answer]: A. `CONCURRENTLY` cannot run inside the migration runner's transaction and buys nothing at this volume; the lock lasts well under a second.

## Q4. Gate changes

A. Two new gate steps and two checks: **5b walks** (the three walk files, timed, one rerun allowed over 60 s), **14b browser** (headless Chrome against its own throwaway database; exit 2 reported as "not run"); the default benchmark adds a small audit check, `--large` adds the 20 000-row audit profile and the `EXPLAIN` check; step 11 also compares `package.json` with `tests/spec/dependencies.json`. `ci.yml` gains the same steps so it stays the single list of gates
B. Fold everything into existing steps
X. Other (please specify)

[Answer]: A. Separate steps make the walk time and the browser result visible in the result line (NFR8.12, NFR8.15); `ci.yml` stays the single source of gates (team.md).
