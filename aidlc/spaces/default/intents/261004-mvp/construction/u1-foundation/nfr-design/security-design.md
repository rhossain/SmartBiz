# Security Design — U1-foundation (B1)

> Per-Unit security design for U1-foundation. Inherits the
> U1-foundation NFR Requirements Q2=A answer verbatim:
> **NFR5 unchanged (BR3.1, NFR5.1-NFR5.6)**, with R1.1
> (audit-immutability migration test) and R1.2
> (three-layer-gate absence test + Owner inverse) as the
> binding CI gates. Brownfield run (SmartBiz BD).
> Single-tenant topology. Free-tier envelope. No PCI scope.

> **REVIEW TARGET** — this file is the `review_artifact`
> for the NFR Design stage's `aidlc-architecture-reviewer-
> agent` (max 2 iterations, adversarial class).

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md` — NFR5.1-NFR5.6 binding
- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — argon2id + sha256 + cookie session binding
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md` — BR2.1-BR2.4 (authorization)
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md` — User / Business / Invitation / AuditEntry
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md` — typed function-calls
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4

## Threat model (U1-specific)

| Threat | Surface | Mitigation | NFR binding |
|---|---|---|---|
| **Password compromise** | sign-up / sign-in | argon2id (m=64MB, t=3, p=1) | NFR5.2 |
| **Invitation token leakage** | invitation acceptance | sha256(token) in DB; raw token in URL once | NFR5.3 |
| **Session theft** | cookie | HttpOnly, Secure, SameSite=Lax, 30-day rolling | NFR5.5 (auth) |
| **CSRF on state-mutating actions** | three-layer-gate dispatch | SameSite=Lax + typed function-calls (no cross-origin GET-with-side-effects) | NFR5.6 |
| **Audit-log tampering** | appendAudit | DB-level INSERT-only (revoke UPDATE / DELETE on `audit_log` role) | NFR5.1, R1.1 |
| **Privilege escalation** | three-layer gate | typed `Capability` matrix + per-route absence test (R1.2) | NFR5.6, NFR6 |
| **Cross-tenant access** | appendAudit / getBusinessSettings | `business_id` typed into every query; absence test (R1.2 inverse) | BR2.4, NFR5.1 |
| **Brute force on sign-in** | sign-in screen | rate-limit at the typed-state-container (in-process token bucket) | NFR5.2 (operational) |
| **Email enumeration** | recovery / invitation | identical response shape for "user exists" / "user does not exist" | NFR5.2 |
| **XSS via Field primitive** | Field rendering | React's default escaping + Zod-validated input | NFR5.6 |
| **Open redirect on invitation accept** | invitation acceptance | allowlist of redirect paths; reject `//` and `\\` | NFR5.3 |
| **DB credential leak** | deploy | env var, never logged; stdout is JSON-only | NFR5.6 |

## Authentication architecture

### Password storage (NFR5.2)

```
sign-up(password):
  hash = argon2id(password, salt=random(16), m=64MB, t=3, p=1)
  store { user_id, hash, salt, params: {m, t, p} } in users
```

```
sign-in(email, password):
  row = SELECT * FROM users WHERE email = $1 LIMIT 1
  if !row: return typed-error InvalidCredentials
  ok = argon2.verify(row.hash, password)
  if !ok: return typed-error InvalidCredentials
  session = createSession(row.user_id)
  return { sessionCookie, user }
```

**Decision (record)**: argon2id over bcrypt — argon2id is
memory-hard and the recommended default in 2026; bcrypt is
CPU-only and weaker against GPU/ASIC attacks. The free-
tier managed-DB does not need to know the password.

### Invitation token (NFR5.3)

```
invite(email, role):
  raw_token = random(32)  // 256 bits
  sha = sha256(raw_token) // store this
  store { sha, email, role, business_id, expires_at: now + 7d }
  email_send({ to: email, link: /accept-invite?token=<raw_token> })
  return { sha } // never return raw_token
```

**Decision (record)**: sha256 over bcrypt for invitation
tokens. Tokens are high-entropy (256 bits from
`crypto.randomBytes`); bcrypt's slow hash is unnecessary
and would add 100ms+ to every invitation check. sha256 is
the right primitive for "compare a high-entropy secret".

### Session (NFR5.5)

```
createSession(user_id):
  session_id = random(32)
  store { session_id, user_id, created_at, expires_at: now + 30d }
  return cookie('sid', session_id, { HttpOnly, Secure, SameSite=Lax, Path=/, Max-Age=30d })
```

**Decision (record)**: cookie-based session over JWT. The
single-tenant topology + small user count (≤ 5) + free-
tier envelope make a server-side session more appropriate
than a token system. JWT would force a revocation list
(against the free-tier envelope) for the same security
properties.

| Property | Value | Why |
|---|---|---|
| `HttpOnly` | true | JS cannot read it (XSS-safe) |
| `Secure` | true | TLS-only |
| `SameSite` | `Lax` | CSRF protection (state-mutating POSTs not sent on cross-origin GET) |
| `Path` | `/` | All routes |
| `Max-Age` | 30 d | Rolling session |
| `expires_at` in DB | 30 d | Authoritative; cookie can be tampered |

## Authorization architecture (three-layer gate)

The three-layer gate (BR2.4) is the binding dispatch for
every U1 route:

```
dispatch(routePath, ctx):
  // Layer 1: auth
  if !ctx.session: return redirect(/sign-in)
  // Layer 2: capability
  route = routes.get(routePath)
  if !ctx.user.capabilities.has(route.requiredCapability):
    return typed-error Forbidden
  // Layer 3: business rule
  if route.businessRule:
    result = route.businessRule(ctx)
    if result.kind === 'deny': return typed-error BusinessRuleDenied
  return render(route.screen)
```

| Layer | Mechanism | Failure mode | NFR binding |
|---|---|---|---|
| 1. Auth | Cookie session lookup | redirect to /sign-in | NFR5.5 |
| 2. Capability | `Set<Capability>` membership on `User` | 403 typed error | NFR5.6, NFR2 |
| 3. Business rule | Pure function returning typed result | typed error | BR2.4, NFR7.4 |

**Negative position (no role-based middleware)**: roles are
not a layer. The capability set is the source of truth; the
`Role` enum is a derivation of the capability set. This
keeps the dispatch O(1) per route and avoids the "owner can
do everything" bug class.

## Input validation strategy

| Source | Validation | Where | NFR binding |
|---|---|---|---|
| HTTP request body | Zod schema per typed function-call | action dispatcher | NFR7.4 |
| Form input (Field) | Zod schema per Field type | Field primitive | NFR7.4 |
| URL params | Zod schema per route | route matcher | NFR7.4 |
| DB row | Zod schema on read | typed-entity layer | NFR7.4 |
| Cookie | length + base64 + signature | session middleware | NFR5.5 |

**All input is validated at the boundary**; downstream
code is typed and trusts the Zod parse.

## Encryption design

| At-rest | Mechanism | Where | NFR binding |
|---|---|---|---|
| User passwords | argon2id hash | `users` table | NFR5.2 |
| Invitation tokens | sha256 hash | `invitations` table | NFR5.3 |
| Session IDs | random(32) (not hashed; needed for lookup) | `sessions` table | NFR5.5 |
| DB snapshots (free-tier daily) | Vendor's encryption at rest | managed-DB | NFR1.2 |

| In-transit | Mechanism | Where | NFR binding |
|---|---|---|---|
| Browser ↔ vendor's runtime | TLS 1.3 | vendor's free-tier runtime | NFR5.6 |
| Runtime ↔ managed-DB | TLS 1.3 | vendor's connection string | NFR5.6 |
| Email gateway | TLS 1.3 (vendor's free-tier) | email gateway | NFR5.3 |

**No application-level encryption**: the vendor's free-
tier managed-DB and runtime already provide TLS + at-rest
encryption. Application-level encryption would require a
key-management story that the free-tier envelope does not
support.

## Security headers

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; script-src 'self'; style-src 'self' 'unsafe-inline'` | XSS mitigation; React's inline styles are needed for the design tokens |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing protection |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force TLS (set by vendor's runtime) |
| `Set-Cookie` | `HttpOnly; Secure; SameSite=Lax` | Session cookie hardening |

The vendor's free-tier runtime sets HSTS; the SPA sets
the rest via the `Shell` primitive's `<meta>` tags (CSP
must be `<meta>` because the bundle is static and the
vendor's runtime does not support per-route headers on
the free tier).

## Compliance controls (NFR5.1, NFR5.4, NFR5.5)

| Control | Implementation | Test | NFR binding |
|---|---|---|---|
| **DB-level insert-only audit** | `REVOKE UPDATE, DELETE ON audit_log FROM app_role` | R1.1 (audit-immutability migration test) | NFR5.1, R1.1 |
| **No PCI scope** | No card data ever stored; `payment_intent_id` is the only reference | (no test; absence by design) | NFR5.4 |
| **5-year audit retention** | `audit_log` partition by year; vendor's free-tier snapshot is the recovery point | (vendor's snapshot policy) | NFR5.5 |
| **3-layer gate (per route)** | `routes` registry + `Capability` set | R1.2 (three-layer-gate absence test) | NFR5.6, R1.2 |
| **Owner inverse (Owner reaches audit trail + daily card)** | typed function-call: `getAudit` requires `Capability.ViewAudit`, which Owner has | R1.2 (inverse assertion) | NFR5.6, R1.2 |
| **Cross-tenant isolation** | `business_id` typed into every query; absence test (no row from another business) | (test suite) | BR2.4 |

## CSRF strategy

**Decision (record)**: `SameSite=Lax` + typed function-
calls. The state-mutating typed function-calls are POST
(typed), and `Lax` does not send cookies on cross-origin
GET. There is no GET-with-side-effects surface (every
state-mutating action is a typed function-call, not a GET
URL).

**Negative position (no CSRF token)**: a CSRF token would
require a per-session secret in the cookie + a per-request
token in the body. With `SameSite=Lax` + no GET-with-side-
effects, the CSRF surface is already closed. Adding a
token would add complexity (and a storage requirement for
the per-session secret) without closing a real attack
vector in this topology.

## Rate limiting

| Surface | Limit | Where | Notes |
|---|---|---|---|
| sign-in | 5 / 15 min / IP | typed-state-container (in-process token bucket) | Free-tier envelope; no Redis |
| recovery request | 3 / hour / email | typed function-call | Vendor's email gateway is the backstop |
| invitation create | 10 / hour / user | typed function-call | Owner-only |
| invitation accept | 5 / 15 min / IP | typed function-call | Token-bucket |

The in-process token bucket is acceptable because the
free-tier envelope has ≤ 5 staff and the threat model is
"casual brute force", not "distributed attack".

## Secrets management

| Secret | Storage | Where | Notes |
|---|---|---|---|
| DB connection string | env var | `process.env.DATABASE_URL` | Never logged |
| Session signing key | env var | `process.env.SESSION_KEY` | 256-bit random, rotated yearly |
| Email gateway key | env var | `process.env.EMAIL_KEY` | Vendor's free-tier key |
| Argon2id params | constant | `crypto/argon2.ts` | m=64MB, t=3, p=1 (OQ-NFR-5 pending) |

**Negative position (no Vault / no AWS Secrets Manager)**:
the free-tier envelope does not include a secrets manager.
Env vars on the vendor's free-tier runtime are the
appropriate binding.

## CI gates (binding tests for NFR5)

| Gate | Asserts | Test | NFR binding |
|---|---|---|---|
| **R1.1** | Audit-immutability migration is idempotent; re-grant does not re-revoke | `audit-immutability-migration.test.ts` | NFR5.1, NFR1.2 |
| **R1.2** | Three-layer gate is absent for every U1 route that should NOT have it; Owner reaches the audit trail and daily card | `three-layer-gate-absence.test.ts` | NFR5.6, NFR6, BR2.4 |

R1.2 is also the `review_artifact` for the
`aidlc-architecture-reviewer-agent` (adversarial class,
max 2 iterations) — the reviewer is expected to attempt to
construct a route that bypasses the gate and verify the
absence test catches it.

## Open questions

- **OQ-NFR-5** (carry-forward) Confirm the argon2id cost parameters (m=64MB, t=3, p=1) with the platform engineer.
- **OQ-NFR-6** (carry-forward) Confirm the sha256 vs bcrypt decision for invitation tokens.

## Sources

- [nfr-requirements] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/security-requirements.md`
- [tech-stack-decisions] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md`
- [rules] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/rules.md`
- [entities] `aidlc/spaces/default/intents/261004-mvp/construction/u1-foundation/functional-design/entities.md`
- [contract-summary] `aidlc/spaces/default/intents/261004-mvp/inception/contract-design/contract-summary.md`
- [nfr-design-stage] `.claude/aidlc-common/stages/construction/nfr-design.md` — Step 4
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope
- [project-rules] `aidlc/spaces/default/memory/project.md` — basis pill + completeness control
