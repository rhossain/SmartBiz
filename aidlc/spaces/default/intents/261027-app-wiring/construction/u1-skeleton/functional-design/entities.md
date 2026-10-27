# Entities — u1-skeleton

> Source of truth for the data U1 creates or changes. Technology-agnostic: logical types only.
> Owners follow `../../../inception/domain-design/components.md`. Decisions: `functional-design-questions.md` Q1–Q12.
> Entities U1 does not change (Invitation, PasswordReset, ConsignmentLink) are listed only where U1
> touches their grants.

```yaml
entities:
  - name: Business
    owner: AuthComponent
    description: The one business this deployment serves.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: name, type: text, required: true, min: 1, max: 120 }
      - { name: locale, type: enum, allowed: [bn, en], default: bn, required: true }
      - { name: ownerUserId, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    constraints:
      - "At most one Business row exists (singleton index businesses_singleton_idx; BR2.3)."
    relationships:
      - { to: User, cardinality: "1 Business has 1..n Users", direction: "User.businessId -> Business.id" }

  - name: User
    owner: AuthComponent
    description: A person who signs in. U1 adds businessId.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id, note: "new in U1; reference checked at transaction end (deferred) so sign-up can insert both rows" }
      - { name: email, type: text, required: true, unique: true, note: "unique ignoring case (unique index on lower(email), migration 0013)" }
      - { name: passwordHash, type: text, required: true, note: "private: never leaves AuthComponent (UserRecord only)" }
      - { name: role, type: enum, allowed: [owner, manager, sales_staff, accountant], required: true }
      - { name: active, type: boolean, required: true, default: true }
      - { name: locale, type: enum, allowed: [bn, en], default: bn, required: true }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    views:
      - name: PublicUser
        attributes: [id, email, role, locale]
        note: "the only User shape any domain function returns or any response carries"
    relationships:
      - { to: Business, cardinality: "n Users belong to 1 Business" }
      - { to: Session, cardinality: "1 User has 0..n Sessions" }

  - name: Session
    owner: AuthComponent
    description: A signed-in browser. U1 adds tokenHash and fixes the two limits.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: tokenHash, type: text, required: true, unique: true, note: "new in U1 (migration 0012 clears old rows first); SHA-256 hex of the cookie value; the raw value is never stored" }
      - { name: userId, type: uuid, required: true, references: User.id }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: issuedAt, type: timestamp, required: true }
      - { name: expiresAt, type: timestamp, required: true, note: "issuedAt + 30 days; never moved (absolute cap)" }
      - { name: lastSeenAt, type: timestamp, required: true, note: "touched on every successful resolve; idle limit = lastSeenAt + 12 hours" }
    constraints:
      - "A Session is valid only while now < expiresAt AND now < lastSeenAt + 12 h AND its User is active (BR3.4, BR3.5)."
    lifecycle: "see functional-spec.md §Session state machine"

  - name: Order
    owner: OrdersComponent
    description: B2 order. U1 adds itemsRevision for append-only line edits.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: itemsRevision, type: integer, required: true, default: 1, min: 1, note: "new in U1; the revision of OrderItem rows that are current" }
      - { name: customerId, type: text, required: false, max: 100, note: "free text until U5 makes it a Customer reference" }
      - { name: other attributes, type: "unchanged from B2", note: "businessId, orderNo, contact, status, source, repeatOfOrderId, money fields, createdBy, timestamps" }

  - name: OrderItem
    owner: OrdersComponent
    description: One line of an order at one revision. Rows are never updated or deleted.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: orderId, type: uuid, required: true, references: Order.id }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: revision, type: integer, required: true, default: 1, min: 1, note: "new in U1" }
      - { name: lineNo, type: integer, required: true, min: 1 }
      - { name: variantId, type: text, required: false, note: "free text until U5" }
      - { name: description, type: text, required: true, min: 1, max: 500 }
      - { name: quantity, type: integer, required: true, min: 1, max: 9999 }
      - { name: unitPricePaise, type: integer, required: true, min: 0 }
      - { name: lineDiscountPaise, type: integer, required: true, min: 0, default: 0 }
    constraints:
      - "(orderId, revision, lineNo) is unique."
      - "Current lines of an order are those with revision = Order.itemsRevision (BR6.8)."

  - name: AuditEntry
    owner: AuditService
    description: Unchanged shape. U1 adds the action auth.sign_out and removes emails from auth payloads.

  - name: SignInAttemptCounter
    owner: AuthComponent
    description: In-memory value, not persisted. Failed sign-in count per typed email.
    attributes:
      - { name: key, type: text, required: true, note: "trimmed, lower-cased typed email" }
      - { name: failures, type: integer, required: true, min: 0, max: 5 }
      - { name: windowEndsAt, type: timestamp, required: true, note: "first failure + 15 minutes" }

  - name: DeclaredGrant
    owner: PersistenceComponent
    description: The exact privileges app_role holds per table; the realdb gate compares the database with this list.
    attributes:
      - { name: table, type: text, required: true, unique: true }
      - { name: privileges, type: set, allowed: [SELECT, INSERT, UPDATE, DELETE], required: true }
    values:
      users: [SELECT, INSERT, UPDATE]
      businesses: [SELECT, INSERT, UPDATE]
      sessions: [SELECT, INSERT, UPDATE, DELETE]
      invitations: [SELECT, INSERT, UPDATE]
      password_resets: [SELECT, INSERT, UPDATE]
      audit_log: [SELECT, INSERT]
      orders: [SELECT, INSERT, UPDATE]
      order_items: [SELECT, INSERT]
      consignment_link: [SELECT, INSERT]
      orders_order_no_seq: "[USAGE, SELECT] (sequence)"
```

## Summary

U1 changes four persisted entities and adds two in-memory or declared ones:

- **User** gains `businessId`, so staff (U3) and the Owner resolve their business the same way and the zero-UUID fallback disappears.
- **Session** gains `tokenHash`; the cookie carries a random value that is never stored. `expiresAt` becomes a fixed 30-day cap and `lastSeenAt` drives the 12-hour idle limit.
- **Order** gains `itemsRevision` and **OrderItem** gains `revision`: an edit appends a new set of lines instead of deleting the old ones, so `order_items` needs no DELETE grant (Q1).
- **Business** becomes a singleton.
- **SignInAttemptCounter** is a process-memory value per typed email.
- **DeclaredGrant** is the list the realdb gate checks exactly; `order_items` loses DELETE and the auth tables gain their first grants (P-5).
