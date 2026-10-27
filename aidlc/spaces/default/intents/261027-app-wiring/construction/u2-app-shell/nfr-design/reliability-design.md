# Reliability Design — u2-app-shell

> Designs for NFR7.9–NFR7.14 (`../nfr-requirements/reliability-requirements.md` and N-01). U1's R1–R6
> (503 classification, start-up checks, atomic writes, idempotent migrations, client timeout and retry,
> backup) are unchanged; U2 adds R7–R11.

## R7 — Screens degrade to a message plus retry (NFR7.9, NFR7.10)

| Kind | View | Retry |
|------|------|-------|
| `unreachable` (client timeout or network error) | "সার্ভারের সাথে যোগাযোগ হচ্ছে না" | yes, re-runs the read |
| `db_unavailable` (503) | "ডাটাবেসের সাথে যোগাযোগ হচ্ছে না" | yes |
| `internal` (500) | the catalogue message with the correlation id | yes for reads only |
| conflict kinds (409) | the conflict message | reload, not retry |

Retry calls the screen's own load function again; the client still retries a GET once by itself after a network error (U1 R5), so one press can mean up to two requests, never a write.

## R8 — Save guard (NFR7.11)

`useSubmitGuard()` holds `idle | saving | saved | failed`. `submit(run)` returns at once while `saving`; otherwise it sets `saving`, awaits `run()`, and sets `saved` or `failed`. The form's submit control has `disabled` and `aria-busy` while `saving`. Field values live in the form's own state and are never reset on failure. Tests: a double click sends one request; every error kind leaves the fields unchanged.

## R9 — Session expiry mid-screen (NFR7.12)

U1's `http.onUnauthenticated` stores the path (without query, S16) and shows sign-in; after success the app navigates back. `ApiState` renders nothing for `unauthenticated`, so there is one handoff (F-01).

## R10 — Conflicts (NFR7.13)

On a 409 the form keeps its values and shows the conflict view with "আবার লোড করুন"; reload refetches the record and replaces the form's values only after the person confirms, so nothing typed is lost silently.

## R11 — Audit route during an outage (NFR7.14)

The audit handler uses U1's pipeline and DB error classifier, so a connection failure answers 503 `db_unavailable` with a coded body and the process stays up. U1's outage realdb test gains `GET /api/audit` beside its existing three routes.

**Availability and backup:** unchanged from U1.
