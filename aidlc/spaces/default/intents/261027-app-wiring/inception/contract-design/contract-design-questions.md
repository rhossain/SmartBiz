# Contract Design — Questions (App Wiring, B6)

> Answered by the assistant on the Owner's standing instruction (2026-10-27): "don't stop for my
> approval or suggestion; decide the right options". Summary confirmation is off. Inputs:
> `../units-generation/unit-of-work.md`, `unit-of-work-dependency.md` (DAG U1 → U2 → {U3, U4}, U4 → U5),
> `../domain-design/components.md`, `../requirements-analysis/requirements.md`, and the existing
> domain signatures in `src/orders/` and `src/data/zod-schemas.ts`.

## Q1. Is there a public or external API?

A. No external consumer. The only consumer of the HTTP API is our own browser app (ApiClientComponent), served from the same origin on `127.0.0.1`. The HTTP API is still pinned here as a contract because four Units add endpoints to it and the browser and server are built separately
B. Treat it as a public API with versioned URLs
X. Other (please specify)

[Answer]: A. Nothing outside this machine calls it (team.md Deployment: `127.0.0.1` only).

## Q2. Mechanism per boundary

A. Browser ↔ server: synchronous JSON over HTTP (REST-style paths under `/api/`), session cookie auth. U4 → U5: in-process TypeScript function calls. Unit ↔ Unit for data: one Postgres with numbered migrations and a declared grant set. No events or queues
B. Events between Units
X. Other (please specify)

[Answer]: A. One process, one database (units Q5); events would add machinery with no consumer.

## Q3. Who owns each spec?

A. U1 owns the shared HTTP conventions (envelope, status table, headers, cookie, cursor) and the auth and order endpoints; U3 owns the staff endpoints; U4 owns the catalog endpoints and the read functions U5 calls; U2 owns the role-table test data that U3 and U4 extend. Each endpoint's request and response zod schema lives in the owning feature's `schemas.ts` and is imported by both server and client (domain-design R-01)
B. One central owner for every endpoint
X. Other (please specify)

[Answer]: A. The owner is the Unit that ships the endpoint; the shared schema file makes drift a type error.

## Q4. Versioning and breaking changes

A. No URL versioning (one consumer, shipped in the same build). Additive changes (new optional field, new endpoint) are safe; the client parses with schemas that strip unknown keys. A breaking change (rename, removal, type change, new required request field) changes the server and client in the same commit, and the test that parses every recorded response with the client schema must pass
B. `/api/v1/` with a deprecation window
X. Other (please specify)

[Answer]: A. Server and client always deploy together from one `main` commit.

## Q5. Errors, timeouts and retries

A. Errors: one envelope `{ "error": <kind>, ... }` with the fixed kind → status table (AC2.1a.4, closed set, plus `invalid_transition` 409 already in B2's domain). Timeouts: the client aborts a request after 10 s and reports `unreachable`. Retries: the client never retries a state-changing call automatically; it retries a GET once after a network error; the screens offer a manual "আবার চেষ্টা করুন". The in-process U4 → U5 calls return `Result` values and throw only infrastructure errors
B. Automatic retries with backoff on every call
X. Other (please specify)

[Answer]: A. Automatic retry of a POST could create a duplicate order; one local server has no transient-network class worth backoff.

## Q6. Paging

A. Keyset cursor, opaque to the client: the server encodes `createdAt|id` as base64url, and the client passes it back unchanged. `limit` defaults to 50 and is capped at 50 on the API (the domain's 1 000 cap stays for internal use). A cursor that does not decode is 400 `invalid_input`
B. Offset paging
X. Other (please specify)

[Answer]: A. Matches B2's `list-orders.ts` and AC2.1a.7 ("at most 50 per page", tampered cursor 400).
