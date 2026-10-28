# Tech Stack Decisions — u3-staff

> U3 adds no dependency (NFR10.3). Rules: project.md Tech Stack, team.md Code Style.

| Concern | Decision | Rationale | Alternatives rejected |
|---------|----------|-----------|-----------------------|
| Tokens | Web Crypto `getRandomValues` (32 bytes) + base64url; `crypto.subtle.digest('SHA-256')` (U1's helpers) | one token shape; browser-safe shared kernel | uuid-based tokens (weaker, inconsistent) |
| Password hashing | argon2 (existing) through U1's hash gate | bounded memory and CPU | a second limiter per route |
| Concurrency | `SELECT … FOR UPDATE` on the business row (invites) and the users row then reset rows (resets); one retry on 40P01/40001 | correct under races without new infrastructure | advisory locks (harder to read), serializable isolation (more retries) |
| Terminal command | `scripts/reset-password.ts` with `bun --env-file=.env`; package script `reset-password` | runs only where the terminal is | an admin web page (would need a stronger auth path) |
| Clipboard | `navigator.clipboard.writeText` with a select-all fallback | works on `127.0.0.1` (secure context) | a library |
| Email | none sent; the existing email gateway stays optional and unused | zero spend; C6 | SMTP service |
