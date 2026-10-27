# User Stories — Personas

> SmartBiz BD, intent `261004-mvp`. Three personas + one non-persona system
> actor, per the user-stories Q1 decision and the role × capability matrix
> in `codekb/SmartBiz/component-inventory.md`. The role × capability
> matrix is the source of truth; personas here are the user-value
> surface above the matrix and never widen it.

## Persona 1 — Owner (`P-Owner`)

### Identity

- **Name in stories:** Owner
- **Role in role × capability:** Owner
- **Day-one user of the deployment**; the first sign-up is granted
  Owner automatically (FR1.2). Owns the business, the deployment, the
  reconciliation decisions, and the audit-trail export.
- **Money capability:** `full` (sees every figure: price, cost,
  profit; sees the audit trail).

### Goals

- Run the whole business in one place without juggling notebooks,
  Messenger, courier portals, and spreadsheets. [intent-capture:Q1]
- Keep two non-overlapping money figures — **earned** vs **realised** —
  visible at all times with a basis pill and a completeness control.
  [intent-capture] [FR10.1]
- Reconcile courier settlement runs without losing money to short
  deliveries or untracked returns. [scope-md §5.6] [FR6.3]
- Track outstanding customer dues and supplier payables without
  maintaining a separate ledger. [FR8.1] [FR9.2]
- Reach a pilot success metric of 50 orders in 60 days per SME.
  [intent-capture:Q3]

### Pain points

- Missed/duplicate orders because messages and notebooks don't agree.
- COD reconciliation failures: a consignment marked `delivered` by the
  courier but the money never reaches the Owner.
- Expense/profit tracking gaps: ad spend, courier fees, packaging,
  and salaries are scattered.
- Unmanaged dues: customers owe money, the Owner has no list of who
  owes what.
- No reports: at month-end the Owner cannot answer "what did I earn
  vs what did I realise?" without manual arithmetic.
- Returns that either vanish from stock or are double-counted.

### Context

- Bangla-first, with `L(bn, en)` bilingual copy. [FR11.2]
- One business per deployment; the Owner is the tenant boundary.
  [FR1.5] [interview Q7]
- Works on a 3G connection in Dhaka on a mid-range Android phone.
  [FR11.3] [NFR2.1]

### Priority

`P0` — every MVP story either is the Owner or directly serves the
Owner.

## Persona 2 — Staff (`P-Staff`)

### Identity

- **Name in stories:** Staff
- **Role in role × capability:** Manager / Sales Staff / Inventory
  Staff / Accountant (the four non-Owner roles, FR1.3). Treated as a
  single persona for story purposes because the matrix encodes the
  per-role differences; the story's role-specific ACs are what carry
  the matrix.
- **Day-one user:** joins shortly after the Owner, 1–2 staff per SME
  in the pilot. [intent-capture:Q2]
- **Money capability:** varies by role (`full` for Manager, `price`
  for Sales/Inventory, `cost` for Accountant). The role × capability
  gate is exercised by every money-touching story. [FR12.2]

### Goals

- Capture orders in the same seven modes the Owner uses
  (paste-parse, manual, repeat, quick-add, photo, spreadsheet, voice)
  without breaking role-gate. [FR5.1]
- Record payments, expenses, and stock adjustments in the audit
  trail with a reason note where required. [FR12.3] [FR4.3]
- Settle dues with a partial-payment action and never see figures
  outside the role's capability. [FR8.2] [FR12.2]
- Restock from a supplier and have the supplier-payment and
  stock-in land atomically. [FR9.2]

### Pain points

- Cannot capture an order from a Messenger/WhatsApp paste without
  re-typing every line.
- Sees a "money figure" that turns out to be the cost (not the
  selling price) and quotes the wrong number to a customer.
- Stock counts drift because manual adjustments have no audit row.
- Audit-trail rows for someone else's actions are not visible (the
  role gate closes them off) but the Staff still needs to know
  *that* an audit row exists for the action they just took.

### Context

- Same Bangla-first copy and same 3G budget as the Owner.
- Invitation flow: Owner invites by email; the Staff redeems a
  one-time code with an expiry. [FR1.3]
- The role-gate is enforced at three layers: router, screen-side
  self-gate, and an absence-asserted test that fails when a money
  screen renders without the right capability flag. [FR1.4]
  [FR10.3] [NFR6.6]

### Priority

`P0` — every MVP money-touching story is exercised by at least one
Staff role. Staff-only stories (e.g. "record a stock adjustment")
are interleaved under the relevant epic family.

## Persona 3 — Customer-facing Viewer (`P-Viewer`)

### Identity

- **Name in stories:** Viewer
- **Role in role × capability:** Viewer (or Owner-as-proxy during
  order capture).
- **Day-one user:** the Viewer is a thin read-only surface that the
  Owner can use as a proxy when capturing an order on behalf of a
  customer (e.g. the Owner at a trade fair, taking a phone order
  for a customer who is on the other end of a call). The Viewer
  itself is not a registered user in the pilot; the persona exists
  because `screens-orders.js` in the prototype actually targets it.
- **Money capability:** `none` (no money figures visible).

### Goals

- Render the order capture screen (the seven input modes) without
  seeing cost, profit, or audit-trail rows. [FR12.2]
- Switch between Bangla and English on a single page reload.
  [FR11.2]

### Pain points

- Sees a money figure and quotes it incorrectly.
- The Bangla digits don't render because the Bengali font fallback
  chain fails offline. [FR11.3]

### Context

- Same 3G budget; offline Bengali fallback is mandatory. [FR11.3]
- The role-gate must hold against a Viewer who navigates to a
  money screen by URL (the absence-asserted test is what catches
  this). [NFR6.6]

### Priority

`P2` — the Viewer persona surfaces in MVP only as the role-gate
test target. The Viewer is not a separate registration flow.

## System actor (`P-System`)

### Identity

- **Name in stories:** system (or `P-System`)
- **Not a persona** in the user-value sense; included because every
  audit-immutability story and every phase-2 AI story needs an
  actor to attribute the action to. [interview] [NFR5.2] [FR12.3]

### Goals

- Append audit rows that the application role cannot `UPDATE` or
  `DELETE`. [FR12.1] [TC9]
- (Phase 2) Run the AI insights layer on the same audit-grade
  invariant. [OOS14]

### Pain points

- None — this is a structural actor.

### Priority

`P0` — the system actor carries every audit-immutability AC and is
the proxy for any background reconciliation story (e.g. courier
settlement re-check).

## Persona priority ranking

| Rank | Persona | Rationale |
|------|---------|-----------|
| 1 | Owner (`P-Owner`) | Day-one user, tenant boundary, every MVP money story |
| 2 | Staff (`P-Staff`) | 1–2 staff per SME; every money-touching story |
| 3 | system (`P-System`) | Audit-immutability proxy; phase-2 AI target |
| 4 | Viewer (`P-Viewer`) | Role-gate test target only; not a separate flow |

## Sources

- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — role × capability matrix
- [intent-capture] `aidlc/spaces/default/intents/261004-mvp/ideation/intent-capture/intent-statement.md`
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md`
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md` — Testing Posture, three-layer Role-gate
- [user-stories-questions] Q1 decision (3 personas + system)
- [scope-document] `aidlc/spaces/default/intents/261004-mvp/ideation/scope-definition/scope-document.md` — Module 5.1 §6
