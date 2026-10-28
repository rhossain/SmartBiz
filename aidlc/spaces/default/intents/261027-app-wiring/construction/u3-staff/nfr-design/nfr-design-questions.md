# NFR Design — Questions (u3-staff)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U3's NFR
> requirements (incl. the revision N-01..N-07 and follow-ups P-01, P-02), functional design (incl. F-01..F-08),
> contracts C1, C5, C6 (B1–B5), C9, U1/U2 NFR designs (patterns up to S17, P14, R11, O14, SC3), which U3
> continues as S18+, P15+, R12+, O15+, SC4+.

## Q1. Where the shared token code lives

A. One module `src/auth/one-time-token.ts`: `newToken()` (32 bytes, base64url), `hashToken()` (SHA-256 hex), and `linkFor(kind, token, port)`; invitations, resets and the terminal command all use it. The session token keeps U1's helpers, which this module reuses
B. Inline per feature
X. Other (please specify)

[Answer]: A. One place to review the token shape and the link format.

## Q2. Structure of the public token routes

A. Each of accept and reset is one domain function with the F-01 order: parse → length → unlocked lookup (410) → hash via `deps.hashGate` (429) → `withRetry(1, 40P01|40001)` transaction (lock, re-check, audit-first writes). Test hooks are an optional `deps.hooks` (P-02) the server never passes
B. Split lookup and write into separate handlers
X. Other (please specify)

[Answer]: A. One function per route keeps the order reviewable and testable as a whole.

## Q3. Old code

A. `invite.ts`, `accept-invite.ts` and `recover.ts` are rewritten in place (same file names, new contents); `password-reset.ts` holds `createResetLink` and `completeReset`; the retired helpers in `audit.ts` are deleted; the four new audit helpers sit in `audit.ts` beside U1's. No `flowLimiters` remain
B. New files beside the old
X. Other (please specify)

[Answer]: A. Brownfield rule: change in place, no duplicates.
