# Performance Requirements — u3-staff

> Derived from inception NFR6 and NFR9; decisions Q1, Q2. IDs continue U2's.

| ID | Requirement | Target | Statistic | Load condition | Measurement |
|----|-------------|--------|-----------|----------------|-------------|
| NFR6.19 | `GET /api/staff`, `POST /api/staff/invitations`, `POST /api/staff/:userId/reset-links`, `POST /api/auth/recover` | ≤ 300 ms | p95 per route | 100 calls after 10 warm-up; 20 members and 50 invitations seeded | benchmark (base profile) |
| NFR6.20 | `POST /api/invitations/accept` and `POST /api/auth/reset` | ≤ 1.5 s | max of 10 calls | one argon2 hash each (m=64 MiB, t=3, p=1) | benchmark; an unknown token answers 410 in ≤ 50 ms p95 with no hash (F-01) |
| NFR6.21 | Recover timing parity | < 20 ms | difference of medians, known vs unknown email | 50 calls each | benchmark (Q2) |

## Screens (NFR9)

| ID | Requirement | Verification |
|----|-------------|--------------|
| NFR9.10 | `/staff`, `/accept-invite`, `/reset`, `/recover` and the link sheet show Bangla by default with Bangla digits for times; at 360 px they do not scroll sideways (tables in `.scroll-x`) | happy-dom copy tests; the U2 browser check gains the staff screen |
| NFR9.11 | Every control is reachable by keyboard; the copy button works with Enter; focus moves to the link after it appears | happy-dom keyboard test |
