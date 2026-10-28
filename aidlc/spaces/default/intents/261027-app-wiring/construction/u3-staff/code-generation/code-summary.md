# Code Summary — u3-staff

> Unit U3 (staff, service, M): US1.5 (invite staff and let them sign in) and US1.6 (recover a forgotten
> password without an email service). Plan: `code-generation-plan.md` (approved). Method: test-after,
> Standard strategy, 80 % line floor over every `src` file. Branch `app-wiring`, one commit per plan step
> (the plan ticks for a step sometimes ride in a second commit with the same step number).

## Final gate result

`bun run gate` on commit `07fb3ca` (end of Step 13), first run, exit 0:

```text
gate ok 07fb3ca1a177: 565 tests pass, walks server 168 / client 171 checks, no-secret 5043 scans 1.3 s, lines 94.36 %, bundle 96.9 KB gz, mutants 28/28, bun audit clean, dependencies unchanged, secrets clean, tests/realdb 56 pass, wiring-check ok, browser: ok (32 ms, 16 screens), bench base ok (4.7 min)
```

Step 14 then added two unit tests (NFR6.23, and the audit labels for NFR8.16) and changed no source:
`bun run test` 567 pass, 0 fail; coverage 94.36 % over 154 `src` files; type-check, lint and format clean.
The gate was not re-run after those two test additions. The Bolt merge still needs `bun run gate --large`
(see the README's "Merging Bolt 1"). It was not run in this stage.

## What was built, per step

| Step | Commit(s) | What changed |
|------|-----------|--------------|
| 1 | `2855cfb` | Skeletons with header comments for the ten new modules; the `reset-password` package script (no dependency change). |
| 2 | `81075f7` | Runner checked: `bun test` 481 pass on U2 code. The U3 runnable-before-tests command gave 22 pass. |
| 3 | `5186a43` | Migration `0017_unique_token_hashes.sql`: a guarded `duplicate_token_hash` stop, two `CREATE UNIQUE INDEX IF NOT EXISTS`, no grant. README: the index drop is paired with the `_migrations` ledger delete (I-01). |
| 4 | `3ca6757` | 0017 text tests. Realdb: the index definitions, index use with `enable_seqscan = off`, and the duplicate stop at 0016 followed by a successful apply (I-02). The grants test is unchanged and green. |
| 5 | `ddbe4c2` | `one-time-token.ts` (32 bytes base64url via U1's generator, SHA-256 via `sha256.ts`, `127.0.0.1` links). `retry.ts` (`withRetry` on 40P01/40001). `invite.ts` (`createInvitation`, `listStaff`). `accept-invite.ts` (`acceptInvitation`, S19 order). `password-reset.ts` (`createResetLink` for staff and terminal, `completeReset`). `recover.ts` (no `sql`, no gate). Four BR8.1 audit helpers. Removed: `flowLimiters`/`resetFlowLimiters`, `requestRecovery`/`resetPassword`, the four B1 audit helpers, the zero-UUID fallback and the `uuid.uuid` tokens. Added the delegation matrix, stub handlers for every new statement shape, and one-shot stub faults. |
| 6 | `4cbe95c`, `27b5747` | Data-access tests (unit and realdb, listed below). Five mutants. The mutant runner now passes the realdb URLs to mutants mapped to a realdb file. `auth.invite_accepted` now has a null actor (see Deviations). |
| 7 | `cd9f661` | C6 schemas in `src/auth/schemas.ts`: strict requests; trimmed, lower-cased emails; response schemas for B2 and B4. `isValidEmail` moved into the browser-safe schemas module. |
| 8 | `bc95c06`, `bcf67c6` | Delegation test (every caller × role and caller × target pair). Audit payload test. Three mutants. |
| 9 | `eac740c` | Staff handlers, plus the accept, recover and reset handlers. Six routes registered and `PUBLIC_ALLOW_LIST` extended by three. `ServerDeps.hooks` is optional. `serverDeps()` builds production deps without hooks. |
| 10 | `f9c3e20`, `4c75cbe` | Role table: six API rows and `LINK_ALLOW_LIST`. Fixtures. Server and no-secret walks updated. `staff-routes`, `server-deps` and route-table tests. Outage test now covers accept. Recover mutant. |
| 11 | `11b9965` | `LinkSheet`, the props-only `Staff` screen and its container. Accept and Reset rewritten over one shared `PasswordLinkScreen`. Recover rewritten. Token containers. Staff client. `/staff` route and nav item. Password-changed notice on sign-in. U3 copy and audit labels. The `/staff` role-table row. |
| 12 | `cf839b0` | Staff-screen, token-screens and link-sheet tests. Screens and shell tests moved to the new props and nav. |
| 13 | `07fb3ca` | `reset-password` command and its realdb process test. Wiring check covers U3 (NFR8.19). Smoke checks `GET /api/staff`, now testable as `runSmoke`. Browser check adds the three token screens. Bench covers U3. README. One secret-scan allow-list entry. Full gate run. |
| 14 | this commit | The NFR6.23 and NFR8.16 tests; this summary, `source-manifest.json` and `traceability.json`. |

## Test results

- Unit and integration: 567 pass, 0 fail (481 at the start of the stage).
- Realdb (gate step 13): 56 pass. `staff.realdb.test.ts` has 11 cases:
  - atomic fault injection on all four write paths;
  - forced accept and reset races, where B pauses inside its transaction, A waits on a lock (seen in `pg_stat_activity`), and `FOR UPDATE NOWAIT` on B's rows fails with 55P03;
  - the invite supersede race;
  - invite against accept, both orders;
  - a Manager's invite against a reset of that Manager, both orders;
  - lock order users → resets;
  - a reset deletes every session and closes the user's other open resets;
  - a new link closes the old one;
  - 40P01 twice answers `gone`;
  - only hashes are stored.

  `reset-password-script.realdb.test.ts` has 2 cases. The migrations test has 3 new cases. The outage test now covers accept.
- Walks: server 168 checks and client 171 checks over 19 API rows and 19 screen rows; the no-secret walk made 5043 scans over 60 responses. Accept and reset succeed in the walk with real tokens.
- Coverage: 94.36 % lines over 154 `src` files. Every new and changed U3 `src` file is at 100 % lines except `App.tsx` (77 %, where U2's own paths were already uncovered), `render-staff-route.tsx` (92 %) and `PasswordLinkScreen.tsx` (88 %).
- Mutants: 28/28 caught, 9 of them new:
  - `accept-token-row-unlocked`, `invite-drops-business-lock`, `reset-lock-order-reversed`, `reset-keeps-sessions` and `reset-link-keeps-siblings` are mapped to a unit test plus `tests/realdb/staff.realdb.test.ts`. A separate run showed that the realdb test alone also kills each of the five.
  - `manager-may-invite-manager`, `accept-role-from-request`, `invite-audit-keeps-email` and `recover-looks-up-user`.
- Wiring check: invite → accept (signed in) → reset link → reset → old cookie 401. The four audit rows hold no `@`. 27 screens rendered.
- Browser check: 16 screens at 360 px, with `/staff`, `/accept-invite`, `/reset` and `/recover` among them.
- Bench (base), run on this machine during development:

  | Measure | Target | Result |
  |---------|--------|--------|
  | `GET /api/staff` p95 | ≤ 300 ms | 6.0 ms |
  | `POST /api/staff/invitations` p95 | ≤ 300 ms | 17.4 ms |
  | `POST /api/staff/:userId/reset-links` p95 | ≤ 300 ms | 14.8 ms |
  | `POST /api/auth/recover` p95 | ≤ 300 ms | 0.4 ms |
  | accept, max of 10 | ≤ 1.5 s | 165 ms |
  | reset, max of 10 | ≤ 1.5 s | 147 ms |
  | unknown-token 410 p95 | ≤ 50 ms | 2.5 ms |
  | unknown-token hash-gate calls | 0 | 0 |
  | recover median difference (report-only) | printed | 0.0 ms |

  The gate's own bench run passed too. No timing failure occurred, so no rerun was needed.

## Deviations from the design, with reasons

1. **`auth.invite_accepted` has a null actor.**
   - Design: S19/BR8.1 write the row audit-first, before the user exists.
   - Conflict: `audit_log.actor_user_id` is a non-deferrable foreign key to `users`, so the row cannot name the new user as its actor.
   - Real Postgres refused it with 23503; the stub could not show this.
   - Resolution: the row keeps audit-first order. The actor is null, the subject is the new user, and the payload carries `{invitationId, role, userId}`. The audit trail shows "সিস্টেম" as its actor. The alternative was to insert the user first and break audit-first order.
2. **`delegation.ts` was written in Step 5, not Step 7.** The step-5 data functions call it. Its tests stayed in Step 8.
3. **The mutant runner and gate step 10 changed** (`scripts/mutants.ts`, `scripts/gate.ts`).
   - A mutant whose mapped tests include a `tests/realdb` file now receives the realdb URLs. The runner used to strip them, which would have let the row-lock mutants be judged by unit tests only.
   - `REALDB_CONTAINER` is always stripped, so no mutant run can stop the gate's database.
4. **The `drop FOR UPDATE on the token row` mutant is killed by a NOWAIT probe.**
   - Under the D-03/E-01 lock order, the business row lock alone serialises racing accepts. Dropping the token-row `FOR UPDATE` therefore does not change the race outcome.
   - The P-01 test now also asserts that a third session cannot lock B's token row (`FOR UPDATE NOWAIT` → 55P03). That is what kills this mutant.
5. **New file `src/router/screens/PasswordLinkScreen.tsx`.** `Accept.tsx` and `Reset.tsx` are now thin wrappers over one shared form, so the two screens cannot drift. Both files were rewritten in place; nothing is duplicated.
6. **The token containers receive `navigate` from App.**
   - They do not import `hash-router`, because that would close an import cycle: hash-router → routes → container.
   - The containers still decide where to go: accept → `/orders`, reset → `/sign-in`.
7. **Two more modified files: `src/client/session-store.ts` and `src/router/screens/SignIn.tsx`.**
   - `session-store.ts` gains the `password_changed` notice and `passwordChanged()`.
   - `SignIn.tsx` shows "পাসওয়ার্ড বদলানো হয়েছে; নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন" (BR9.5).
8. **The audit trail's "টার্মিনাল" actor is inferred.**
   - The page read carries no payload (U2 F-09), so the screen cannot read `via`.
   - Instead, a `auth.reset_link_created` row with no actor shows "টার্মিনাল". Staff links always name their actor, and users are never deleted, so a missing actor always means the terminal.
9. **`isValidEmail` moved into `src/auth/schemas.ts`.** `sign-up.ts` re-exports it. This lets the recover container check emails without pulling argon2 into the bundle.
10. **Smoke refactor.** `scripts/smoke.ts` now exposes `runSmoke`, and the command line behaves as before. I-04 assumed an existing smoke test, but none existed, so `tests/unit/smoke.test.ts` is new.
11. **Wiring check reads 50 audit rows.** It used to read 5. The role walk now also writes reset-link rows, which pushed `order.create` out of a 5-row page.
12. **Browser check covers the three token screens.** It walks `/accept-invite`, `/reset` and `/recover` signed out (NFR9.10). The plan named only `/staff`.
13. **Secret-scan allow-list entry.** It covers `…/u3-staff/infrastructure-design/reviews/review-01.md` `url-password`, an earlier record that quotes the scan's own URL pattern in prose. It holds no credential.
14. **Accept's address-bar handling.** App's session probe on load runs before the token container mounts, while `t` is still in the address bar. That probe uses a fixed URL, and browsers never send the fragment. The container then removes `t` before any request of its own; `token-screens.test.tsx` asserts both.
15. **The email gateway (`src/auth/email.ts`) was deleted in the review fixes (G-06).** No path sends email. Its exports and `tests/integration/email-gateway-failure.test.ts`, the only test of it, went with it.
16. **Session creation after an accept stays after the commit (G-05), as U1's sign-up does.**
    - Accept commits the user, the used invitation and its audit row first, then issues the session. If that session step fails, the account exists but the response is a 500.
    - The accept screen handles that case. On a 500 whose `kind` is `internal`, it drops the token and sends the person to sign-in with the notice "অ্যাকাউন্ট তৈরি হয়েছে; সাইন ইন করুন".
    - Any other kind, such as 409 `email_taken`, 410 or 503, keeps the existing message on the form.
    - The other option, one transaction that also inserts the session, would hold the business lock across the session insert and would differ from sign-up.

## Review fixes (review-01, G-01..G-06)

The decisions were made on the Owner's standing instruction. The code is in commit `7fd2bff`.

| Id | Severity | Finding | Fix | Evidence |
|----|----------|---------|-----|----------|
| G-01 | Major | A sign-in that verified the old password could commit a session after a reset | `signIn` locks the business row (`FOR KEY SHARE`) and then the user row (`FOR UPDATE`), keeping the business → users order. It then re-reads `password_hash` and `active`. A changed hash or an inactive user gets the same `invalid_credentials`, no session, and an audited failure (`bad_password` / `inactive`). The limiter is cleared only after the session is issued. | `tests/unit/sign-in.test.ts` (hash changed, user deactivated, lock order). `tests/realdb/staff.realdb.test.ts`: sign-in paused through `hooks.beforeTransaction`, `completeReset` commits, then 401, no Set-Cookie, zero sessions, one `bad_password` row. Mutant `sign-in-skips-recheck` is killed by the realdb test |
| G-02 | Major | Guards without mutants | New mutants: `invite-ignores-supersede-guard`, `reset-link-ignores-target-guard`, `accept-skips-locked-recheck` (realdb), `reset-skips-locked-recheck` (realdb), `accept-keeps-invitation-unused` | All 6 new mutants are killed (`--only` runs). In a throwaway worktree, each realdb mutant failed an assertion in its race test, not a timeout |
| G-03 | Minor | No realdb case for an email taken after the pre-check | The admin inserts a user with the invited email (other case) after the invite. Accept then answers 409 `email_taken`, the invitation stays unused, and no `auth.invite_accepted` row is written. | `tests/realdb/staff.realdb.test.ts` |
| G-04 | Minor | `listStaff` not tested on real Postgres | Tests role order (owner, manager, sales_staff, accountant), `canReset` false for an inactive member, the expired and used invitation filters, and that 200 bulk users give 200 members with `truncated: true` and the Owner first | `tests/realdb/staff.realdb.test.ts` |
| G-05 | Minor | A 500 after an accept commit leaves the person stranded | Recorded as deviation 16: on a 500 `internal`, the screen goes to sign-in with the account-created notice; other kinds are unchanged | `tests/integration/token-screens.test.tsx` (500 → `#/sign-in` plus the notice; 409 and 503 keep the form) |
| G-06 | Minor | Unused email gateway | `src/auth/email.ts`, its exports and its only test deleted; the ci.yml comment no longer names it | `tsc`, lint and the suite are clean |

The realdb file sets `setDefaultTimeout(30_000)`, because two existing both-orders race cases hit bun's 5 s default while the machine was under outside load (about 29 on 8 cores, from other Playwright processes).

## Missed or deferred targets

- **NFR6.21:** the < 20 ms timing parity is report-only by revision N-02. The structural zero-SQL and zero-gate test is the gate.
- **Merge gate:** the `--large` run is not done here. It belongs to the Bolt merge.
- **Re-run:** the gate was not re-run after Step 14's two added unit tests. The suite and coverage were re-run.
- **Copy:** some Bangla UI strings were authored here because the design gives none for them: table headings, button labels, the "copied" and "selected" statuses, and "প্রথম ২০০টি দেখানো হচ্ছে". Every string the design does give is used verbatim.
- No AC, BR or NFR is marked GAP in `traceability.json`.

## Left uncommitted

Nothing. The throwaway dev container `smartbiz-u3dev` was removed. No worktree, temporary database or Chrome process remains.
