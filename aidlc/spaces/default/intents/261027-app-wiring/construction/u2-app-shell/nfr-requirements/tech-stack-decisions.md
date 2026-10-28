# Tech Stack Decisions — u2-app-shell

> Existing stack: `codekb/SmartBiz/technology-stack.md` and U1's decisions. Rules: project.md Tech Stack,
> team.md Code Style and Testing Posture, NFR10 (zero spend). U2 adds no runtime or dev dependency.

| Concern | Decision | Rationale | Alternatives rejected |
|---------|----------|-----------|-----------------------|
| Role table | a plain TypeScript module `tests/spec/role-table.ts`, rows written out inline | C5; one spec both walks read; never imports `src/auth` | generating rows from `capability.ts` (would test the code against itself) |
| Server walk | `bun test` over the exported `handle(request, deps)` with the fail-closed SQL stub (`tests/helpers/server-harness.ts`) | fast, no port, no database (NFR6.16) | a real-database walk (slow; the realdb tests already cover the data paths) |
| Client walk | `bun test` with happy-dom and `@testing-library/react`, mounting `App` with a stubbed client per role | team.md: arithmetic and rendering in happy-dom | a real browser for every route (slow, geometry only needed for 360 px) |
| Real-browser check | a bun script driving headless Chrome over the DevTools protocol through bun's built-in WebSocket; `CHROME_PATH` env var with the macOS default | team.md: Chrome path parameterised; no new dependency (Q2) | Playwright, Puppeteer (new dependencies), `chrome-launcher` (not installed) |
| Audit read | SQL in the domain function in `src/audit/`, connection injected, keyset cursor encoded like the order list's | team.md: no repository layer; C1 paging | an offset paging (slow on a growing table) |
| Response schemas | zod `.strict()` request schema and a shared response schema in `src/audit/schemas.ts`, parsed by the client wrapper | contract ownership rule 2 | — |
| UI state | React state in the screen plus the shared `ApiState` and submit guard; no data-fetching library | bundle budget; U1's choice | TanStack Query |
