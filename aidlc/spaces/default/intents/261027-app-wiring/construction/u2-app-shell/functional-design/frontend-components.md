# Frontend Components — u2-app-shell

> Screens and shared pieces U2 adds or changes. Behaviour: `functional-spec.md` W1–W7. Rules:
> `rules.md`. Existing pieces from U1 are named where U2 extends them. Copy is Bangla first, English
> second; the Bangla strings below are the catalogue's.

## Hierarchy

```text
App (src/router/App.tsx)
└── Shell (PresentationComponent)
    ├── Header: title · email · role label · language · sign-out          (BR2.3)
    ├── Nav: NavItem[] derived from the screen route map, filtered by role  (BR2.1, BR2.2)
    └── Outlet: the resolved screen (W1)
        ├── SignIn / SignUp / NotFound / Lock                              (U1; Lock extended, BR4.1)
        ├── Order screens (list, detail, manual, paste-parse, repeat, transition)  (U1, now on ApiState + SubmitGuard)
        ├── AuditTrail                                                     (new, W4)
        └── NotAvailable (feature)                                         (new, BR1.1)
Shared: ApiState (RequestState alias) · SubmitGuard · Toast · ErrorBanner · FieldError
```

## Components

### ApiState (generalises `RequestState`; Q5)

| Prop | Type | Notes |
|------|------|-------|
| `phase` | `loading \| empty \| error \| ready` | |
| `locale` | `bn \| en` | |
| `errorKind` | C1 kind or `unreachable` | required when `phase` is `error` |
| `correlationId` | string | shown for `internal` only |
| `onRetry` | () => void | rendered only for retryable kinds (BR5.3) |
| `onReload` | () => void | rendered for the conflict kinds |
| `empty` | node | the screen's empty message and action |
| `feature` | i18n key | used by the inline lock and not-found views |

Views per kind follow BR5.2. `forbidden` renders `Lock` inline; `not_found` renders `NotFound` inline;
`unauthenticated` calls the session store's sign-in handoff (U1 W9) and renders nothing.
`RequestState` is exported as the same component, so U1's order screens keep working unchanged.

### SubmitGuard (Q6)

A hook used by every form that writes: `{ state, submit(run), reset() }`. `submit` does nothing while
`state` is `saving`; the form's submit control reads `state === "saving"` for `disabled` and
`aria-busy`. Success shows the polite toast "সংরক্ষণ হয়েছে"; failure keeps the fields and moves focus
per U1's `focus.ts`.

### Lock (extended; BR4.1)

Shows "এই অংশ আপনার দায়িত্বের বাইরে" and the feature's name (for example "অডিট ট্রেইল"), and a
link "হোমে যান" to the first screen the role can open (`/orders` for every role today). Never a dead end.

### NotAvailable (new; BR1.1)

Heading: the feature's name. Body: "এই অংশ পরের সংস্করণে আসবে" / "This part arrives in a later
release". Link: "হোমে যান". Used by `/daily-card`, `/business`, `/settings`, and by `/accept-invite`,
`/reset`, `/recover` until U3.

### AuditTrail (new; W4)

| Element | Content |
|---------|---------|
| Heading | "অডিট ট্রেইল" |
| Row | action label (raw action when no label) · time in Bangla digits · actor email or "সিস্টেম" · subject kind and short id |
| Empty | "এখনো কোনো এন্ট্রি নেই" |
| More | "আরও দেখুন" button while `nextCursor` is not null; appends the next page |
| States | `ApiState` (loading, empty, error) |

`data-testid`: `audit-trail`, `audit-row`, `audit-more`.

### Nav (changed; BR2.1)

Items: `/orders` "অর্ডার", `/daily-card` "দৈনিক কার্ড", `/audit-trail` "অডিট ট্রেইল", `/business`
"ব্যবসা", `/settings` "সেটিংস". Each item names only its path and label; visibility comes from the
route's access. U3 adds `/staff`; U4 adds the catalog items.

## Interaction and validation

| Flow | Rule |
|------|------|
| Typed parameter | `/orders/:id` parses a UUID before the screen renders; failure → not-found (BR1.3) |
| Keyboard | every control native or `tabIndex` 0; forms submit on Enter; `:focus-visible` outline token (BR9.2, BR9.3) |
| 360 px | no fixed width over 360 px; tables scroll inside their own box (BR9.1) |
| Retry | only reads, `unreachable`, `db_unavailable` (BR5.3) |

## API integration

| Screen | Call | Contract |
|--------|------|----------|
| AuditTrail | `GET /api/audit?cursor&limit` | C4 |
| Order screens | unchanged | C3 |
| Shell | `GET /api/session` (U1) | C2 |
