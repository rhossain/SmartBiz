# Security Design — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit security
> design for U3-orders. The Q2 answer in
> `nfr-design-questions.md` binds this file: typed
> `appendAudit` helper that wraps every order-
> mutating action. Carries U1's security patterns
> forward unchanged for the cross-cutting baseline
> (DB-level insert-only audit, three-layer gate,
> no PCI scope).

## Sources

- [nfr-requirements-security] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/security-requirements.md` — NFR5.x, NFR5.7
- [u1-security-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/security-design.md` — U1 security patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q2=A
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md`

## Inherited security patterns (from U1, no per-Unit subdivision)

| Pattern | U1 binding | U3 usage | Notes |
|---|---|---|---|
| DB-level insert-only audit (NFR5.1) | U1 | every order mutation appends an audit row | the R1.1 gate (B1) asserts the DB-level mechanism |
| Three-layer gate (NFR5.6) | U1 | every U3 route | the R1.2 gate (B1) is extended in B2 to cover U3 routes |
| No PCI scope (NFR5.4) | U1 | every U3 surface | the B2 PCI deny-list grep test covers `src/orders/` |
| 5-year retention (NFR5.5) | U1 | every audit row | the schema-layer enforcement is asserted by an integration test |
| Cross-tenant isolation | U1 | every U3 surface | every typed getter / setter takes a `businessId` and asserts it matches the row |

## U3-specific security design

### 1. Per-action audit append (NFR5.7, FR12.3)

**Pattern: typed `appendAudit(order, action, before,
after)` helper that wraps every order-mutating
action** (Q2=A).

The `appendAudit` helper is a module-level function
imported from U1's `AuditService`. The helper is
called from every order create / status-transition
/ order-update:

```typescript
import { appendAudit } from '@/auth/audit-service';
import type { Order, OrderAuditAction } from '@/orders/types';

function createOrder(order: Order, actor: User): Order {
  appendAudit({
    entity_type: 'Order',
    entity_id: order.id,
    action: 'order.create' satisfies OrderAuditAction,
    actor_id: actor.id,
    business_id: order.businessId,
    before: null,
    after: order,
    occurred_at: new Date().toISOString(),
  });
  // ... write the order rows in a single DB transaction
  return order;
}
```

**Key design decisions:**

- **The `appendAudit` helper is a typed function**
  with a typed argument shape. The `action` field
  is a discriminated string-literal union
  (`'order.create' | 'order.update' |
  'order.status_transition' | 'order.cancel' |
  'order.return'`).
- **The helper is called BEFORE the DB write.** This
  ensures the audit-log row is written even if the
  DB write fails (the audit-log row is the
  intent-to-mutate, not the result).
- **The B2 R2.1 gate asserts the helper is called
  for every order-mutating action.** The test
  exercises every mutation path and asserts an
  audit row is written with the right entity type,
  action, actor, and before/after shape.
- **The DB-level mechanism is inherited from B1**
  (R1.1). The B1 R1.1 gate continues to assert the
  migration refuses to apply a re-grant of `UPDATE`
  to the app role.

### 2. Paste-parse input validation (FR5.2)

**Pattern: pure-function `parseMessage` with typed
`ParseResult`** (inherited from
`performance-design.md`).

The paste-parse path is a pure function on the
client; no I/O during parse. The output is
validated against the typed `OrderItem` shape
before the `Order` row is written.

**Key design decisions:**

- **No SQL injection surface is opened.** The
  parser does not touch the DB; the output is
  typed `OrderItem[]` validated against the Zod
  schema before the write.
- **The function never throws on bad input.** The
  typed `ParseResult` shape covers all error cases
  (`empty` / `malformed` / `too_large` /
  `deferred`).
- **The 200-item cap is enforced inside the
  function.** A size > 200 returns `{ ok: false,
  reason: 'too_large' }`.

### 3. Cross-tenant isolation (NFR12.4)

**Pattern: every typed getter / setter takes a
`businessId` and asserts it matches the row**
(inherited from U1).

The U3 surfaces (orders list, order detail, paste-
parse, manual, quick-add, repeat) take a
`businessId` from the typed state container and
assert it matches the row's `businessId` on every
read + write.

**Key design decisions:**

- **The `businessId` is taken from the typed state
  container, not from the URL.** The Owner cannot
  spoof a different `businessId` by manipulating
  the URL.
- **The `customerId` / `productId` / `variantId`
  are resolved via U2's typed surface, which also
  asserts the `businessId` matches.** A cross-
  tenant read is blocked at the typed function
  call.

### 4. Cross-role isolation (FR12.2)

**Pattern: three-layer gate (auth → capability →
business-rule)** (inherited from U1).

The three-layer gate is extended in B2 to cover
every U3 route. The R1.2 gate (B1) is extended to
walk every U1 + U3 route and assert the gate is
present (and assert the inverse: Owner reaches
order detail + audit trail + daily card).

**Key design decisions:**

- **Layer 1 (auth) — is the request
  authenticated?** The hash router checks the
  session cookie.
- **Layer 2 (capability) — does the role's
  capability set include the route's required
  capability?** The role × capability matrix is
  inherited from U1.
- **Layer 3 (business-rule) — does the entity pass
  the per-screen business rule?** For U3, the
  business rule is the role's capability on the
  order's `totalPaise` (e.g., Accountant sees
  cost and price but not the order's `totalPaise`).

### 5. PCI scope (NFR5.4)

**Pattern: no PCI scope, extended to `src/orders/`**
(inherited from U1, extended in B2).

The B2 PCI deny-list grep test is extended to
cover `src/orders/`:

```
grep -rE '\b(card|cvv|pan|cardNumber|bankAccount|accountNumber)\b' src/orders/
```

The test fails if any true positive is found in
`src/orders/`.

## Threat model (U3-specific)

The U3 threat model is the simple web app model
(inherited from U1, with no new surfaces):

- **Unauthenticated requests** are blocked at the
  auth layer (R1.2 extended in B2).
- **Cross-tenant reads** are blocked at the data
  layer (every typed getter / setter takes a
  `businessId` and asserts it matches the row).
- **Cross-role reads** are blocked at the capability
  layer (R1.2 extended in B2).
- **Free-text input (paste-parse)** is parsed in a
  pure function on the client; no I/O during parse;
  the output is validated against the typed
  `OrderItem` shape before the `Order` row is
  written. No SQL injection surface is opened.
- **Status-flip without audit** is blocked at the
  audit-append layer (R2.1). The status transition
  is a typed function call that returns the next
  status; the call site is wrapped in the
  `appendAudit` helper.
- **Audit log tampering** is mitigated at the DB
  role level (R1.1, B1). U3 inherits this.

## Inapplicable sub-categories

| Sub-category | Position | Rationale |
|---|---|---|
| Rate limiting on order create | N/A (deferred) | single-tenant topology, free-tier envelope; the deployment-level WAF handles it |
| Rate limiting on paste-parse | Inherited (NFR6.7.1) | the 200-item cap is a product decision; the rate-limit message covers the rare case |
| MFA on order create | N/A (deferred) | out-of-scope for the MVP; the security model is single-factor |
| PCI scope | N/A (NFR5.4) | U3 does not introduce a PCI surface |
| CSRF token | N/A (inherited from U1) | the session cookie is HTTP-only + SameSite=Lax; the typed function-call architecture is not vulnerable to CSRF |

## Per-NFR security coverage

| Inception NFR | U3 pattern | CI gate |
|---|---|---|
| NFR5.1 (audit immutability) | DB-level insert-only (B1) | R1.1 (B1) |
| NFR5.2 (password hashing) | argon2id (B1) | unit test on hash format |
| NFR5.3 (invitation token) | sha256 (B1) | unit test on hash format |
| NFR5.4 (no PCI scope) | grep deny-list extended to `src/orders/` | PCI deny-list grep test (B2) |
| NFR5.5 (5-year retention) | schema-layer (B1) | integration test (B1) |
| NFR5.6 (three-layer gate) | gate extended to U3 routes (B2) | R1.2 extended in B2 |
| NFR5.7 (per-action audit append) | typed `appendAudit` helper | R2.1 (B2) |
| FR12.2 (cross-role) | three-layer gate | R1.2 extended in B2 |
| FR12.3 (audit append) | typed `appendAudit` helper | R2.1 (B2) |
| FR12.4 (cross-tenant) | typed getter / setter takes `businessId` | unit test on typed surface |

## Sources

- [nfr-requirements-security] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/security-requirements.md`
- [u1-security-design] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-design/security-design.md` — U1 security patterns
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-design/nfr-design-questions.md` — Q2=A
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 5
