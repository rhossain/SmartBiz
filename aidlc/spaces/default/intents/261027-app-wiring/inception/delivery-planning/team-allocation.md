# Team Allocation — App Wiring (B6)

> A **Bolt** is one build pass over a piece of the work that ends in something that runs (see
> `bolt-plan.md`). A **mob** is the group that builds a Bolt together. Team Formation was skipped in
> Ideation (single owner-developer, intent Q2), so there is one mob.

| Bolt | Units | Mob (builds) | Signs off | Reviewers at the stage gates |
|------|-------|--------------|-----------|------------------------------|
| 1 `app-wiring` | U1, U2, U3 | aidlc-developer-agent (AI), run from this session | The Owner (Rahima), at the U1 skeleton checkpoint and at the Bolt's completion | architecture reviewer (design stages), quality agent (Build and Test) |
| 2 `catalog` | U4, U5 | aidlc-developer-agent (AI), run from this session | The Owner, at the Bolt's completion | as above |

- **Ownership mode:** solo — one session builds every Unit in order (unit-major, serial). No team owns a Unit independently, so there is no Program Board (the cross-team schedule a multi-team plan would need).
- **Human stops that stay with the Owner** (org.md, team.md): Plan Approval before each Unit's Code Generation (typed reply), the verification command at the first checkpoint, the U1 skeleton checkpoint, and each Bolt's completion sign-off (autonomy `gated`). Everything else is decided on the Owner's standing instruction of 2026-10-27.
- **Merges:** the Owner (or the assistant on the Owner's instruction) squashes each Bolt branch on this machine and pushes `main`; there are no pull requests (team.md).
- **Capacity note:** with one session, U3 and U4 do not overlap even though the DAG allows it.
