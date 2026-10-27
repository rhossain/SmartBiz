# Feasibility Assessment — App Wiring (B6)

> Inputs: `../intent-capture/intent-statement.md` and the answers in `feasibility-questions.md`
> (Q1–Q6, decided on the Owner's standing instruction and confirmed "Looks correct"). Market Research
> was skipped (no market or build-vs-buy question).

## Verdict

**Feasible, with one sizing risk.** Everything requested can be built on the existing stack, on this
machine, at zero spend. The widened boundary (wiring plus the B3 catalog) is the main risk: it is two
pieces of work of different kinds, and Scope Definition should decide whether they ship as one Bolt
or two.

## Technical viability

| Capability | Viable? | Basis | Notes |
|------------|---------|-------|-------|
| API server owning the database | Yes | bun's built-in HTTP server; postgres.js already used by `src/db/client.ts` | No new runtime or framework (Q3) |
| Order operations over HTTP behind the role gate | Yes | B2 functions (`createOrder`, `updateOrder`, `transitionStatus`, `linkConsignment`, `getOrder`, `listOrders`) already take a role-bearing context and re-check permissions | The server adds a gate check per route, so the role is enforced at the server and the database layer too |
| Typed client for the screens | Yes | zod schemas already describe every order input | Screens keep their existing props; a client adapter fills `onSave` and friends |
| Real sign-in and sessions | Yes | B1 already has users, argon2 password hashing, a sessions table (`0004_create_sessions.sql`), sign-in, sign-up and recover screens | New: an HTTP-only session cookie, expiry, sign-out, and cross-site request protection |
| Router mounted in the app | Yes | `src/router` dispatch and routes exist and are tested by absence over every route | The composition root in `src/index.tsx` is the missing piece |
| B3 catalog (customers, products, variants, suppliers, inventory) | Yes, larger | MVP stories US2.10–US2.18; B2 already calls `getCustomer` and `getVariant` stubs | Needs new migrations, operations, screens and tests; the B2 stubs switch to real reads |
| Scripted end-to-end check without a browser | Yes | The server can be started in-process against the local Postgres, and the API exercised by `bun test` | Joins the local CI's real-database job |
| Zero spend | Yes | Docker `postgres:18` locally; no hosted service needed (Q4, Q6) | — |

## Risk analysis

| ID | Risk | Likelihood | Impact | Response |
|----|------|------------|--------|----------|
| RK-1 | Wiring plus B3 is too large for one Bolt and stalls review | High | Medium | Scope Definition decides one Bolt or two (wiring first, then B3) |
| RK-2 | Session handling is security-critical new code (cookie theft, cross-site requests, fixation) | Medium | High | HTTP-only, SameSite cookies; rotate the session on sign-in; server-side expiry; threat-model at NFR stages |
| RK-3 | Catalog migrations change tables the order functions already read | Medium | Medium | Add-only migrations; the order tests and `tests/realdb` stay green as the gate |
| RK-4 | Bundle grows past the 350 KB budget once screens are mounted | Low | Medium | Existing bundle-size gate (NFR2.b) catches it; today it is 47.6 KB |
| RK-5 | Personal data of customers and staff leaks through API errors or logs | Medium | High | No PII in logs or the audit log (R-05 rule); errors carry codes, not records |

## Assumptions & Open Questions

- [assumption] No specific Bangladeshi data-protection statute is applied; personal data gets
  least-exposure handling by design (Q2).
- [assumption] The Owner is the only user for now, so staff invitations stay as B1 built them (intent Q2).
