# Observability Requirements — u3-staff

> Local, zero-spend observability as in U1/U2. IDs continue U2's.

| ID | Requirement | Detail |
|----|-------------|--------|
| NFR8.16 | Every staff action is in the audit trail | `auth.invite_created`, `auth.invite_accepted`, `auth.reset_link_created` (`via` staff or terminal), `auth.password_reset`; each shows on `/audit-trail` with the actor's email from the user join and a Bangla action label |
| NFR8.17 | Refusals are counted in the request log, not the audit log | 410s, 403s and 429s on U3 routes appear as request lines with status; a failed accept or reset writes no audit row (nothing typed is kept) |
| NFR8.18 | Coverage floor | ≥ 80 % lines over every `src` file, including U3's new and changed files and `scripts/reset-password.ts`'s module |
| NFR8.19 | The skeleton check covers U3 | the wiring check invites a Sales Staff member, accepts, signs in as them, creates a reset link, resets, and confirms the old session gets 401 |
