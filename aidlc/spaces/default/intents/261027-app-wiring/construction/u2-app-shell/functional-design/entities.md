# Entities — u2-app-shell

> Source of truth for the data shapes U2 adds or changes. Technology-agnostic: logical types only.
> Owners follow `../../../inception/domain-design/components.md`. Decisions:
> `functional-design-questions.md` Q1–Q13. U2 adds no table and no migration; AuditEntry is a read view
> of the existing `audit_log`, and the rest are in-app or test shapes.

```yaml
entities:
  - name: AuditEntry
    owner: AuthComponent (AuditService)
    description: One row of the audit trail as the API returns it (contract C4). A read view of audit_log; never written by U2.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: occurredAt, type: timestamp, required: true }
      - { name: action, type: text, required: true, note: "dotted action name, e.g. order.create, auth.sign_in" }
      - { name: subjectKind, type: text, required: false }
      - { name: subjectId, type: text, required: false }
      - { name: actorEmail, type: text, required: false, note: "the acting user's email from users; absent for system rows and failed sign-ins with no matched account" }
      - { name: correlationId, type: text, required: true }
      - { name: reversesId, type: uuid, required: false, references: AuditEntry.id }
    constraints:
      - "Only rows of the session's business (BR7.1)."
      - "Only rows whose retentionUntil is after the app clock's now (BR7.2)."
      - "The payload and retentionUntil are never part of this view (Q3)."
    relationships:
      - { to: AuditEntry, cardinality: "0..1 reversed entry", direction: "reversesId -> id" }

  - name: AuditPage
    owner: AuthComponent (AuditService)
    description: One page of the audit trail.
    attributes:
      - { name: entries, type: "list<AuditEntry>", required: true, max: 50 }
      - { name: nextCursor, type: text, required: false, note: "opaque keyset cursor over (occurredAt, id); null on the last page" }

  - name: ScreenRoute
    owner: RouterComponent
    description: One entry of the client's typed screen route map.
    attributes:
      - { name: path, type: text, required: true, unique: true, note: "kebab-case hash path; parameters as :name" }
      - { name: access, type: "capability set | public", required: true, note: "public, or any one of the listed capabilities opens it" }
      - { name: params, type: "map<name, parser>", required: false, note: "one parser per :name; e.g. id -> UUID (BR1.3)" }
      - { name: screen, type: "screen kind", required: true, note: "a real screen or the not-available placeholder; never empty (BR1.1)" }
      - { name: feature, type: "i18n key", required: true, note: "the feature's name, used by the lock and placeholder screens" }
    constraints:
      - "Every path in the map has an access value (BR1.2)."

  - name: NavItem
    owner: RouterComponent
    description: One link in the Shell's navigation. App (Router) builds the list from the route map and passes it to the Shell as a prop (review F-01).
    attributes:
      - { name: to, type: text, required: true, references: ScreenRoute.path }
      - { name: label, type: "i18n key", required: true }
    constraints:
      - "The capability shown is the referenced route's access, never a separate value (BR2.1)."

  - name: ApiStateView
    owner: PresentationComponent
    description: What a screen shows for one request.
    attributes:
      - { name: phase, type: enum, allowed: [loading, empty, error, ready], required: true }
      - { name: errorKind, type: enum, required: false, allowed: [invalid_input, invalid_email, password_too_short, invalid_credentials, unauthenticated, forbidden, not_found, conflict, already_linked, not_editable, invalid_transition, business_exists, email_taken, gone, payload_too_large, rate_limited, internal, db_unavailable, unreachable], note: "the C1 kinds plus the client-only unreachable" }
      - { name: correlationId, type: text, required: false }
      - { name: retryable, type: boolean, required: true, note: "true for unreachable, db_unavailable and loading failures of reads (BR5.3)" }

  - name: SubmitGuard
    owner: PresentationComponent
    description: The state of one form's save.
    attributes:
      - { name: state, type: enum, allowed: [idle, saving, saved, failed], required: true, default: idle }
    constraints:
      - "A submit while saving is ignored (BR6.1)."

  - name: RoleTableRow
    owner: tests (contract C5)
    description: One row of tests/spec/role-table.ts, restated inline, never imported from src/auth.
    attributes:
      - { name: surface, type: enum, allowed: [api, screen], required: true }
      - { name: method, type: enum, allowed: [GET, POST, PATCH, DELETE], required: false, note: "api rows only" }
      - { name: path, type: text, required: true }
      - { name: allowed, type: "list<role> | public", required: true }
    constraints:
      - "(surface, method, path) is unique."
      - "The api rows equal the server route table exactly, and the screen rows equal the screen route map exactly (BR3.2)."

  - name: LinkAllowList
    owner: tests (contract C5)
    description: The closed list of responses that may carry a raw token in a field named link.
    attributes:
      - { name: routes, type: "list<method path>", required: true, note: "empty in U2; U3 adds POST /api/staff/invitations and POST /api/staff/{userId}/reset-links" }
```

## Summary

| Entity | Kind | Owner | Notes |
|--------|------|-------|-------|
| AuditEntry, AuditPage | API read view | AuthComponent (AuditService) | Retention-filtered, keyset-paged, no payload (Q3) |
| ScreenRoute | in-app | RouterComponent | Typed parameters, never an empty screen (Q1, Q10) |
| NavItem | in-app | PresentationComponent | Capability taken from the route (Q11) |
| ApiStateView, SubmitGuard | in-app | PresentationComponent | One kind-to-screen mapping; one save guard (Q5, Q6) |
| RoleTableRow, LinkAllowList | test spec | tests (C5) | One spec for both role walks and the no-secret walk (Q7, Q8) |

U2 changes no table, grant or migration. `Role` keeps its four values and `Capability` its ten; the
Manager keeps `audit.view` (Q4).
