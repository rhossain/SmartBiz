# Tech Stack Decisions — u1-skeleton

> Existing stack: `codekb/SmartBiz/technology-stack.md`. Rules: project.md Tech Stack ("bun's built-in
> HTTP server, no separate web framework"), team.md Code Style, NFR10 (zero spend). U1 adds no new
> runtime dependency.

| Concern | Decision | Rationale | Alternatives rejected |
|---------|----------|-----------|-----------------------|
| HTTP server | `Bun.serve` on 127.0.0.1 with our own route table (`src/server/`) | project.md Tech Stack; one process, one origin; the route table must be data for the role walk | Hono / Express (second stack, against project.md); Vite dev server proxy (two origins) |
| Static files | the server serves Vite's `dist/` with long-lived caching for hashed assets and `no-store` for `index.html` | one origin; fresh app after each build | separate static server |
| Database client | postgres.js (existing), pool max 5, `prepare: false`, connect timeout 10 s, statement timeout 5 s set per connection | already in use; timeouts make outages fail fast (NFR7) | a new ORM |
| Password hashing | argon2 (existing, m=64 MiB, t=3, p=1) | B1 decision; native addon stays server-only | bcrypt |
| Randomness and hashing | Web Crypto (`crypto.getRandomValues`, `crypto.randomUUID`, `crypto.subtle.digest('SHA-256')`) on both sides; `sha256` helper moves into AuthComponent | browser-safe shared kernel (BR7.3); no `node:crypto` in browser code | `node:crypto` everywhere |
| Validation | zod 4.6.7 (existing), `.strict()` schemas per route in each feature's `schemas.ts` | team.md; shared by server and client | hand-written validators |
| Browser client | `fetch` with `AbortController` (10 s), no data-fetching library | NFR6.5 bundle budget; one consumer | TanStack Query, axios |
| UI | React 18.3 (existing), hash router (existing) | already built | — |
| Build | Vite 6.4.5 (existing) + a bundle-size and server-code gate script | NFR6.5, BR7.2 | — |
| Tests | `bun test` with happy-dom (existing); realdb on Docker `postgres:18`; `tests/e2e/wiring-check.ts`; `tests/perf/order-api.bench.ts` | team.md Testing Posture; all local and free | Playwright (not installed; a real-browser check stays manual per stories R-07) |
| Lint rules | ESLint 8 `no-restricted-imports` overrides for browser files and `src/data/**` | BR7.1, BR7.4 | a separate dependency-cruiser tool |
| Secret scan | a small committed bun script with regexes and an allow-list file | NFR3.8, zero spend | gitleaks binary (fine later, not needed now) |
| Dependency audit | `bun audit --audit-level=high` (existing gate) | project.md Testing Posture | hosted scanners (zero spend) |
| Configuration | environment variables `PORT`, `DATABASE_URL`, `MIGRATE_DATABASE_URL`; `.env.example` committed | FR1.2, team.md Deployment | a config file with secrets |
