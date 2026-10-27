# NFR Requirements — Questions (u3-staff)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U3's functional
> design (BR1–BR10, review follow-ups F-01..F-08), inception NFR1–NFR10, contracts C1, C5, C6 (with
> amendments B1–B5), C9, and U1/U2's NFR requirements, whose IDs U3 continues (U2 ends at NFR1.8, NFR2.4,
> NFR3.15, NFR4.2, NFR5.7, NFR6.18, NFR7.14, NFR8.15, NFR9.9, NFR10.2).

## Q1. Latency of the new routes

A. Staff list, invite, reset-link and recover meet NFR6's p95 ≤ 300 ms. Accept and reset are dominated by one argon2 hash and meet U1's sign-in budget instead (≤ 1.5 s, max of 10 calls). Measured in the existing benchmark with 20 members and 50 invitations seeded
B. One budget for all
X. Other (please specify)

[Answer]: A. The hash is deliberately slow; holding accept and reset to 300 ms would mean weakening argon2.

## Q2. Timing of recover

A. The recover answer takes the same time for a known and an unknown email: both take one hash-gate slot without waiting (skipped when full) and touch no table; the benchmark asserts the difference between the two medians is under 20 ms over 50 calls each
B. No timing requirement
X. Other (please specify)

[Answer]: A. Identical bodies are not enough if timing differs; since recover does nothing for every email, equal timing is cheap to prove.

## Q3. Token strength and storage

A. 256-bit random tokens from Web Crypto; only SHA-256 hex stored, under unique indexes; raw tokens appear only in the 201 `link` of the two allow-listed routes and in the terminal output; never in logs, audit payloads, the address bar after load, or any later response
B. 128-bit tokens
X. Other (please specify)

[Answer]: A. Matches the session token and C6.

## Q4. Data classification

A. Staff emails are Confidential: returned only to `staff.invite` roles in the staff list and invitation response; never in logs or audit payloads (BR8.1, F-07). Invitation and reset token hashes are Restricted
B. Emails Internal
X. Other (please specify)

[Answer]: A. Consistent with U2's classification of `actorEmail`.
