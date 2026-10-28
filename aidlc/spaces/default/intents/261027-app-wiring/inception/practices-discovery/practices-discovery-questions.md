# Practices Discovery — Interview (App Wiring, B6)

> Re-run. The baseline is the affirmed `memory/team.md`. These questions cover only what the lead draft
> and the three independent reviews could not settle.
>
> Every answer was made by the assistant on the Owner's standing instruction (2026-10-27: "Please don't
> stop for my approval or suggestion. Just decide for me the right options. This is a dummy project
> till now"), and each states its basis. The Construction autonomy choice (`gated`) is a recorded
> choice and is not re-asked (`org.md` §Walking Skeleton).
>
> Point IDs: IP-n come from the lead draft. QA-n are from the quality review, DEV-n from the developer
> review, and SEC-n from the security review.

## Way of Working

### IP-2. Branches: one per piece of work, or one per Bolt?

A. One branch per Bolt, named by the Bolt slug, squash-merged to `main` when that Bolt passes; the intent's stage records ride on the Bolt branch that is open when they are written
B. One branch per intent, squashed once at the end
X. Other (please specify)

[Answer]: A. One per Bolt (team.md §WoW-1, §WoW-3 keep "branch per Bolt, 1–2 days"); this intent has two Bolts.

### IP-3. What counts as the green CI run before a merge?

A. Running every gate in `ci.yml` locally, including the real-Postgres job; the run's result line goes in the squash commit body; `ci.yml` stays the gate list and its push trigger is corrected; a one-command local runner is added when the Owner saves it from a terminal (it cannot be written from the agent session)
B. Only the unit suite
X. Other (please specify)

[Answer]: A. Hosted CI is disabled at zero spend; the local run already served as merge evidence for B2.

## Walking Skeleton

### IP-1. Build a thin end-to-end slice first? (A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in.)

A. Yes, for scopes that declare it (this `feature` intent does): the first Unit is the slice. It covers the API server, Docker Postgres, the mounted router, sign-in, and one order created and then listed. The command that proves it is chosen at the Construction checkpoint, as `org.md` requires
B. No, never
X. Other (please specify)

[Answer]: A. Scope-dependent, matching `org.md` and the `feature` scope's `skeleton: on` (lead draft X-1).

## Testing Posture

### IP-6. How much code does the 80 % coverage floor count?

A. Every `src` file: a test imports every module, entry points are guarded with `import.meta.main`, and a gate fails when any `src` file is missing from the coverage report
B. Only files a test happens to import (as today)
X. Other (please specify)

[Answer]: A. The quality review found 12 runtime files (about 316 lines) outside the floor today.

### IP-7. How is the mutation discipline enforced?

A. Scripted, named mutants for the critical invariants (segment isolation, bucket sets, exhaustive status, audit-first, role gate, no PII in audit), run in a throwaway git worktree as part of the local gate run; each must make a test fail
B. Manual, recorded per Bolt
X. Other (please specify)

[Answer]: A. CI stage 10 only checks that files exist, and no mutation run is recorded (quality review).

### QA-1. Should the in-memory SQL stub fail open?

A. No: an unrecognised query throws, so a test cannot pass on an empty result by accident
B. Keep returning `[]`
X. Other (please specify)

[Answer]: A. `tests/helpers/sql-stub.ts:507` hides queries that it does not understand.

### QA-2. The six-harness test shape (truth, smoke, flows, classes, contrast, story-coverage): `classes` and `story-coverage` do not exist yet.

A. Keep all six as required; mark `classes` and `story-coverage` as gaps with a target Bolt, and add a lint ban on bare `new Date()` / `Date.now()` in `src` outside `src/data/clock.ts`
B. Drop the two missing harnesses from the rule
X. Other (please specify)

[Answer]: A. The mutual-blindness design is an affirmed carry-forward (team.md §WoW-4); honest gaps beat a shortened rule.

## Deployment

### IP-4. What does "deployed" mean for now?

A. Running on this machine from a commit on `main`; after each merge, a local smoke check starts the server, signs in and lists orders. Staging and production stay as the future shape
B. A hosted staging slot
X. Other (please specify)

[Answer]: A. Zero spend; nothing is hosted (lead draft X-4, X-6).

### IP-5. Is "never pay for a service" a lasting project rule?

A. Yes, as a lasting hard rule: never add a paid hosted service, database, CI runner or provider. A free hosted service is allowed only when it is optional and the app degrades gracefully without it (the existing email gateway)
B. This intent only
X. Other (please specify)

[Answer]: A. The Owner's own words: "I won't invest any penny for this project! You need to do everything within this device!"

### SEC-2. Where does the server listen?

A. `127.0.0.1` only (this machine); no LAN access
B. All interfaces, so phones on the LAN can reach it
X. Other (please specify)

[Answer]: A. Least exposure. LAN access can be added later as a separate decision.

## Code Style and Security

### IP-8. How is the server/client boundary enforced?

A. An ESLint `no-restricted-imports` rule on browser files (allowing `import type`); a `vite build` gate with the router mounted; one new `src/server/` directory as the entry point that calls the domain functions. Feature directories stay as they are
B. A directory split into `client/` and `server/`
X. Other (please specify)

[Answer]: A. The developer review says option B would break the affirmed one-module-per-component decision; only three files leak node-only APIs today.

### DEV-1. How do errors map to HTTP?

A. Domain `Result` kinds map to fixed status codes (`invalid_input` 400, `unauthenticated` 401, `forbidden` 403, `not_found` 404, `conflict`/`already_linked` 409, `not_editable` 409); a thrown error is a 500 with a coded body and no record data; `sign-up.ts`'s catch-all is fixed as a defect
B. Free-form per endpoint
X. Other (please specify)

[Answer]: A. It keeps the existing Result-versus-throw idiom (developer review).

### SEC-1. How are secrets kept out of commits?

A. A free local pattern scan (key, token and password patterns, plus `.env` files) as a blocking step in the local gate run; no paid tool
B. By eye at review
X. Other (please specify)

[Answer]: A. The self-review item "no secrets committed" is checked by eye only today (security review).

### SEC-3. Session cookies in local development?

A. Always `Secure` with the `__Host-` prefix, `HttpOnly`, `SameSite=Lax`; browsers treat `http://localhost` as a secure context, so no off-switch is needed. Only a hash of the session id is stored
B. Turn off `Secure` for local development
X. Other (please specify)

[Answer]: A. Never weaken a security default (security review).

### SEC-4. A failed sign-in writes the typed email into the permanent audit log.

A. Do not store typed text from a failed sign-in: record the user id if the email matches an account, otherwise only the fact that an attempt failed
B. Keep the raw text
X. Other (please specify)

[Answer]: A. Same rule as B2's R-05: nothing that cannot be erased may hold possible PII or a mistyped password.

### SEC-5. Add a static code scanner (Semgrep) now?

A. Not now: ESLint plus the dependency scan, the secret scan, and the server gate test cover this intent; revisit when a later Bolt adds external input surfaces
B. Yes, now
X. Other (please specify)

[Answer]: A. Keeps the toolchain to bun and TypeScript only (project.md Tech Stack rule).
