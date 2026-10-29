# Infrastructure Design — Questions (u5-orders-catalog)

> Answered by the assistant on the Owner's standing instruction. Summary confirmation is off. Inputs: U5's NFR
> design (with its iteration-2 residuals: link checks skipped when an edit changes neither customer nor items;
> O15's mutant targets `variantLabels`), U5's functional design, components.md, C3, C7, C8, C9, and U4's
> infrastructure design (Bolt 2 merge steps).

## Q1. Does U5 change where or how the app runs?

A. No. One migration (0023) and code changes only; no process, port, extension or service
B. Other
X. Other (please specify)

[Answer]: A. Same one-machine, zero-spend deployment.

## Q2. How is the live demo database brought along?

A. The Bolt 2 merge order recorded in U4's cicd-pipeline.md: verified `pg_dump`, `bun run gate --large`, squash
merge, `bun run migrate` (0018–0023), start, smoke, then optionally `bun run seed:demo:catalog`. 0023 nulls the
demo orders' meaningless TEXT ids (the demo never set them), so nothing visible changes until orders are linked
B. Reseed from zero
X. Other (please specify)

[Answer]: A. Keeps the Owner's demo data.
