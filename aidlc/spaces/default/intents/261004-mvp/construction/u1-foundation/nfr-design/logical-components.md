# Logical Components — U1-foundation (B1)

> Per-Unit logical component inventory for U1-foundation.
> U1's logical components are the four B1 surfaces
> (Identity, Audit, i18n, Router) decomposed into typed
> modules with explicit failure domains, blast radius, and
> shared-resource identification. Brownfield run (SmartBiz
> BD). Single-tenant topology. Free-tier envelope.
> Modular monolith (in-process typed function-calls).

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — typed function-calls, in-process typed-state-container
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md` — UC-1.1..1.10
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md` — User / Business / Invitation / AuditEntry / Locale / Translation / Route
- [frontend-components] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md` — Shell / Screen / Field / Pill
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — contracts #1-4 + #9
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4

## Component inventory

U1 is composed of **5 logical components** (4 B1 surfaces
+ 1 cross-cutting). Each component has a typed contract,
a failure domain, and a blast radius.

| ID | Component | Surface | B1 surface | Failure domain | Blast radius |
|---|---|---|---|---|---|
| **L1** | Identity | typed function-calls: `signUp`, `signIn`, `signOut`, `requestRecovery`, `completeRecovery`, `createInvitation`, `acceptInvitation` | Identity | typed `Result<T, TypedError>`; failure is user-visible (UI shows typed error) | U1's auth-only routes (sign-in, sign-up, recovery, invitation) |
| **L2** | Audit | typed function-call: `appendAudit`, `exportAudit`, `getAudit` | Audit | typed `Result<T, TypedError>`; failure rolls back the entity write (NFR5.1) | Every state-mutating action across all units (L1, L3, L4, plus U2-U5's typed function-calls) |
| **L3** | i18n | typed function-calls: `L(bn, en)`, `bnDigits`, `tk` (number), `td` (date) | i18n | pure / closure; failure is a render-time fallback (English) | Every Screen, Field, Pill (U1 + U2-U5's UI) |
| **L4** | Router | typed registry: `routes`, dispatch (`auth → capability → business-rule`) | Router | typed `Result<T, TypedError>`; failure is a 403 / redirect | Every route across all units (U1 + U2-U5) |
| **L5** | State container | in-process typed state: `get`, `set`, `subscribe` | (cross-cutting) | in-process; failure is a render-time fallback (default state) | Every Screen (U1 + U2-U5's UI) |

## Component isolation strategy

| Layer | Isolation | Where |
|---|---|---|
| **Modules (compile-time)** | Each component is a separate module (`identity.ts`, `audit.ts`, `i18n.ts`, `routes.ts`, `state.ts`); no cross-module imports except via the typed registries. | `src/` |
| **Tests (compile-time)** | Each component has its own test file; cross-component tests live in `e2e/`. | `tests/` |
| **DB tables (runtime)** | Each component owns its DB tables: `users` / `business` / `invitations` (L1), `audit_log` (L2). L3, L4, L5 do not own DB tables. | migration |
| **DB role (runtime)** | L2's `audit_log` table is owned by the `audit_writer` role (INSERT only); the app connects as `app_role` for everything else. | R1.1 binding test |
| **Network (no isolation needed)** | All components are in-process; no network between them. | (modular monolith) |

## Service boundaries (U1's stance)

U1 does NOT have network service boundaries; it has
**module boundaries** within a single deploy. The
boundaries are typed via the typed function-calls
(contracts #1-4 + #9 in `contract-summary.md`).

| Boundary | Type | Where |
|---|---|---|
| Browser ↔ runtime | HTTP (TLS 1.3) | vendor's free-tier runtime |
| Runtime ↔ DB | postgres.js (TLS 1.3) | vendor's free-tier managed-DB |
| L1 ↔ L2 | typed function-call (`appendAudit` from every state-mutating action) | in-process |
| L1 ↔ L4 | typed function-call (`dispatch` from the action handler) | in-process |
| L2 ↔ L4 | typed function-call (`getAudit` from the audit-trail route) | in-process |
| L3 ↔ L4 | typed function-call (`L(bn, en)` from the Screen primitive) | in-process |
| L5 ↔ L4 | typed function-call (`get` / `set` from the action handler) | in-process |

The **only network boundaries** are browser ↔ runtime and
runtime ↔ DB; both are vendor-managed. U1's design does
not introduce additional network surfaces.

## Failure domains (per-component)

| Component | Failure mode | Response | NFR binding |
|---|---|---|---|
| **L1 (Identity)** | argon2id verify fails / invitation token expired / sign-up duplicate email | typed `Result<T, TypedError>`; UI shows the typed error | NFR5.2, NFR5.3 |
| **L2 (Audit)** | INSERT fails (DB down / pool exhausted) | typed `Result<T, AuditImmutabilityError>`; the action rolls back | NFR5.1, R1.1 |
| **L3 (i18n)** | Locale not supported / translation key missing | render-time fallback to English (with a console.warn for the missing key) | NFR7.5 |
| **L4 (Router)** | Route not found / capability missing / business-rule denied | typed `Result<T, TypedError>`; UI shows 404 / 403 | NFR5.6, R1.2 |
| **L5 (State container)** | Schema mismatch (Zod parse fails) | typed error; UI shows a "something went wrong" boundary | NFR7.5 |

## Blast radius (per-component)

| Component | Blast radius (what fails if this component fails) | Mitigation |
|---|---|---|
| **L1 (Identity)** | All auth + invitation + recovery routes fail; the rest of the app is unreachable | The session cookie is the entry point; L1 is the gate |
| **L2 (Audit)** | All state-mutating actions fail (NFR5.1 immutability is a hard requirement) | The DB is the single point of failure; vendor's daily snapshot is the recovery point |
| **L3 (i18n)** | Render-time fallback to English; UX degrades but the app works | The fallback is local (no network) |
| **L4 (Router)** | All routes fail; the app is unreachable | The router is the entry point; this is a deploy-wide failure |
| **L5 (State container)** | Render fails; the app shows the error boundary | The state is in-process; the failure is recoverable (reload) |

**Decision (record)**: the **deploy-wide failure modes**
are L1 (Identity) and L4 (Router), because they are the
entry points. L2 (Audit) is a **state-mutating-only**
failure mode (reads still work). L3 (i18n) and L5
(State container) are **degrade-gracefully** failure
modes.

## Shared resources (U1's inventory)

| Resource | Owner | Consumers | Contention |
|---|---|---|---|
| **postgres.js connection pool** | DB client (runtime-level) | L1, L2 (and future U2-U5) | `max: 5`; U1 uses ≤ 2 concurrently |
| **`audit_log` table** | L2 (audit_writer role) | L1 + future U2-U5's state-mutating actions | INSERT-only; no contention on writes |
| **`users` table** | L1 | L4 (capability check), L1 (sign-in) | < 5 rows; no contention |
| **`business` table** | L1 | L1 (sign-up), L4 (capability check) | 1 row; no contention |
| **`invitations` table** | L1 | L1 (create + accept) | < 10 active; no contention |
| **`sessions` table** | L1 (session middleware) | L4 (auth check) | < 5 active; no contention |
| **Vendor's free-tier runtime** | (vendor) | L1, L2, L3, L4, L5 | Free-tier envelope; the deploy is the only consumer |
| **Vendor's free-tier managed-DB** | (vendor) | All components | Free-tier envelope; the deploy is the only consumer |
| **Vendor's free-tier email gateway** | (vendor) | L1 (invitation + recovery) | Free-tier envelope; graceful degradation |
| **Browser HTTP cache** | Browser | L3 (CSS), L4 (JS bundle), L5 (initial state) | NFR2.1 (cold start) |
| **In-process typed-state-container** | L5 | L4 (every dispatch) | O(1) per get/set; no contention |
| **Translation table** | L3 | L3 (every render) | module-level frozen; no contention |

## Component dependency graph (U1)

```
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │ HTTP (TLS 1.3)
                           ▼
                    ┌──────────────┐
                    │   Runtime    │
                    │  (vendor)    │
                    └──────┬───────┘
                           │ postgres.js (TLS 1.3)
                           ▼
                    ┌──────────────┐
                    │  Managed-DB  │
                    │   (vendor)   │
                    └──────────────┘

In-process:

   ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
   │  L1  │───▶│  L2  │    │  L3  │    │  L4  │───▶ L5
   │ Idty │    │ Audit│    │ i18n │    │Router│
   └──┬───┘    └──────┘    └──────┘    └──────┘
      │                                       ▲
      └───────────────────────────────────────┘
           (sign-in → dispatch → render)
```

| Edge | From → To | Type | Notes |
|---|---|---|---|
| L1 → L2 | sign-up, sign-in, invitation create/accept → appendAudit | typed function-call | L1 triggers L2 on every state-mutating action |
| L1 → L4 | sign-in, invitation create/accept → dispatch | typed function-call | L1 uses L4 to navigate after a successful action |
| L2 → L4 | (none) | — | L2 does not depend on L4 |
| L3 → L4 | (none) | — | L3 is a pure render-time dependency; L4 does not call L3 |
| L4 → L1 | dispatch → sign-in / sign-up / recovery / invitation | typed function-call | L4 dispatches to L1's screens |
| L4 → L2 | (none) | — | L4 does not call L2 directly; L1 calls L2 |
| L4 → L3 | dispatch → render with `L(bn, en)` | typed function-call | L4 uses L3 to render |
| L4 → L5 | dispatch → get / set | typed function-call | L4 uses L5 to read/write state |
| L5 → (all) | subscribe notifier | typed function-call | L5 notifies all subscribers on set |

## Cross-Unit component sharing (U1 → U2-U5)

U1's components are **shared with U2-U5** via the typed
function-calls (contracts #1-4 + #9):

| Component | U1 owns | Shared with U2-U5 via |
|---|---|---|
| **L1 (Identity)** | yes | contract #1 (typed function-calls: `getCustomer`, `putCustomer`, etc. — these are NOT L1's, they are L1's *consumers* in the typed function-call surface) |
| **L2 (Audit)** | yes | contract #1 (every state-mutating typed function-call in U2-U5 calls `appendAudit` from L1) |
| **L3 (i18n)** | yes | contract #9 (U2-U5's UI uses `L(bn, en)`, `bnDigits`, `tk`, `td` from L3) |
| **L4 (Router)** | yes | (U2-U5's routes are added to the `routes` registry at boot) |
| **L5 (State container)** | yes | (U2-U5's state slices are added to the typed-state-container at boot) |

**Decision (record)**: U1 owns the **runtime services**;
U2-U5 own the **business logic** that consumes them. This
is the modular-monolith pattern: shared runtime in U1,
domain logic in U2-U5.

## Open questions

None. The component inventory is the binding per-Unit
decomposition; the cross-Unit sharing is via the typed
function-calls in `contract-summary.md`.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [functional-spec] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/functional-spec.md`
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md`
- [frontend-components] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/frontend-components.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope