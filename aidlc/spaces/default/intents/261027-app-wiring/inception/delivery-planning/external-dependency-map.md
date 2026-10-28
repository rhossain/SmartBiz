# External Dependency Map — App Wiring (B6)

> A **Bolt** is one build pass over a piece of the work that ends in something that runs (see
> `bolt-plan.md`). This map lists anything outside the build itself that a Bolt waits on. The work is
> fully contained on this machine (zero spend, project.md Forbidden), so nothing here belongs to
> another team or a hosted service.

| Dependency | Kind | Owner | Lead time | Consumed by | If it slips |
|------------|------|-------|-----------|-------------|-------------|
| Docker Desktop with `postgres:18` image | local tool | the Owner's machine | none (installed, image present) | Bolt 1 and 2: `tests/realdb`, the skeleton demo | Gate runs stop; free disk or restart Docker. Without it no merge, because the realdb gate is required |
| Free disk space (about 4 GB now) | local resource | the Owner | minutes | every gate run | The Owner runs `docker builder prune` (about 16 GB of build cache) when asked; never pruned without asking |
| npm registry for already-pinned packages | free public service | npm | none for current packages | only if a package is added or updated | Keep the lockfile; no new package without need. Works offline once installed |
| The Owner's typed approvals: Plan Approval per Unit, verification command, skeleton checkpoint, Bolt sign-off | human decision | the Owner | when the Owner is at the keyboard | each Unit's Code Generation; U1 checkpoint; each Bolt's merge | Work waits at that stop; nothing is auto-approved |
| The local runner script (`scripts/ci-local.sh`) | file the Owner saves from a terminal | the Owner | minutes | optional convenience for gate runs | Gates are run one by one, inline, as today |
| Hosted GitHub Actions | hosted CI | — | — | none (disabled) | Not used; the local gate run is the merge evidence |

No external API, data feed, approval body or partner hand-off gates either Bolt.
