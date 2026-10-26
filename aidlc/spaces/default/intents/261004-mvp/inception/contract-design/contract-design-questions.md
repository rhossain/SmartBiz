# Contract Design — Questions

> Brownfield run (SmartBiz BD). Contract Design is
> **CONDITIONAL** per the stage protocol; it executes when the
> system has a formal contract to pin down — an inter-unit
> boundary OR a unit that exposes a public/external API
> consumed outside the system. SmartBiz has both: 5 units
> with 6 typed function-call edges in the DAG (Q4=A from
> units-generation), and an Owner-facing web app that exposes
> external surface area (audit-trail CSV export, password-
> recovery email, optional free-tier LLM provider, optional
> free-tier OCR / STT vendors for the 3 deferred input modes).
>
> **Anchors.** This stage reads
> `inception/units-generation/unit-of-work.md` (5 unit cards)
> and `inception/units-generation/unit-of-work-dependency.md`
> (5-node / 6-edge DAG), backed by
> `inception/domain-design/components.md` (14 components, 6
> ADRs) and `inception/requirements-analysis/requirements.md`
> (12 FR / 8 NFR). The 6 ADRs and the 6 domain-design
> Corrections in `aidlc/spaces/default/memory/project.md`
> bound the contract shape.
>
> **Stage contract.** Contract Design runs **once per
> workflow** (not per unit) and produces a single artifact,
> `contract-summary.md`, that carries both the human-readable
> overview and the contract specs themselves (fenced code
> blocks: OpenAPI for REST, AsyncAPI for events, shared-
> schema for shared DB, or other appropriate format per the
> integration mechanism).

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — 5 units, integration edges, per-edge contracts
- [unit-of-work-dependency] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md` — DAG (5 nodes, 6 edges, all typed function-call)
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components, 6 ADRs
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [project-rules] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, free-tier envelope (NFR5.1)
- [team-rules] `aidlc/spaces/default/memory/team.md` — Free-tier foundation, NBR audit retention, no SaaS APM, structured JSON logs (NFR3.1)
- [contract-design-stage] `.claude/aidlc-common/stages/inception/contract-design.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md` — Modular Monolith
- [aws-platform-knowledge] `.claude/knowledge/aidlc-aws-platform-agent/well-architected-framework.md`

## Q1. Public/external API surface

The system is a Modular Monolith (Q5=A from units-generation) with
all inter-unit edges as typed function-calls. The Owner-facing
deployment still has external surface area. Which units expose an
API consumed outside the system, and what is its shape?

A. **Five external surfaces, all internal to the deployment.**
   (1) **U5-operate** exposes the **audit-trail CSV export** —
   the Owner downloads the audit trail filtered by date range and
   entity (US3.2, FR12.1). The shape is a CSV download endpoint
   served by the U5 UI surface, with a documented column order
   and date-range/entity filter. (2) **U1-foundation** (Auth +
   I18n) exposes the **password-recovery email** — a one-time
   link delivered via a free-tier email gateway the Owner owns
   (US1.2 AC1.2.2, NFR3.2, NFR5.1). The shape is a transactional
   email with a 1-hour token in the URL. (3) **U1-foundation**
   exposes the **sign-in / sign-up surface** to the Owner's
   browser — a web form, not an API per se. (4) **U3-orders**
   exposes the **3 deferred input modes** (US1.14/15/16.D) as
   stubs that may call free-tier OCR / STT vendors once
   selected. The shape is a vendor-typed function call inside
   the U3-orders module. (5) **U1-foundation** exposes the
   **optional free-tier LLM provider** for AI Insights
   (US3.9.D) — vendor deferred, free-tier envelope only. None
   of these is a public REST API in the conventional sense;
   the deployment is single-tenant (FR1.5, US3.5) and the Owner
   is the only consumer outside the system. The CSV export and
   the email gateway are the two surfaces that have a real
   wire-format contract.
B. **Public REST API on top of the monolith.** Expose every
   unit through a public REST surface so future partners
   (marketplace, bKash) can integrate. Contradicts ADR-001's
   1:1 module shape and the Modular Monolith pattern; adds
   a deployment surface that the Owner never asked for.
C. **No external surface.** Treat the system as a pure
   internal monolith with no wire-format contract. Misses
   the audit-trail CSV export and the password-recovery
   email — both real surfaces with real consumers outside
   the system.

[Answer]: A — Five external surfaces, all internal to the deployment. (1) U5-operate audit-trail CSV export; (2) U1-foundation password-recovery email via free-tier gateway; (3) U1-foundation sign-in/sign-up form; (4) U3-orders deferred input modes (OCR/STT stubs); (5) U1-foundation optional free-tier LLM provider for AI Insights. Real wire formats: CSV download + SMTP transactional email. No public REST API in the conventional sense — the deployment is single-tenant (FR1.5, US3.5).

## Q2. Integration mechanism per boundary

The DAG has 6 inter-unit edges. Per units-generation Q4=A, every
edge is a typed function-call across the module boundary
(TypeScript imports). For the external surfaces, what
mechanism applies to each?

A. **Inter-unit: typed function-calls (preserved from Q4=A).**
   All 6 DAG edges remain TypeScript imports across the
   module boundary. No REST between units, no event bus, no
   shared schema. The `contract-summary.md` restates the
   per-edge contract from `unit-of-work.md` as fenced
   `typescript` blocks (function signatures, return types,
   failure modes) rather than OpenAPI / AsyncAPI / shared-
   schema blocks. **External: REST for the audit-trail CSV
   export.** The CSV export is the one real wire-format
   surface; the spec is a fenced OpenAPI block defining the
   GET endpoint, query parameters (`from`, `to`, `entity`),
   response shape (CSV with the column order documented in
   the spec). **External: SMTP for the password-recovery
   email.** A simple RFC 5322 message; the contract is
   documented as a fenced yaml block describing the message
   shape, the token, and the 1-hour expiry.
B. **Inter-unit: shared schema (event-bus + DB).** Force every
   unit to coordinate via Postgres `LISTEN/NOTIFY` and a
   shared schema. Contradicts Q4=A; adds the outbox-pattern
   obligation to every unit for no real win in a single-
   tenant monolith.
C. **Inter-unit: REST between units.** Every unit exposes
   REST; consumers call via HTTP. Contradicts Q4=A and the
   modular-monolith pattern; adds network-call latency and
   failure modes for an in-process call.

[Answer]: A — Inter-unit: typed function-calls (preserved from Q4=A in units-generation); the contract spec is fenced TypeScript blocks (signatures, return types, failure modes). External: REST for the audit-trail CSV export (fenced OpenAPI block); SMTP for the password-recovery email (fenced yaml block).

## Q3. Contract ownership

Each contract has an owner — the unit that owns the spec, the
breaking-change policy, and the additive-change policy. How is
ownership assigned?

A. **Provider unit owns the contract (Recommended).** The
   provider unit owns the spec, the breaking-change policy,
   and the additive-change policy. For the 6 inter-unit
   edges, the upstream unit (U1 for the foundation edges,
   U2 for the catalog edge, U3 for the orders edge, U4 for
   the money edge) is the owner. For the audit-trail CSV
   export, U5-operate owns the spec. For the password-
   recovery email, U1-foundation (Auth sub-module) owns
   the spec. Additive changes (new fields, new endpoints)
   follow the "consumers ignore unknown fields" rule; the
   additive change is shipped when the provider ships.
   Breaking changes (renaming a field, changing a type,
   removing an endpoint) require a 1-cycle deprecation
   window with a typed-shim layer in the provider until
   every consumer is migrated.
B. **Consumer unit owns the contract.** Inverts the
   responsibility: the unit that calls the API defines the
   shape. Forces the provider to bend to every consumer's
   preference; multiple consumers can disagree on the shape.
C. **Architect owns every contract.** A central architect
   role owns every spec end-to-end. With one human owner,
   the role collapses to whoever is at the keyboard — the
   same person as the provider-unit owner. Centring the
   ownership in a named role adds process without adding
   separation of concerns.

[Answer]: A — Provider unit owns the spec, the breaking-change policy, and the additive-change policy. For the 6 inter-unit edges, the upstream unit is the owner (U1 for foundation edges, U2 for catalog edge, U3 for orders edge, U4 for money edge). U5 owns the CSV export; U1 (Auth sub-module) owns the email. Additive changes follow the "consumers ignore unknown fields" rule.

## Q4. Versioning and breaking-change policy

A contract has a lifecycle. How is it versioned, and how are
breaking changes agreed?

A. **Single version, additive-only with explicit deprecation
   window (Recommended).** Every inter-unit contract is
   shipped at a single version (the provider's current
   `main`). Additive changes (new fields, new enum values,
   new optional parameters) ship when the provider ships;
   consumers must ignore unknown fields and unknown enum
   values (TypeScript's structural typing and the prototype's
   "consumers ignore unknown fields" rule apply). Breaking
   changes (renaming a field, narrowing a type, removing a
   field, changing a status-enum value) are not allowed on
   a single version. Instead, the provider introduces a new
   function (e.g., `getOrderV2`) and the old function lives
   behind a typed-shim layer for one Bolt cycle (~1–2 days
   per `team.md#Way of Working`), then is removed when every
   consumer has migrated. The shim is its own unit-test
   surface — the provider's test suite asserts the shim's
   behaviour until the shim is removed. For the external
   audit-trail CSV export, the contract is the column order;
   additive columns are allowed (the Owner filters them in
   the consumer); breaking column-order changes are not
   allowed without a versioned query parameter
   (`?v=1` / `?v=2`). For the password-recovery email, the
   message shape is owned by U1-foundation; breaking
   changes to the link format require a parallel transport
   during the deprecation window.
B. **Semver per contract.** Each contract carries a
   major.minor.patch version; breaking changes bump
   major. With one human owner, the ceremony is larger
   than the value; the deprecation-window policy in A
   already binds breaking changes.
C. **No policy — "we'll figure it out."** Avoidance. Not
   a contract policy.

[Answer]: A — Single version, additive-only with explicit deprecation window. Additive changes ship when the provider ships (consumers ignore unknown fields per TypeScript structural typing). Breaking changes: provider introduces a new function (e.g. `getOrderV2`); old function lives behind a typed-shim layer for one Bolt cycle (~1–2 days per `team.md#Way of Working`), then is removed. The shim is its own unit-test surface. CSV export adds columns; breaking column-order changes need a `?v=1` / `?v=2` query parameter.

## Q5. Error, timeout, and retry behaviour at each boundary

A contract is not just the happy path; it must specify what
happens when the consumer calls a function that does not exist,
when the provider is unreachable, when the call exceeds a
budget, and when the call is retried. What behaviour applies
to each boundary?

A. **Inter-unit: typed Result / throw with documented
   failure mode; no retry, no timeout (Recommended).**
   Every inter-unit function returns either a typed
   `Result<T, E>` (the discriminated union carrying the
   success value or a typed error) or throws a typed
   exception with a documented failure mode. The contract
   spec lists the failure modes per function (missing
   entity, illegal status transition, missing business FK,
   audit-immutability violation, etc.). There is **no
   timeout** and **no retry** between units because the
   call is in-process; the failure is a logic error, not a
   network error. The unit test asserts the failure mode
   for every documented failure (the prototype's
   `tests/audit-zero.js` is the discipline). **External
   (CSV export):** the GET endpoint returns 200 with the
   CSV body, 400 on a malformed date range, 401 if the
   session is missing, 403 if the role is not Owner
   (FR12.2), and 500 on a database error. The 5xx
   response is logged as a structured JSON line
   (NFR3.1) and surfaced on the daily card (US3.1).
   Retry: the Owner can re-run the export; the contract
   does not auto-retry. **External (password-recovery
   email):** the message is sent via the free-tier
   gateway; a 5xx from the gateway is logged and the
   Owner sees a "Recovery email failed" toast on the
   sign-in screen. The Owner can re-trigger the send
   once per minute; the contract does not auto-retry
   to avoid spamming the gateway.
B. **Inter-unit: HTTP-style timeout + retry everywhere.**
   Add timeouts and retry-with-backoff between units.
   The calls are in-process; timeouts and retries are
   pure overhead.
C. **Inter-unit: best-effort, log and continue.** No
   failure-mode contract; failures are logged and the
   caller is expected to re-read state. The unit tests
   cannot assert behaviour without a contract, so this
   policy defeats the test-after discipline (NFR6.3).

[Answer]: A — Inter-unit: typed `Result<T, E>` or throw with documented failure mode; no timeout, no retry (in-process call). Unit test asserts every documented failure. External CSV export: 200 / 400 (malformed date range) / 401 (missing session) / 403 (role not Owner per FR12.2) / 500 (DB error). Owner re-runs on failure. External email: 5xx logged + toast; Owner re-triggers once per minute.

## Assumption Confirmation

A. Accept assumptions — proceed to contract-summary.md
   generation with the answers above
B. Convert to follow-up questions — something above needs a
   structured question instead of an assumption

[Answer]: A — Accept assumptions. All five answers are A. Proceed to ambiguity analysis and plan approval, then write the contract-summary.md artifact with the 6 inter-unit typed function-call contracts + 2 external surfaces (CSV export, password-recovery email).