# Constraint Register — App Wiring (B6)

| ID | Type | Constraint | Source |
|----|------|------------|--------|
| C-1 | Budget | Zero spend; everything runs on this machine, with Postgres in local Docker | intent [desc]; feasibility Q4, Q6 |
| C-2 | Technical | Single TypeScript stack (strict); bun runtime and HTTP server; React 18 + Vite; one `package.json` | team.md §CS; feasibility Q3 |
| C-3 | Regulatory | Audit log is insert-only at the database role and kept 5 years (NBR, TC9) | team.md §Dep-6 |
| C-4 | Regulatory | No customer PII in the audit log | B2 follow-up R-05 (commit `eb05f36`) |
| C-5 | Regulatory | No card data anywhere in `src/` (deny-list gate) | NFR5.4 |
| C-6 | Security | Every route is gated by role × capability at three layers, tested by absence | team.md §TP-9 |
| C-7 | Quality | 80 % line coverage floor; local CI is the merge evidence (hosted CI unavailable) | team.md §TP-2/§TP-3; feasibility Q5 |
| C-8 | Way of working | Trunk-based; Bolt branch named by slug; squash-merge to `main` | team.md §WoW |
| C-9 | Organizational | Single decider and developer: the Owner | intent Q5, Q6 |
| C-10 | Integration | No external identity, email or SMS provider | feasibility Q1 |
