<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-11T00:00:00Z — Cluster-based unit grouping (Q1=A, Q2=A) mirrors the 1:1 module-to-component decomposition (ADR-001) already locked in `project.md#Corrections`; the 5 units are a refinement of the 14-component catalogue, not a re-decomposition. The 3 deferred input modules (PhotoOrderComponent / SpreadsheetOrderComponent / VoiceOrderComponent — US1.14/15/16) ride inside U3-orders as placeholders; the wiring is named and the vendor selection is gated in Construction.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-10-11T00:00:00Z — Chose Modular Monolith (Q5=A) over Mixed (UI + API + Worker) or Spec-driven; preserves the 1:1 binding from domain-design and keeps the free-tier container-count budget intact. A single `kind: packaging` concern (Vite + TypeScript + single `package.json` per `team.md#Code Style`) is colocated with U1, the natural home for the build shell, rather than spawning a sixth unit.

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-11T00:00:00Z — Confirm the OCR / spreadsheet / STT vendor selection for the 3 deferred input modules in Construction; the free-tier envelope must absorb the chosen vendor (NFR5.1). Stage 2.9 Delivery Planning chooses the Bolt sequence; the DAG is the topology only.
