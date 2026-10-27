# NFR Design — Questions (u2-app-shell)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs: U2's NFR
> requirements (incl. review follow-ups N-01..N-06), functional design (incl. F-01..F-10), contracts C1,
> C4, C5, and U1's NFR design (patterns S1–S10, P1–P8, R1–R6, O1–O9, which U2 continues as S11+, P9+,
> R7+, O10+, SC1+).

## Q1. How the walks get their answers

A. The server walk calls the exported `handle(request, deps)` directly with the fail-closed SQL stub, one stub handler per query shape, and a fixed clock; each role gets a seeded session row. The client walk mounts `App` in happy-dom with a stubbed `fetch` that answers from the same role table (allowed → a minimal valid body; forbidden → 403), so the client walk also proves the screens react to the server's refusals
B. Start a real server and database for the walks
X. Other (please specify)

[Answer]: A. No port and no database keeps the walks inside their 60 s budget (NFR6.16); the realdb tests already cover real data paths.

## Q2. The audit keyset query

A. One statement: rows of the session's business with `retention_until > $now` and, when a cursor is given, `(occurred_at, id) < ($cursorTime, $cursorId)`, ordered by `occurred_at DESC, id DESC`, `LIMIT $limit + 1`, left-joined to `users` for the email. `$now` comes from the app clock. A new index `audit_log (business_id, occurred_at DESC, id DESC)` serves the seek; the retention filter is applied to the rows the index returns
B. Offset paging
X. Other (please specify)

[Answer]: A. Keyset paging stays flat as the table grows (NFR6.17), matches the order list's cursor, and passing the clock in keeps tests on the frozen clock.

## Q3. The real-browser script

A. `scripts/browser-check.ts` starts headless Chrome (`--headless=new --remote-debugging-port=0 --user-data-dir=<temp>`), reads the DevTools URL from Chrome's stderr, and talks to it over bun's WebSocket: set the 360 × 740 viewport, sign in through the real form, visit each route, read `scrollWidth`/`clientWidth`, then do 5 cold loads with the cache disabled for the timing. It exits 0 on pass, 1 on a failure and 2 when Chrome is not found, so the gate can print "not run" for 2
B. Use a test framework
X. Other (please specify)

[Answer]: A. A distinct exit code keeps "not run" from ever reading as a pass (NFR8.15).

## Q4. Where the kind-to-view mapping lives

A. In PresentationComponent as one exhaustive `switch` over the C1 kinds plus `unreachable`, with a `never` default; `ApiState` and the form field-error helper both use it. A new kind on the wire fails the type-check until it has a view
B. Per screen
X. Other (please specify)

[Answer]: A. team.md requires exhaustive switches over closed unions; one mapping is one place to review.

## Q5. Stylesheet checks

A. A unit test parses `tokens.css` and every other committed CSS file: it fails on a literal colour outside `tokens.css`, on a `width`/`min-width` over 360 px outside a scroll container class, and on a missing `:focus-visible` rule for `button, input, select, textarea, a, [tabindex]`. The existing contrast harness keeps checking token pairs
B. Review only
X. Other (please specify)

[Answer]: A. Cheap, deterministic, and catches the regressions the real-browser pass would find later.
