# Contract Summary — SmartBiz BD

> Brownfield run (intent `261004-mvp`). Single artifact that
> carries the human-readable contract overview **and** the
> contract specs themselves. Anchored to the 5 Units of Work
> in `inception/units-generation/unit-of-work.md` and the 6-
> edge DAG in `inception/units-generation/unit-of-work-dependency.md`.
>
> **Boundary scope (Q1=A).** 6 inter-unit boundaries (typed
> function-call per units-generation Q4=A) + 2 external
> surfaces (audit-trail CSV export via REST, password-recovery
> email via SMTP). No public REST API between units; the
> deployment is single-tenant (FR1.5, US3.5) and the Owner is
> the only consumer outside the system. The 3 deferred input
> modes (US1.14/15/16) and the optional AI Insights (US3.9.D)
> are vendor-typed function calls inside the owning unit; the
> vendor selection is gated in Construction.
>
> **Integration mechanism (Q2=A).** Inter-unit: typed
> function-call (TypeScript import across the module
> boundary). External CSV export: REST + CSV response body.
> External email: SMTP. Spec format per the stage protocol:
> fenced `typescript` for typed function-calls, fenced
> `yaml OpenAPI 3.1` for the REST surface, fenced `yaml` for
> the SMTP message.
>
> **Sole-developer / solo ownership posture (per
> `team.md#Walking Skeleton`).** Autonomy is `gated` — the
> Owner signs off every Bolt. Contracts are owned by the
> provider unit; additive changes ship when the provider
> ships; breaking changes require a 1-Bolt-cycle deprecation
> window with a typed-shim layer.

## Contracts table

| # | Provider Unit | Consumer | Mechanism | Owner | Spec format |
|---|---|---|---|---|---|
| 1 | U1-foundation (Auth + AuditService) | U2-catalog | typed function-call | U1 (Auth) | `typescript` |
| 2 | U1-foundation (Data, I18n, Pres, Auth) | U2-catalog | typed function-call | U1 (Data) | `typescript` |
| 3 | U1-foundation (Data, I18n, Pres, Auth) | U3-orders | typed function-call | U1 (Data) | `typescript` |
| 4 | U1-foundation (Data, I18n, Pres, Auth) | U5-operate | typed function-call | U1 (Data) | `typescript` |
| 5 | U2-catalog (Catalog) | U3-orders | typed function-call | U2 (Catalog) | `typescript` |
| 6 | U3-orders (Orders) | U4-money | typed function-call (callback) | U3 (Orders) | `typescript` |
| 7 | U4-money (MoneyEngine) | U5-operate | typed function-call | U4 (Money) | `typescript` |
| 8 | U5-operate (Operate) | External: Owner browser | REST + CSV (audit-trail export) | U5 (Operate) | `yaml OpenAPI 3.1` |
| 9 | U1-foundation (Auth) | External: Owner email inbox | SMTP (password-recovery) | U1 (Auth) | `yaml` (RFC 5322) |

> **Note on row count.** The DAG has 6 edges; the table has
> 9 rows. Rows 1–2 are split because U1-foundation contributes
> two independent API surfaces to U2: the audit append
> (Auth + AuditService) and the data/i18n/pres typed surface
> (Data + I18n + Pres). Splitting them reflects the
> independent ownership in `unit-of-work.md` (rows 95–97 of
> the per-edge contract table). The Owner-facing CSV export
> (#8) and the password-recovery email (#9) are the two real
> external surfaces.

---

## Per-contract specs

### Contract #1 — U1.foundations.auth.appendAudit → U2

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U1-foundation (AuthComponent → AuditService sub-module)
**Direction:** U2 imports U1's audit append.

```typescript
// File: src/foundation/auth/audit.ts (U1)
export type Actor = { id: string; role: Role; businessId: string };
export type AuditEntity =
  | "Customer" | "CustomerNote" | "Product" | "Variant"
  | "Supplier" | "Stock" | "Order" | "OrderItem"
  | "Payment" | "Consignment" | "SettlementRun" | "SettlementRow"
  | "Expense" | "SupplierPayment" | "BusinessSettings" | "Audit";

export type AuditRow = {
  id: string;            // A-####
  actorId: string;
  businessId: string;
  entity: AuditEntity;
  entityId: string;
  beforeValue: unknown;  // typed per entity
  afterValue: unknown;   // typed per entity
  createdAt: string;     // ISO 8601 UTC
  retentionUntil: string; // createdAt + 5 years (NBR § 53)
};

export class AuditImmutabilityError extends Error {
  readonly code = "AUDIT_IMMUTABILITY_VIOLATION";
  constructor(message: string) { super(message); }
}

export function appendAudit(input: {
  actor: Actor;
  entity: AuditEntity;
  entityId: string;
  beforeValue: unknown;
  afterValue: unknown;
}): Promise<AuditRow>;

// Failure modes:
//   - AuditImmutabilityError: DB role holds UPDATE/DELETE on audit
//     table. CI test catches the re-grant migration
//     (CC-AC-AUDIT-IMmutability, NFR5.2).
//   - MissingBusinessFKError: businessId does not resolve
//     (CC-AC-TENANT).
//   - DatabaseError: connection lost / timeout / disk full.
//
// No timeout (in-process). No retry (logic error, not network).
```

**Consumer side (U2):** CatalogComponent's customer / product /
supplier / stock mutations call `appendAudit(...)` on every
create / update. The audit row carries the entity name
(`"Customer"`, `"Product"`, etc.) and the before/after
values. The single-rule contract is **no U2 mutation
without an audit append**.

### Contract #2 — U1.foundations.data + i18n + pres → U2

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U1-foundation (DataComponent + I18nComponent + PresentationComponent)
**Direction:** U2 imports U1's typed state container + i18n + chrome.

```typescript
// File: src/foundation/data/index.ts (U1)
import type { Customer, Product, Variant, Supplier, Stock } from "./types";

export function getCustomer(id: string): Promise<Customer | null>;
export function putCustomer(c: Customer): Promise<Customer>;
export function listCustomers(filter: {
  search?: string;        // name or phone partial
  riskLevel?: "low" | "medium" | "high";
  businessId: string;
}): Promise<Customer[]>;

export function getProduct(id: string): Promise<Product | null>;
export function putProduct(p: Product): Promise<Product>;
export function listVariants(productId: string): Promise<Variant[]>;
export function getVariant(productId: string, axes: Record<string, string>): Promise<Variant | null>;
export function putVariant(v: Variant): Promise<Variant>;

export function getSupplier(id: string): Promise<Supplier | null>;
export function putSupplier(s: Supplier): Promise<Supplier>;

export function getStock(productId: string, variantKey: string): Promise<Stock | null>;
export function adjustStock(input: {
  productId: string;
  variantKey: string;
  delta: number;          // signed
  reason: string;         // required for CC-AC-AUDIT
  actor: Actor;
}): Promise<Stock>;

// File: src/foundation/i18n/index.ts (U1)
export function L(bn: string, en: string): string;       // bilingual copy
export function bnDigits(n: number | string): string;    // 1234 -> "১২৩৪"
export function tk(key: string): string;                // design token

// File: src/foundation/pres/index.ts (U1)
export { RiskChip, BarRow, ProvenanceCell } from "./components";

// Failure modes:
//   - MissingBusinessFKError: businessId does not resolve (CC-AC-TENANT).
//   - SKU uniqueness per business (FR3.3) — throw on duplicate.
//   - Phone validation 01XXXXXXXXX (FR2.1) — throw on non-BD format.
//   - CustomerNote is append-only (FR2.4) — no putCustomerNote
//     exists; only appendCustomerNote (see below).
//
// No timeout (in-process). No retry (logic error, not network).
```

**Append-only customer notes (FR2.4):**

```typescript
// File: src/foundation/data/notes.ts (U1)
export type CustomerNote = {
  customerId: string;
  text: string;
  createdAt: string;       // ISO 8601 UTC
  supersedesId: string | null;  // chains revisions
};
export function appendCustomerNote(input: {
  customerId: string;
  text: string;
  supersedesId: string | null;
}): Promise<CustomerNote>;
```

### Contract #3 — U1.foundations.data + i18n + pres + auth → U3

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U1-foundation (Data + I18n + Pres + Auth)
**Direction:** U3 imports U1's typed surface.

```typescript
// File: src/foundation/data/orders.ts (U1)
import type { Order, OrderItem, OrderStatus } from "./types";

export function getOrder(id: string): Promise<Order | null>;
export function putOrder(o: Order): Promise<Order>;
export function listOrders(filter: {
  status?: OrderStatus;
  customerId?: string;
  from?: string;          // ISO 8601 date
  to?: string;            // ISO 8601 date
  businessId: string;
}): Promise<Order[]>;
export function appendOrderItem(input: {
  orderId: string;
  item: Omit<OrderItem, "lineNo">;
}): Promise<OrderItem>;

// I18n + Pres + Auth imports same as Contract #2.

// OrderStatus (FR5.3) is a discriminated string-literal union:
//   "new" | "confirmed" | "packed" | "shipped" |
//   "delivered" | "settled" | "cancelled" | "returned" | "partial"
// Every switch branches exhaustively with a `never`-asserted
// default (CC-AC-STATUS-BUCKET, NFR6.4 mutation discipline).

// Failure modes:
//   - MissingBusinessFKError (CC-AC-TENANT).
//   - IllegalStatusTransitionError: caller passed a status that
//     the state machine does not allow. Exhaustive switch
//     + `never` default catches it at compile time; runtime
//     throws IllegalStatusTransitionError.
//   - AuditImmutabilityError (see Contract #1).
```

### Contract #4 — U1.foundations.data + i18n + pres + auth → U5

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U1-foundation (Data + I18n + Pres + Auth)
**Direction:** U5 imports U1's typed surface.

```typescript
// File: src/foundation/data/settings.ts (U1)
import type { BusinessSettings, AuditView } from "./types";

export function getBusinessSettings(businessId: string): Promise<BusinessSettings>;
export function putBusinessSettings(s: BusinessSettings): Promise<BusinessSettings>;

// File: src/foundation/data/audit-export.ts (U1)
// Note: read-only projection of the Audit table for the
// audit-trail export (US3.2). Application role holds SELECT
// on the audit table for this read; INSERT is the only write
// capability (CC-AC-AUDIT-IMmutability).
export function exportAudit(filter: {
  from: string;            // ISO 8601 date
  to: string;              // ISO 8601 date
  entity?: AuditEntity;    // optional
  businessId: string;
}): Promise<AuditView[]>;

// I18n + Pres + Auth imports same as Contract #2.

// Failure modes:
//   - MissingBusinessFKError (CC-AC-TENANT).
//   - AuditImmutabilityError on the SELECT projection path
//     if the DB role has been mis-configured (CI test catches
//     the re-grant migration; CC-AC-AUDIT-IMmutability).
```

### Contract #5 — U2.catalog → U3

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U2-catalog (CatalogComponent)
**Direction:** U3 imports U2's catalog read surface.

```typescript
// File: src/catalog/read.ts (U2)
import type { Customer, Product, Variant } from "../foundation/data/types";

export function getCustomer(id: string): Promise<Customer | null>;
export function getProduct(id: string): Promise<Product | null>;
export function listVariants(productId: string): Promise<Variant[]>;

// Failure modes:
//   - NotFoundError: customer or product does not exist.
//   - CrossTenantError: customer / product belongs to a
//     different business. Absence-asserted test (CC-AC-TENANT)
//     catches cross-tenant reads.
```

**Read-only by construction:** the catalog read surface is
deliberately a subset of the full Data surface; U3 cannot
write to catalog from this edge. Writes go through U1's
`putCustomer` / `putProduct` (Contract #2), so the audit
append and the business-FK enforcement live in U1.

### Contract #6 — U3.orders → U4 (callback)

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U3-orders (OrdersComponent)
**Direction:** U4 imports U3's status-flip surface.

```typescript
// File: src/orders/lifecycle.ts (U3)
import type { Order, OrderStatus } from "../foundation/data/types";

export function markShipped(input: {
  orderId: string;
  consignmentId: string;  // PT-#### / SF-##### / RX-#####
  actor: Actor;
}): Promise<Order>;

export function markDelivered(input: {
  orderId: string;
  actor: Actor;
}): Promise<Order>;

export function markSettled(input: {
  orderId: string;
  settlementRowId: string;  // STL-####
  actor: Actor;
}): Promise<Order>;

// Failure modes:
//   - IllegalStatusTransitionError: caller passed a status
//     that the state machine does not allow. Exhaustive
//     switch + `never` default catches it at compile time.
//   - MissingOrderError: orderId does not resolve.
//   - CrossTenantError: order belongs to a different business.
```

**Why a callback (U4 → U3) and not U3 → U4:** MoneyComponent
imports OrdersComponent to flip the order's status
(`Order moves to settled`). The DAG edge is `U3 → U4` (U3
is depended on by U4); the call direction is `U4 → U3`
(U4 invokes U3's `markSettled`).

### Contract #7 — U4.money.MoneyEngine → U5

**Mechanism:** typed function-call (TypeScript import)
**Owner:** U4-money (MoneyComponent → MoneyEngine sub-module)
**Direction:** U5 imports U4's `summary` for the DailyCard.

```typescript
// File: src/money/engine.ts (U4)
import type { Order, Payment, Expense } from "../foundation/data/types";

export type DailyCardSummary = {
  earnedTotal: number;        // today's orders
  realisedTotal: number;      // today's settled minus expenses
  outstandingDues: number;    // all customers
  basisPill: "earned" | "realized";
  completeness: {
    have: number;             // CC-AC-BASIS
    of: number;
    whyMissing: string[];     // why-missing sheet
  };
};

export function summary(today: {
  orders: Order[];
  payments: Payment[];
  expenses: Expense[];
}): DailyCardSummary;

// Failure modes: never throws. Pure function over the input.
// (CC-AC-STATUS-BUCKET inline restatement in any test that
// asserts the math; the EARNED_STATUSES / REALIZED_STATUSES /
// PIPELINE_STATUSES constants are restated in the test, not
// imported.)
```

### Contract #8 — U5.operate.exportAuditCSV → External (Owner browser)

**Mechanism:** REST (HTTP) + CSV response body
**Owner:** U5-operate (OperateComponent)
**Direction:** External (Owner browser) calls the
audit-trail export endpoint.

```yaml
openapi: 3.1.0
info:
  title: SmartBiz BD — Audit Trail Export
  version: 1.0.0
  description: |
    Owner-only endpoint that exports the audit trail to CSV
    (US3.2, FR12.1, NFR5.2). The audit table is append-only
    at the database level; the application role holds INSERT
    only. The export is a read-only projection (SELECT).

servers:
  - url: https://{deployment}.{host}
    variables:
      deployment: { default: app, description: "deployment slug" }
      host: { default: example.com }

paths:
  /api/audit/export:
    get:
      summary: Export the audit trail to CSV
      description: |
        Returns a CSV of the audit rows for the calling Owner's
        business, filtered by date range and (optionally) entity.
        The column order is fixed; additive columns are allowed
        behind a `?v=2` query parameter (see Versioning below).
      operationId: exportAuditTrail
      security:
        - sessionCookie: []
      parameters:
        - in: query
          name: from
          required: true
          schema: { type: string, format: date }
          description: ISO 8601 date (inclusive).
        - in: query
          name: to
          required: true
          schema: { type: string, format: date }
          description: ISO 8601 date (inclusive).
        - in: query
          name: entity
          required: false
          schema:
            type: string
            enum: [Customer, CustomerNote, Product, Variant,
                   Supplier, Stock, Order, OrderItem,
                   Payment, Consignment, SettlementRun, SettlementRow,
                   Expense, SupplierPayment, BusinessSettings, Audit]
          description: Optional entity filter.
        - in: query
          name: v
          required: false
          schema: { type: integer, enum: [1, 2], default: 1 }
          description: |
            Contract version. v=1 is the column order in the
            `responses.200` schema. v=2 (when shipped) carries
            additive columns and is documented separately.
      responses:
        "200":
          description: CSV body
          content:
            text/csv:
              schema:
                type: string
              examples:
                v1:
                  externalValue: |
                    audit_id,actor_id,business_id,entity,entity_id,before_value,after_value,created_at,retention_until
                    A-0001,u_owner,b_1,Customer,c_42,"{""name"":""Acme""}","{""name"":""Acme Co""}",2026-10-11T08:14:22Z,2031-10-11T08:14:22Z
        "400":
          description: Malformed date range or unknown entity
        "401":
          description: Missing or expired session
        "403":
          description: Role is not Owner (FR12.2, NFR6.6)
        "500":
          description: |
            Database error. Logged as a structured JSON line
            (NFR3.1) and surfaced on the daily card (US3.1).
            Owner can re-run the export; the contract does not
            auto-retry.

components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: sb_session
```

**Versioning:** v=1 is the column order above. Additive
columns are allowed in v=2 (the consumer's CSV reader
ignores unknown columns by default). Breaking column-order
changes require v=3, documented separately. Deprecation
window: 1 Bolt cycle (~1–2 days) with both versions
served; v=1 is removed when the Owner is on v=2.

### Contract #9 — U1.foundations.auth.passwordRecoveryEmail → External (Owner email inbox)

**Mechanism:** SMTP (RFC 5322)
**Owner:** U1-foundation (AuthComponent)
**Direction:** External (Owner email inbox) receives the
recovery message.

```yaml
smtp:
  description: |
    Password-recovery email (US1.2, FR1.1, NFR3.2, NFR5.1).
    One-time link valid for 1 hour, delivered via a free-tier
    email gateway the Owner owns. The contract is a single
    SMTP message with a templated body; the token in the
    URL is the auth credential.
  envelope:
    from: "no-reply@<deployment>.example.com"
    to: "<owner-email>"
    subject: "Reset your SmartBiz password"
  body:
    content-type: text/plain; charset=utf-8
    template: |
      Hello,

      Click the link below to reset your SmartBiz password.
      The link is valid for 1 hour.

      {{reset_url}}

      If you did not request a password reset, you can
      safely ignore this email.

      — The SmartBiz team
  variables:
    reset_url:
      format: "https://<deployment>.example.com/reset?token=<token>"
      token:
        length: 32
        charset: "url-safe-base64"
        ttl: 3600       # 1 hour in seconds
        single_use: true
  failure_modes:
    smtp_5xx:
      handling: |
        Logged as a structured JSON line (NFR3.1) and surfaced
        on the sign-in screen as a "Recovery email failed"
        toast. Owner can re-trigger the send once per minute;
        the contract does not auto-retry to avoid spamming
        the gateway.
    invalid_email:
      handling: |
        Logged but no message sent; sign-in screen shows
        "If the email is registered, a recovery link has been
        sent" (avoids email enumeration).
  retry_policy:
    auto_retry: false
    manual_retry: "once per minute via the sign-in screen"
  deprecation:
    body_changes:
      additive: allowed (new copy blocks ship when the
        template changes)
      breaking: requires a `?v=2` query parameter on the
        reset URL so old links still resolve
    from_address_change:
      requires: a parallel transport for the deprecation
        window (~1 Bolt cycle)
```

---

## Contract ownership rules (Q3=A)

1. **Provider unit owns the spec.** The 6 inter-unit typed
   function-calls are owned by the provider unit (the
   upstream unit in the DAG). U1 owns Contracts #1–4;
   U2 owns Contract #5; U3 owns Contract #6; U4 owns
   Contract #7. U5 owns Contract #8; U1 owns Contract #9.

2. **Additive changes ship when the provider ships.** New
   fields, new enum values, new optional parameters, new
   status values — all ship with the provider's next
   Bolt. Consumers must ignore unknown fields and unknown
   enum values. TypeScript's structural typing and the
   `exactOptionalPropertyTypes` posture (NFR7.1) make
   this a compile-time constraint, not a runtime one.

3. **Breaking changes require a 1-Bolt-cycle deprecation
   window with a typed-shim layer.** Renaming a field,
   narrowing a type, removing a field, changing a status-
   enum value — all require:
   - (a) A new function or endpoint (e.g. `getOrderV2` or
     `?v=2` on the CSV export) that carries the new shape.
   - (b) A typed-shim layer in the provider that translates
     the old function to the new one, with a unit-test
     surface that asserts the shim's behaviour.
   - (c) A 1-Bolt-cycle deprecation window (~1–2 days per
     `team.md#Way of Working`). The shim is removed when
     every consumer has migrated. The merge to remove the
     shim is its own Bolt with its own PR.

4. **External surfaces follow the same rules, plus the
   `?v=N` parameter for wire-format breaks.** Contracts #8
   and #9 are documented as versioned surfaces; additive
   changes are allowed at the current version; breaking
   changes require a new `?v=N` parameter and a parallel
   transport for the deprecation window.

## Error, timeout, and retry behaviour (Q5=A)

### Inter-unit (Contracts #1–7)

- **Failure mode:** typed `Result<T, E>` (the discriminated
  union) for fallible operations that the caller is
  expected to handle, or `throw` of a typed exception
  (`AuditImmutabilityError`, `MissingBusinessFKError`,
  `IllegalStatusTransitionError`, `CrossTenantError`,
  `NotFoundError`, `DatabaseError`).
- **Timeout:** none. The call is in-process; a timeout
  would be pure overhead.
- **Retry:** none. A retry of a logic error is a different
  logic error; the unit test asserts the failure mode
  (NFR6.3 test-after discipline).
- **Assertion surface:** the provider's unit test
  enumerates every documented failure mode and asserts
  the typed exception / Result discriminant.

### External CSV export (Contract #8)

- **Failure mode:** REST error codes.
  - 200 — CSV body returned.
  - 400 — Malformed date range or unknown entity
    filter.
  - 401 — Missing or expired session.
  - 403 — Role is not Owner (FR12.2, NFR6.6).
  - 500 — Database error. Logged as a structured JSON
    line (NFR3.1) and surfaced on the daily card
    (US3.1).
- **Timeout:** the request is bounded by the server's
  per-request budget (default 30 s for the export
  endpoint, asserted by the load test).
- **Retry:** none. The Owner can re-run the export; the
  contract does not auto-retry.
- **Assertion surface:** the API test suite enumerates
  every error code with a 4xx / 5xx fixture.

### External password-recovery email (Contract #9)

- **Failure mode:** SMTP 5xx response.
  - 250 — Message accepted; the sign-in screen shows
    "If the email is registered, a recovery link has been
    sent" (avoids email enumeration).
  - 5xx — Logged as a structured JSON line (NFR3.1) and
    surfaced on the sign-in screen as a "Recovery email
    failed" toast.
- **Timeout:** the SMTP call is bounded by the gateway's
  per-message budget (typically 10 s).
- **Retry:** none. The Owner can re-trigger the send once
  per minute; the contract does not auto-retry to avoid
  spamming the gateway.
- **Assertion surface:** the email test suite mocks the
  gateway and asserts the toast message + the log line
  for the 5xx path.

## Open questions

| Contract | Question | Blocks | Owner |
|---|---|---|---|
| #5 (U2→U3) | Should the read surface return a `null` or throw `NotFoundError` for missing entities? Currently `Promise<T \| null>` is the convention. | U2-catalog, U3-orders | U2 |
| #8 (CSV export) | Confirm the v=1 column order is acceptable for the Owner's NBR audit. If the auditor's tooling expects a different column order, a v=2 may be needed earlier than planned. | U5-operate (NBR audit handoff) | U5 |
| #9 (password-recovery email) | Free-tier gateway choice (Mailgun vs SendGrid vs self-hosted SMTP) — vendor selection is Construction-stage. | U1-foundation (Auth) | Construction |
| Deferred input modes (US1.14/15/16) | Vendor selection (OCR for photo, parser for spreadsheet, STT for voice) — all gated in Construction. | U3-orders (3 deferred placeholders) | Construction |
| US3.9.D (AI Insights) | Free-tier LLM provider selection — vendor gated in Construction. | U1-foundation (optional) | Construction |

## Sources

- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — 5 unit cards, per-edge contracts
- [unit-of-work-dependency] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work-dependency.md` — DAG (5 nodes, 6 edges)
- [components] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/components.md` — 14 components, entity shapes
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — 12 FR / 8 NFR
- [decisions] `aidlc/spaces/default/intents/261004-mvp/inception/domain-design/decisions.md` — 6 ADRs
- [project-rules] `aidlc/spaces/default/memory/project.md` — 6 domain-design Corrections, free-tier envelope (NFR5.1)
- [team-rules] `aidlc/spaces/default/memory/team.md` — Free-tier foundation, NBR audit retention, no SaaS APM
- [contract-design-stage] `.claude/aidlc-common/stages/inception/contract-design.md`
- [architecture-patterns] `.claude/knowledge/aidlc-architect-agent/architecture-patterns.md` — Modular Monolith
- [openapi] https://spec.openapis.org/oas/v3.1.0 — OpenAPI 3.1 spec format
- [rfc5322] https://www.rfc-editor.org/rfc/rfc5322 — Internet Message Format (SMTP)