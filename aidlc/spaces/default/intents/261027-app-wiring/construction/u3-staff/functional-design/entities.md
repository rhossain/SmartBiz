# Entities — u3-staff

> Source of truth for the data U3 changes or exposes. Technology-agnostic: logical types only. Owners
> follow `../../../inception/domain-design/components.md`. Decisions: `functional-design-questions.md`
> Q1–Q12. U3 adds no table; it adds unique indexes (migration 0017) and changes how two existing tables
> are used.

```yaml
entities:
  - name: Invitation
    owner: AuthComponent
    description: A one-time, 7-day offer for an email to join the business with a role.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: email, type: text, required: true, note: "stored to match on accept; never in an audit payload or log" }
      - { name: role, type: enum, allowed: [manager, sales_staff, accountant], required: true }
      - { name: acceptTokenHash, type: text, required: true, unique: true, note: "SHA-256 hex of 32 random bytes; unique index added by 0017" }
      - { name: expiresAt, type: timestamp, required: true, note: "createdAt + 7 days on the app clock" }
      - { name: usedAt, type: timestamp, required: false, note: "set on accept or when superseded by a newer invitation for the same email (Q5)" }
      - { name: createdBy, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
    constraints:
      - "Pending = usedAt is null AND expiresAt > now; at most one pending invitation per (business, lower(email)), kept by supersede (BR2.4)."
    relationships:
      - { to: Business, cardinality: "n Invitations belong to 1 Business" }
      - { to: User, cardinality: "created by 1 User" }

  - name: PasswordReset
    owner: AuthComponent
    description: A one-time, 30-minute link to set a new password for one user.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: userId, type: uuid, required: true, references: User.id }
      - { name: tokenHash, type: text, required: true, unique: true, note: "SHA-256 hex of 32 random bytes; unique index added by 0017" }
      - { name: expiresAt, type: timestamp, required: true, note: "createdAt + 30 minutes on the app clock" }
      - { name: usedAt, type: timestamp, required: false, note: "set when used, and on every other open reset of the same user when one is used (BR4.3)" }
      - { name: createdAt, type: timestamp, required: true }
    relationships:
      - { to: User, cardinality: "n PasswordResets belong to 1 User" }

  - name: StaffMember
    owner: AuthComponent
    description: The public view of a user on the staff screen.
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: email, type: text, required: true }
      - { name: role, type: enum, allowed: [owner, manager, sales_staff, accountant], required: true }
      - { name: active, type: boolean, required: true }
      - { name: canReset, type: boolean, required: true, note: "whether the caller may create a reset link for this member (BR1.3); computed on the server" }
    constraints:
      - "Never carries a password hash (PublicUser rule)."

  - name: StaffList
    owner: AuthComponent
    description: Response of GET /api/staff.
    attributes:
      - { name: members, type: "list<StaffMember>", required: true, max: 200 }
      - { name: invitations, type: "list<{id, email, role, expiresAt}>", required: true, max: 200, note: "pending only" }
      - { name: invitableRoles, type: "list<role>", required: true, note: "the roles the caller may invite (BR1.2)" }
      - { name: truncated, type: boolean, required: true }

  - name: OneTimeLink
    owner: AuthComponent
    description: The raw link returned once by the two allow-listed routes (C6 link_carve_out).
    attributes:
      - { name: link, type: text, required: true, note: "http://127.0.0.1:<PORT>/#/accept-invite?t=<token> or /#/reset?t=<token>" }
      - { name: expiresAt, type: timestamp, required: true }
    constraints:
      - "Returned only in the 201 body of its creating request; never stored raw, never logged, never re-read."
```

## Summary

| Entity | Kind | Notes |
|--------|------|-------|
| Invitation | table `invitations` (existing) | 7 days, one pending per email by supersede, hash unique (0017) |
| PasswordReset | table `password_resets` (existing) | 30 minutes, all open resets closed on use, hash unique (0017) |
| StaffMember, StaffList | API views | `canReset` and `invitableRoles` computed on the server from the delegation matrix |
| OneTimeLink | API view | the only raw token a response may carry (C5 allow-list) |

Grants are unchanged (C9: SELECT, INSERT, UPDATE on both tables; no DELETE). The `sessions` DELETE grant
already exists and is what ends every session on reset.
