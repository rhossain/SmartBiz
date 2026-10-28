# Frontend Components — u3-staff

> Screens U3 adds or replaces. Behaviour: `functional-spec.md` W1–W7. Rules: `rules.md`. Shared pieces
> from U1/U2 (`ApiState`, `useSubmitGuard`, `LinkSheet`, `Toast`, `Field`) are reused, not copied.

## Hierarchy

```text
App → Shell (nav gains "কর্মী" for owner, manager)
├── StaffScreen (/staff)                      W1, W3, W7
│   ├── MembersTable (email · role · active · রিসেট লিংক where canReset)
│   ├── InvitationsTable (email · role · expires)
│   ├── InviteForm (email, role select of invitableRoles)
│   └── LinkSheet (link once, copy, close)
├── AcceptInviteScreen (/accept-invite, public)   W2
├── ResetScreen (/reset, public)                  W5
└── RecoverScreen (/recover, public)              W6
```

## Components

| Component | Props / state | Notes |
|-----------|---------------|-------|
| StaffScreen | loads `GET /api/staff`; `ApiState` for loading, empty, errors | heading `data-testid="screen-title"` "কর্মী"; role labels from i18n |
| InviteForm | `email`, `role`, `useSubmitGuard` | role select lists `invitableRoles` only; 409 shows "এই ইমেইল আগে থেকেই আছে"; success opens LinkSheet and reloads the list |
| MembersTable | members | reset button `data-testid="staff-reset-<id>"` only where `canReset`; inside `.scroll-x` |
| LinkSheet | `link`, `expiresAt`, `onClose` | shows link, copy button (`navigator.clipboard.writeText`, with a select-all fallback), "এই লিংক একবারই দেখানো হবে", expiry time in Bangla; close clears state |
| AcceptInviteScreen | `token` in a ref, `password`, `confirm` | on mount: read `t`, `history.replaceState` to `#/accept-invite`; no token → the 410 message without a request; mismatch → field error; 410 → "লিংকটি আর কাজ করে না; নতুন লিংক চান"; 201 → session store refresh, go to `/orders` |
| ResetScreen | as above | 204 → `/sign-in` with the password-changed notice |
| RecoverScreen | `email` | after submit, always the neutral sentence; never a link; the sign-in link stays |

## Validation

| Field | Rule | Message |
|-------|------|---------|
| email (invite, recover) | valid email | "সঠিক ইমেইল লিখুন" |
| password | ≥ 10 characters | "পাসওয়ার্ড অন্তত ১০ অক্ষরের হতে হবে" |
| confirm | equals password | "দুটি পাসওয়ার্ড মেলেনি" |

## API integration

| Screen | Call | Contract |
|--------|------|----------|
| StaffScreen | `GET /api/staff`, `POST /api/staff/invitations`, `POST /api/staff/:userId/reset-links` | C6 |
| AcceptInviteScreen | `POST /api/invitations/accept` | C6 |
| ResetScreen | `POST /api/auth/reset` | C6 |
| RecoverScreen | `POST /api/auth/recover` | C6 |

`src/client/staff-api.ts` parses every response with the shared schemas in `src/auth/schemas.ts`.
