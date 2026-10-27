# Superseded — first Code Generation pass for U3-orders

This directory holds the **first** Code Generation pass for B2 (2026-10-15).
Its outputs claimed files that were never written: 35 of 46 manifest paths
and 34 of 36 traceability targets were missing. Build and Test caught this
on 2026-10-26, and loop-back 1 regenerated the code.

The authoritative Code Generation record for B2 is the stage-level one:
`../../code-generation/` (`code-summary.md`, `source-manifest.json`,
`traceability.json`).

The false outputs (`code-summary.md`, `source-manifest.json`,
`traceability.json`) were removed on 2026-10-27, so no check reads them as
current. They remain in git history at commit `5fd2b3e`. The plan, questions,
unit-test instructions and reviews are kept as the record of what was planned.
