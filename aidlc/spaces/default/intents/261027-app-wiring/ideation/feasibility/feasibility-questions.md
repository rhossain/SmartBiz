# Feasibility Questions — App Wiring (B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27: "Please don't stop for my
> approval or suggestion. Just decide for me the right options. This is a dummy project till now").
> Each answer says what it rests on.

## Q1. What existing systems must this integrate with?

A. Only this repository: the B1 foundation (auth, role gate, audit log, router, screens) and B2 orders, plus the Postgres schema in `src/db/migrations/0001–0010`
B. A, plus an external identity provider for sign-in
C. A, plus a hosted email or SMS gateway for invitations and password resets
D. Not yet defined
X. Other (please specify)

[Answer]: A. Only this repository. The B1 email gateway is already a free-tier stub that degrades gracefully (`tests/integration/email-gateway-failure.test.ts`), and a hosted identity provider would break the zero-spend rule (intent [desc]). Chosen on the Owner's instruction.

## Q2. Which regulatory or compliance requirements apply?

A. NBR bookkeeping: the 5-year insert-only audit log (team.md §Dep-6, TC9); no card data (NFR5.4 deny-list); customer PII kept out of the audit log (B2 follow-up R-05)
B. A, plus a formal privacy regime for the customer and staff data the catalog stores
C. None
D. Not yet defined
X. Other (please specify)

[Answer]: B. A, plus customer and staff personal data (names, phones, addresses, emails, password hashes) handled with least exposure. No specific Bangladeshi data-protection statute is cited here; that is an open assumption for the compliance check. Chosen on the Owner's instruction.

## Q3. What is the team's tech stack and skill profile?

A. One owner-developer; TypeScript strict, React 18, Vite 6, bun 1.4 (runtime, test runner, `Bun.serve` HTTP), postgres.js, zod 4, argon2 (team.md §CS, project state)
B. A, but a separate backend language is acceptable
C. Not yet defined
X. Other (please specify)

[Answer]: A. Keep the single TypeScript stack: the API server runs on bun's built-in HTTP server, so no new runtime or framework is required (team.md §CS-4 single `package.json`). Chosen on the Owner's instruction.

## Q4. What are the budget and timeline constraints?

A. Zero spend; no deadline
B. Zero spend; a fixed deadline
C. Not yet defined
X. Other (please specify)

[Answer]: A. Zero spend, everything on this machine (intent [desc]); the Owner named no trigger or deadline (intent-capture Q4). Chosen on the Owner's instruction.

## Q5. Any organizational blockers?

A. None, beyond hosted GitHub Actions being unavailable on this account, so CI runs locally (B2 CI decision)
B. A change freeze or competing priority
C. Not yet defined
X. Other (please specify)

[Answer]: A. None, beyond hosted CI being unavailable; local CI is the merge evidence. Chosen on the Owner's instruction.

## Q6. Which AWS services and accounts are in use?

A. None. No cloud account is used; Postgres runs in local Docker (`postgres:18`)
B. An existing AWS account
C. Not yet defined
X. Other (please specify)

[Answer]: A. None (zero spend; team.md §Dep-5 defers any hosting vendor). Chosen on the Owner's instruction.

## Planned Output

- **feasibility-assessment.md**
  - Technical viability: the work is feasible on the existing stack. The new parts are a bun HTTP
    API server, a typed fetch client, a cookie session over the existing B1 sessions table, a
    composition root that mounts the router, and the B3 catalog (five entities). Main risks:
    - B3 makes the work large for a single Bolt;
    - session and CSRF handling is new security-critical code;
    - the B2 order functions need `getCustomer`/`getVariant` switched from stubs to the real catalog.
- **constraint-register.md**: zero spend and local only; single TypeScript stack; the 5-year
  insert-only audit; no PII in the audit log; no card data; an 80 % coverage floor and local CI as
  merge evidence; trunk-based, squash to `main`.
- **raid-log.md**: risks (scope size, session security, catalog migration ordering), assumptions
  (no specific data-protection statute; Owner-only users for now), issues (hosted CI unavailable),
  dependencies (B1/B2 code, Docker).

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
