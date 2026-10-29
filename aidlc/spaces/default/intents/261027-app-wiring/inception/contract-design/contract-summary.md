# Contract Summary — App Wiring (B6)

> Inputs: `../units-generation/unit-of-work.md` and `unit-of-work-dependency.md` (5 Units; DAG
> U1 → U2 → {U3, U4}, U4 → U5), `../domain-design/components.md`, `../requirements-analysis/requirements.md`,
> `../user-stories/stories.md`, `contract-design-questions.md` (Q1–Q6), and the existing domain
> signatures (`src/orders/*.ts`, `src/data/zod-schemas.ts`). There is no external consumer: the HTTP API
> serves only our own browser app on `http://127.0.0.1:<port>` (Q1). Field-level validation limits beyond
> those named here belong to each Unit's Functional Design; the shapes and the error behaviour here are binding.

## Contracts

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---------------|----------|-----------|-------|
| C1 | U1 u1-skeleton | U1–U5 (server handlers and the browser client) | shared schema: HTTP conventions (envelope, status table, headers, cookie, Origin, cursor) | U1 |
| C2 | U1 u1-skeleton | U1 client and screens; U2 role walk | sync HTTP/JSON: health, setup, sign-up, sign-in, sign-out, session | U1 |
| C3 | U1 u1-skeleton | U1 order screens; U2 role walk; U5 (changes `customerId`, `variantId`) | sync HTTP/JSON: orders | U1 (U5 amends) |
| C4 | U2 u2-app-shell | U2 screens; Owner, Manager, Accountant | sync HTTP/JSON: audit trail read | U2 |
| C5 | U2 u2-app-shell | U3, U4 tests | shared schema: role-table test data and the `link` allow-list | U2 |
| C6 | U3 u3-staff | U3 screens; U2 role walk | sync HTTP/JSON: staff list, invitations, accept, reset links, recover, reset; terminal command | U3 |
| C7 | U4 u4-catalog | U4 screens; U2 role walk | sync HTTP/JSON: customers, notes, products, variants, stock, cost, suppliers, low stock | U4 |
| C8 | U4 u4-catalog | U5 u5-orders-catalog | in-process TypeScript functions | U4 |
| C9 | each Unit's migrations | every Unit; the realdb grant gate | shared database schema: migration numbering and the declared grant set | PersistenceComponent, edited by each Unit |

## C1 — HTTP conventions (shared, owned by U1)

```yaml
# shared-schema: http-conventions v1
origin: "http://127.0.0.1:${PORT}"          # the only accepted Origin; localhost is refused
bind: 127.0.0.1
content_type:
  request: application/json                # required on POST/PATCH/DELETE; else 403 forbidden
  response: application/json; charset=utf-8
body_limit_bytes: 65536                     # larger bodies -> 413 {error: payload_too_large}
cookie:
  name: __Host-sb_session
  attributes: [Secure, HttpOnly, SameSite=Lax, Path=/]   # no Domain; cleared with Max-Age=0
  value: 32 random bytes, base64url          # only SHA-256(value) is stored in sessions.token_hash
  max_age: seconds left to the session's 30-day cap   # U1 FD amendment A1 (was: no Max-Age)
headers_on_every_response:
  Content-Security-Policy: "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY                      # NFR4; frame-ancestors covers modern browsers, this covers older ones
origin_rule: >
  Every POST, PATCH and DELETE, public routes included, must carry an Origin header exactly equal to the
  origin above; a missing Origin header is refused with 403 forbidden. GET and HEAD are not checked.
headers_on_api_responses:
  Cache-Control: no-store
  X-Correlation-Id: <id>                     # same id as the server log line and audit rows
error_envelope:
  shape: "{ error: <kind>, fields?: [{ path: string, message: string }], retryAfterMinutes?: integer, correlationId?: string }"
  rule: the kind string is never reworded; messages shown to people come from the client's Bangla copy, not from the server
status_table:                               # closed set; a new kind needs a row here first
  invalid_input: 400                         # body key "fields" lists zod issue paths; replaces "invalid_request" in AC2.1a.3
  invalid_email: 400                         # U1 FD amendment A2: auth kinds pass through unchanged
  password_too_short: 400
  invalid_credentials: 401                   # identical body for every failed sign-in
  unauthenticated: 401
  forbidden: 403                             # includes the Origin and content-type refusals
  not_found: 404                             # includes foreign-business ids and non-UUID ids
  conflict: 409
  already_linked: 409
  not_editable: 409
  invalid_transition: 409                    # exists in B2's order domain
  business_exists: 409
  email_taken: 409                           # only from the explicit check or a unique violation on users.email
  gone: 410                                  # used or expired invitation / reset link
  payload_too_large: 413
  rate_limited: 429                          # body carries retryAfterMinutes; Retry-After header in seconds
  internal: 500                              # thrown error: logged with correlation id; body {error: internal, correlationId}
  db_unavailable: 503
paging:
  request: "{ cursor?: string, limit?: integer 1..50, default 50 }"
  response: "{ nextCursor: string | null }"
  cursor: base64url("<createdAt ISO>|<uuid>"); opaque to the client; undecodable -> 400 invalid_input
time: every timestamp is an ISO-8601 UTC string; every "now" is the app clock
money: integer paise, never a float; field names end in "Paise"
ids: UUID strings; human numbers (ORD-0001) are display only
client_rules:
  timeout_ms: 10000                          # then the client reports kind "unreachable" (client-only kind)
  retry: GET retried once after a network error; never retry POST/PATCH/DELETE automatically
  on_401: remember the current route, go to sign-in, return after success
  unknown_response_keys: stripped by the client schema (additive changes are safe)
```

## C2 — Auth and session endpoints (U1)

```yaml
openapi: 3.1.0
info: { title: SmartBiz auth (U1), version: "1" }
paths:
  /api/health:
    get:
      security: []
      responses:
        "200": { content: { application/json: { schema: { type: object, required: [status, db], properties: { status: { const: up }, db: { enum: [up, down] } } } } } }
  /api/setup:
    get:
      summary: Whether the one business exists, so the app can show sign-up or sign-in (AC1.2.1)
      security: []
      responses:
        "200": { content: { application/json: { schema: { type: object, required: [businessExists], properties: { businessExists: { type: boolean } } } } } }
  /api/auth/sign-up:
    post:
      security: []
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/SignUpRequest" } } } }
      responses:
        "201": { description: signed in; Set-Cookie session, content: { application/json: { schema: { $ref: "#/components/schemas/Session" } } } }
        "400": { description: invalid_input }
        "409": { description: business_exists }
        "503": { description: db_unavailable }
  /api/auth/sign-in:
    post:
      security: []
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/SignInRequest" } } } }
      responses:
        "200": { description: new session id issued; earlier one ended, content: { application/json: { schema: { $ref: "#/components/schemas/Session" } } } }
        "401": { description: unauthenticated; identical body for wrong password and unknown email }
        "429": { description: rate_limited with retryAfterMinutes }
  /api/auth/sign-out:
    post:
      security: []
      responses:
        "204": { description: idempotent; cookie cleared }
  /api/session:
    get:
      responses:
        "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Session" } } } }
        "401": { description: no, expired or idle session }
components:
  securitySchemes:
    session: { type: apiKey, in: cookie, name: __Host-sb_session }
  schemas:
    SignUpRequest:
      type: object
      additionalProperties: false
      required: [businessName, email, password]
      properties: { businessName: { type: string }, email: { type: string, format: email }, password: { type: string, minLength: 10 } }
    SignInRequest:
      type: object
      additionalProperties: false
      required: [email, password]
      properties: { email: { type: string }, password: { type: string } }
    User:
      type: object
      required: [id, email, role, locale]
      properties: { id: { type: string, format: uuid }, email: { type: string }, role: { enum: [owner, manager, sales_staff, accountant] }, locale: { enum: [bn, en] } }
      description: public User; never carries a password hash
    Session:
      type: object
      required: [user, businessId, capabilities]
      properties:
        user: { $ref: "#/components/schemas/User" }
        businessId: { type: string, format: uuid }
        capabilities: { type: array, items: { type: string } }   # from the role x capability matrix; the client builds its nav from it
security: [ { session: [] } ]
```

## C3 — Order endpoints (U1; amended by U5)

```yaml
openapi: 3.1.0
info: { title: SmartBiz orders (U1), version: "1" }
paths:
  /api/orders:
    get:
      summary: list, newest first (AC2.1a.7)
      parameters:
        - { name: status, in: query, schema: { $ref: "#/components/schemas/OrderStatus" } }
        - { name: customerId, in: query, schema: { type: string } }   # U5: format uuid
        - { name: from, in: query, schema: { type: string, format: date-time } }
        - { name: to, in: query, schema: { type: string, format: date-time } }
        - { name: cursor, in: query, schema: { type: string } }
        - { name: limit, in: query, schema: { type: integer, minimum: 1, maximum: 50 } }
      responses:
        "200": { content: { application/json: { schema: { type: object, required: [orders, nextCursor], properties: { orders: { type: array, items: { $ref: "#/components/schemas/OrderSummary" } }, nextCursor: { type: [string, "null"] } } } } } }
        "400": { description: invalid_input (bad filter or cursor) }
    post:
      summary: create (capability money.mutate.price or full); audit row first
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/CreateOrderRequest" } } } }
      responses: { "201": { content: { application/json: { schema: { $ref: "#/components/schemas/Order" } } } }, "400": {}, "403": {}, "404": { description: "U5: unknown or foreign customer/variant" } }
  /api/orders/{id}:
    parameters: [ { name: id, in: path, required: true, schema: { type: string } } ]   # non-UUID -> 404
    get: { responses: { "200": { content: { application/json: { schema: { $ref: "#/components/schemas/Order" } } } }, "404": {} } }
    patch:
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/UpdateOrderRequest" } } } }
      responses: { "200": {}, "400": {}, "403": {}, "404": {}, "409": { description: not_editable } }
  /api/orders/{id}/status:
    post:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [to], properties: { to: { $ref: "#/components/schemas/OrderStatus" } } } } } }
      responses: { "200": {}, "403": {}, "404": {}, "409": { description: invalid_transition } }
  /api/orders/{id}/consignment:
    post:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [consignmentRef], properties: { consignmentRef: { type: string } } } } } }
      responses: { "201": {}, "400": {}, "404": {}, "409": { description: already_linked or not_editable } }
components:
  schemas:
    OrderStatus: { enum: [new, confirmed, packed, shipped, delivered, settled, cancelled, returned, partial] }
    OrderSource: { enum: [paste-parse, manual, repeat, quick-add, photo, spreadsheet, voice] }
    OrderItemInput:
      type: object
      additionalProperties: false
      required: [variantId, description, quantity, unitPricePaise, lineDiscountPaise]
      properties: { variantId: { type: [string, "null"] }, description: { type: string }, quantity: { type: integer, minimum: 1 }, unitPricePaise: { type: integer, minimum: 0 }, lineDiscountPaise: { type: integer, minimum: 0 } }
    CreateOrderRequest:
      type: object
      additionalProperties: false
      required: [source, customerId, contact, repeatOfOrderId, items, orderDiscountPaise, deliveryChargePaise]
      properties:
        source: { $ref: "#/components/schemas/OrderSource" }
        customerId: { type: [string, "null"] }        # U5: format uuid, must exist in the session's business
        contact: { type: [object, "null"], properties: { name: { type: [string, "null"] }, phone: { type: [string, "null"] }, address: { type: [string, "null"] } } }
        repeatOfOrderId: { type: [string, "null"], format: uuid }
        items: { type: array, minItems: 1, items: { $ref: "#/components/schemas/OrderItemInput" } }
        orderDiscountPaise: { type: integer, minimum: 0 }
        deliveryChargePaise: { type: integer, minimum: 0 }
    UpdateOrderRequest:
      type: object
      additionalProperties: false
      minProperties: 1
      properties: { customerId: {}, contact: {}, items: {}, orderDiscountPaise: {}, deliveryChargePaise: {} }   # same types as CreateOrderRequest
    Order:
      description: the B2 Order entity as JSON, plus `consignment` when linked; never internal-only fields
    OrderSummary:
      type: object
      required: [id, orderNo, status, totalPaise, createdAt, customerName, itemLabels]
      properties:
        customerName: { type: [string, "null"] }      # U1: from contact.name; U5: from the catalog via C8
        itemLabels: { type: array, items: { type: string } }   # U1: item descriptions; U5: product name + variant values
```

## C4 — Audit trail read (U2)

```yaml
openapi: 3.1.0
info: { title: SmartBiz audit (U2), version: "1" }
paths:
  /api/audit:
    get:
      summary: retention-filtered, newest first; capability audit.view (Owner, Manager, Accountant per stories US5.1)
      parameters: [ { name: cursor, in: query, schema: { type: string } }, { name: limit, in: query, schema: { type: integer, maximum: 50 } } ]
      responses:
        "200": { description: "{ entries: AuditEntry[] (no payload PII by construction), nextCursor }" }
        "403": {}
```

## C5 — Role-table test data and `link` allow-list (U2)

```yaml
# shared-schema: tests/spec/role-table.ts (written out inline, never imported from src/auth)
rows:
  - { method: GET,  path: /api/orders,            allowed: [owner, manager, sales_staff, accountant] }
  - { method: POST, path: /api/orders,            allowed: [owner, manager, sales_staff] }
  # ... one row per route in the server route table; U3 and U4 append their rows in the same file
public_routes: [GET /api/health, GET /api/setup, POST /api/auth/sign-up, POST /api/auth/sign-in,
                POST /api/auth/sign-out, POST /api/invitations/accept, POST /api/auth/recover, POST /api/auth/reset]
link_allow_list:                 # the only responses that may carry a raw token, in field "link"
  - POST /api/staff/invitations  # U3
  - POST /api/staff/{userId}/reset-links   # U3
rule: the walk fails if a route exists in the route table but not in rows/public_routes, or the reverse
```

## C6 — Staff, invitation and recovery endpoints (U3)

```yaml
openapi: 3.1.0
info: { title: SmartBiz staff (U3), version: "1" }
paths:
  /api/staff:
    get:
      summary: members and pending invitations; capability staff.invite
      responses: { "200": { description: "{ members: [{id, email, role, active}], invitations: [{id, email, role, expiresAt}] }" }, "403": {} }
  /api/staff/invitations:
    post:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [email, role], properties: { email: { type: string, format: email }, role: { enum: [manager, sales_staff, accountant] } } } } } }
      responses:
        "201": { description: "{ invitation: {id, email, role, expiresAt}, link: string }  — link returned once; 7 days" }
        "403": { description: "includes a role the caller may not invite (delegation matrix: U3 Functional Design)" }
        "409": { description: conflict (email already a member) }
  /api/invitations/accept:
    post:
      security: []
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [token, password], properties: { token: { type: string }, password: { type: string, minLength: 10 } } } } } }
      responses: { "201": { description: signed in (Session, Set-Cookie) }, "410": { description: gone } }
  /api/staff/{userId}/reset-links:
    post:
      responses:
        "201": { description: "{ link: string, expiresAt }  — returned once; 30 minutes" }
        "403": { description: "Manager -> Owner, or other delegation-matrix refusals" }
        "404": {}
  /api/auth/recover:
    post:
      security: []
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [email], properties: { email: { type: string } } } } } }
      responses: { "202": { description: identical empty body for any email; nothing is sent; no link } }
  /api/auth/reset:
    post:
      security: []
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [token, password], properties: { token: { type: string }, password: { type: string, minLength: 10 } } } } } }
      responses: { "204": { description: password set; every session of the user ended }, "410": { description: gone } }
x-terminal-command:
  run: "bun run reset-password <email>"
  output: one line on stdout with the reset link (30 minutes); exit 0; unknown email -> exit 1 with a message, no link
  note: runs on this machine only, with DATABASE_URL from .env
link_format: "http://127.0.0.1:${PORT}/#/accept-invite?t=<token>  |  /#/reset?t=<token>"   # client reads t, then history.replaceState to drop it before any request
token_outcomes: "an unknown, used or expired token all return 410 with the identical body {error: gone}, so a guess cannot learn whether a token exists"
link_carve_out: >
  FR2.8, NFR3 and team.md's no-secret test forbid tokens in responses. The two `link` responses above are
  the only, recorded exception (user-stories Q8): the raw token is returned once to the Owner or Manager who
  created it, stored only as a hash, never logged. The logger deny-list adds the keys `link` and `t`.
```

## C7 — Catalog endpoints (U4)

```yaml
openapi: 3.1.0
info: { title: SmartBiz catalog (U4), version: "1" }
paths:
  /api/customers:
    get:
      parameters: [ { name: q, in: query, schema: { type: string } }, { name: cursor, in: query, schema: { type: string } }, { name: limit, in: query, schema: { type: integer, maximum: 50 } } ]
      description: q matches name; digits-only q of 4+ digits also matches phone (AC3.3.1)
      responses: { "200": { description: "{ customers: Customer[], nextCursor }" } }
    post:
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/CustomerWrite" } } } }
      responses: { "201": { description: "{ customer, duplicatePhoneOf: uuid | null }  (warning, not refusal)" }, "400": {}, "403": {} }
  /api/customers/{id}:
    get: { responses: { "200": { description: "Customer with notes (newest first)" }, "404": {} } }
    patch:
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/CustomerWrite" } } } }
      responses: { "200": {}, "400": {}, "403": {}, "404": {} }
  /api/customers/{id}/notes:
    post:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [text], properties: { text: { type: string, minLength: 1 }, revisesNoteId: { type: [string, "null"], format: uuid } } } } } }
      responses: { "201": {}, "404": {} }
  /api/products:
    get: { responses: { "200": { description: "{ products: ProductSummary[], nextCursor }; cost omitted unless caller holds money.mutate.full or money.mutate.cost (functional design R-04 may widen)" } } }
    post:
      requestBody: { content: { application/json: { schema: { $ref: "#/components/schemas/ProductCreate" } } } }
      responses: { "201": {}, "400": {}, "403": {}, "409": { description: conflict (SKU, case-insensitive) } }
  /api/products/{id}:
    get: { responses: { "200": { description: Product with variants and default supplier }, "404": {} } }
    patch:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, properties: { name: { type: string }, sellingPricePaise: { type: integer, minimum: 0 }, defaultSupplierId: { type: [string, "null"], format: uuid } } } } } }
      responses: { "200": {}, "403": {}, "404": {} }
  /api/products/{id}/cost:
    patch:
      summary: capability money.mutate.cost or money.mutate.full (Accountant, Manager, Owner)
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [purchaseCostPaise], properties: { purchaseCostPaise: { type: integer, minimum: 0 } } } } } }
      responses: { "200": {}, "403": {}, "404": {} }
  /api/variants/{id}/stock:
    patch:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, properties: { stock: { type: integer, minimum: 0 }, minimumStock: { type: integer, minimum: 0 } }, minProperties: 1 } } } }
      responses: { "200": {}, "403": {}, "404": {} }
  /api/low-stock:
    get: { responses: { "200": { description: "{ variants: [{variantId, productId, productName, axisValues, stock, minimumStock, supplier: {id, name, phone} | null}] }" } } }
  /api/suppliers:
    get: { responses: { "200": { description: "{ suppliers: Supplier[] }" } } }
    post:
      requestBody: { content: { application/json: { schema: { type: object, additionalProperties: false, required: [name, phone], properties: { name: { type: string }, phone: { type: string } } } } } }
      responses: { "201": {}, "400": {}, "403": {} }
  /api/suppliers/{id}:
    patch: { responses: { "200": {}, "400": {}, "403": {}, "404": {} } }
components:
  schemas:
    CustomerWrite:
      type: object
      additionalProperties: false
      required: [name, phone]
      properties: { name: { type: string }, phone: { type: string, description: "normalised server-side to 01XXXXXXXXX" }, address: { type: [string, "null"] }, riskLevel: { type: integer, minimum: 0, maximum: 3 } }
    ProductCreate:
      type: object
      additionalProperties: false
      required: [name, sku, sellingPricePaise, axes, variants]
      properties:
        name: { type: string }
        sku: { type: string }
        sellingPricePaise: { type: integer, minimum: 0 }
        purchaseCostPaise: { type: integer, minimum: 0 }
        defaultSupplierId: { type: [string, "null"], format: uuid }
        axes: { type: array, maxItems: 2, items: { type: object, required: [name, values], properties: { name: { type: string }, values: { type: array, minItems: 1, items: { type: string } } } } }
        variants: { type: array, items: { type: object, required: [axisValues, stock, minimumStock], properties: { axisValues: { type: array, items: { type: string } }, stock: { type: integer, minimum: 0 }, minimumStock: { type: integer, minimum: 0 } } } }
        # server checks variants == the full cross product of axes
```

## C8 — Catalog read functions for orders (U4 → U5, in process)

```yaml
# shared-schema: src/catalog/index.ts exports used by src/orders/ (TypeScript; Queryable is the open transaction)
getCustomer:  "(sql: Queryable, ctx: { businessId: Uuid }, id: Uuid) => Promise<Result<CustomerRef, NotFound>>"
getVariant:   "(sql: Queryable, ctx: { businessId: Uuid }, id: Uuid) => Promise<Result<VariantRef, NotFound>>"
customerNames: "(sql: Queryable, ctx: { businessId: Uuid }, ids: readonly Uuid[]) => Promise<ReadonlyMap<Uuid, string>>"   # at most 50 ids; one ANY(uuid[]) query
variantLabels: "(sql: Queryable, ctx: { businessId: Uuid }, ids: readonly Uuid[]) => Promise<ReadonlyMap<Uuid, string>>"   # "product name · value · value"
CustomerRef: { id: Uuid, name: string, phone: string }
VariantRef:  { id: Uuid, productId: Uuid, label: string, sellingPricePaise: integer }
rules:
  - a missing id and an id from another business both return NotFound (no existence leak)
  - called inside the order write's transaction; no writes; no audit rows
  - infrastructure errors are thrown, never returned
  - the B2 stubs in src/orders/customer.ts and src/orders/variant.ts are deleted when U5 switches over
```

## C9 — Migrations and grants (every Unit)

```yaml
# shared-schema: src/db/migrations + the declared grant set
numbering: "NNNN_verb_noun.sql, continuing from 0010; each Unit takes the next numbers when it merges"
header: "each migration opens with a comment naming its owning component and Unit"
grants: "only exact GRANTs to app_role; never GRANT ALL; never REVOKE-and-regrant"
declared_set:                     # the realdb gate compares pg_catalog with this, exactly
  users: [SELECT, INSERT, UPDATE]
  businesses: [SELECT, INSERT, UPDATE]
  sessions: [SELECT, INSERT, UPDATE, DELETE]
  invitations: [SELECT, INSERT, UPDATE]
  password_resets: [SELECT, INSERT, UPDATE]
  audit_log: [SELECT, INSERT]
  orders: [SELECT, INSERT, UPDATE]
  order_items: [SELECT, INSERT]                # U1 FD amendment A3: DELETE revoked, lines append by revision
  consignment_link: [SELECT, INSERT]
  customers: [SELECT, INSERT, UPDATE]          # U4
  customer_notes: [SELECT, INSERT]             # U4
  products: [SELECT, INSERT, UPDATE]           # U4
  variants: [SELECT, INSERT, UPDATE]           # U4
  suppliers: [SELECT, INSERT, UPDATE]          # U4
```

## Amendments from U1 Functional Design (2026-10-27)

Recorded on the Owner's standing instruction; source `construction/u1-skeleton/functional-design/` (questions Q1–Q3, Q6; review iteration 1, R-04).

| # | Contract | Change |
|---|----------|--------|
| A1 | C1 cookie | `Max-Age` = seconds left to the 30-day cap, instead of a browser-session cookie |
| A2 | C1 status table | auth kinds go on the wire unchanged: `invalid_email`, `password_too_short` 400; `invalid_credentials` 401; `email_taken` 409; `rate_limited` 429 also sends `Retry-After` |
| A3 | C9 grants | `order_items` is SELECT, INSERT only; order edits append a new line revision |
| A4 | C3 list | a non-UUID `customerId` filter returns an empty page until U5 (as contract review R-08 decided) |

## Contract ownership rules

1. The Unit that ships an endpoint owns its path, its request and response zod schemas (in the feature's `schemas.ts`), and its rows in C5. C1 is owned by U1; any change to it is a change to every Unit and needs a decision record.
2. Server and client import the same schema. A test parses a recorded success and error response of every route with the client schema, so drift fails the build.
3. Additive changes (new endpoint, new optional response field) are safe; the client strips unknown keys. Breaking changes (rename, remove, retype, new required request field, new error kind) change server, client and C1's table in one commit.
4. No versioned URLs while server and client ship in one build from one `main` commit (Q4).
5. C8 is owned by U4; U5 may not query catalog tables directly. Adding a field to `CustomerRef` or `VariantRef` is additive; removing one is breaking.
6. C9's declared set is the source of truth for the realdb grant gate; a Unit that adds a table adds its row in the same commit.

## Review follow-ups (architecture review, iteration 1, READY)

| Finding | Decision (Owner's standing instruction) | Owner |
|---------|------------------------------------------|-------|
| R-01 C9's set does not match the migrations (0001–0005 grant nothing; 0009 grants `order_items` SELECT, INSERT, DELETE, not UPDATE) | U1 Functional Design writes the grants migration for the auth tables and corrects C9 to the real `order_items` grants; the DELETE question below is settled there, before U1 Code Generation | U1 |
| R-02 auth domain kinds (`invalid_credentials`, `email_taken`, `invalid_token`, `expired_token`, `already_used`, …) have no wire mapping | U1 and U3 Functional Design map each domain kind to one C1 kind (for example `invalid_credentials` → `unauthenticated`; `invalid_token`/`expired_token`/`already_used` → `gone`; `email_taken` → `conflict`, never returned for a DB error); the server mapping is a total `switch`, so an unmapped kind fails the type-check | U1, U3 |
| R-03 catalog writes and staff reset links name no capability | U4 and U3 Functional Design name the capability for every route (reusing `business.view`, `money.mutate.*`, `staff.invite` where they fit) and add C5 rows before U2's role table is final | U4, U3 |
| R-04 `link` versus no-secret rules | Fixed in C6 (`link_carve_out`) | — |
| R-05 `X-Frame-Options` missing | Fixed in C1 | — |
| R-06 cookie value and `maxAge` differ from `session.ts` | U1 Functional Design aligns `session.ts` with C1 (random 32-byte value, hash stored); the session-cookie lifetime choice is recorded there | U1 |
| R-07 unknown token outcome | Fixed in C6 (`token_outcomes`) | — |
| R-08 Origin rule, unbounded lists, non-UUID `customerId` filter | Origin fixed in C1. `/api/staff`, `/api/suppliers` and `/api/low-stock` return at most 200 rows in this intent and say `truncated: true` beyond that; U1 answers a non-UUID `customerId` filter with an empty page until U5 | U1, U3, U4 |
| R-09 questions answered by the code | C4 closed below; the `order_items` question stays open (migration 0009 grants DELETE, team.md forbids it — a conflict, not an answer) | — |

## Open questions

| Contract | Question | Blocks |
|----------|----------|--------|
| C9 | Does `order_items` keep DELETE (B2 migration 0009), or does an order edit replace items another way? (domain-design R-06, requirements R-01) | U1 |
| C6 | Delegation matrix: may a Manager invite or reset another Manager? (user-stories R-05) | U3 |
| C7 | ~~Do Sales Staff see purchase cost on product reads?~~ Closed by U4 Functional Design (D4): no; the key is absent for them | — |
| C4 | ~~Does the Manager keep `audit.view`?~~ Closed: `capability.ts` grants it and the approved role table (US5.1) keeps it | — |
| C1 | Body size limit of 64 KiB: enough for the largest paste-parse order? Confirmed in NFR Requirements | U1 |

## Amendments from U3 Functional Design (2026-10-28)

Recorded on the Owner's standing instruction; source `construction/u3-staff/functional-design/functional-spec.md` § Review follow-ups (F-05).

| # | Contract | Change |
|---|----------|--------|
| B1 | C6 accept, reset | may answer 429 `rate_limited` when the password-hashing gate is full; the token stays unused |
| B2 | C6 `GET /api/staff` | members gain `canReset`; the body gains `invitableRoles` and `truncated` |
| B3 | C6 reset-links | 409 `conflict` for an inactive target |
| B4 | C6 accept | 201 body is the public user `{id, email, role, locale}` with `Set-Cookie` |
| B5 | C6 accept, reset, invitations | a short password is 400 `password_too_short`; a bad invite email is 400 `invalid_email` (auth kinds pass through, as A2) |

## Amendments from U4 Functional Design (2026-10-29)

Recorded on the Owner's standing instruction; source `construction/u4-catalog/functional-design/functional-spec.md` § 5 (with § 3a for the response bodies).

| # | Contract | Change |
|---|----------|--------|
| D1 | C7 capabilities | reads `business.view`; customers and notes any of `money.mutate.price`, `money.mutate.full`; products, stock, suppliers `money.mutate.full`; cost any of `money.mutate.cost`, `money.mutate.full` |
| D2 | C7 `CustomerWrite` | create gains optional `note`; `address` ≤ 300; `riskLevel` default 0 on create only |
| D3 | C7 create/edit customer | `duplicatePhoneOf` is `{id, name} \| null` |
| D4 | C7 product reads | `purchaseCostPaise` (integer or null) only for cost readers; absent for Sales Staff |
| D5 | C7 product create/edit | optional `category` (≤ 60); edit takes `name`, `category`, `sellingPricePaise`, `defaultSupplierId`, at least one |
| D6 | C7 `ProductSummary` | `{id, name, sku, category, sellingPricePaise, purchaseCostPaise?, variantCount, totalStock, lowCount, defaultSupplier: {id, name} \| null}`; `q` matches name or SKU |
| D7 | C7 suppliers, low stock | both add `truncated`; suppliers carry `productCount` |
| D8 | C7 notes | `revisesNoteId` already revised → 409 `conflict` |
| D9 | C9 | migrations 0018 suppliers, 0019 customers, 0020 customer_notes, 0021 products, 0022 variants |
| D10 | C7 edit customer | partial: omitted fields unchanged, `address: null` clears; a no-op edit is 200 with no audit row |
| D11 | C7 lists | customers and products lists add `total`; customer detail adds `notesTruncated` (newest 200 notes) |
| D12 | C7 product create | ≤ 12 values per axis, no `-` in a value, ≤ 144 variants |
| D13 | C7 ids | a non-UUID path or body id answers 404 |
| — | C8 | signatures unchanged; `NotFound` moves to `src/data/not-found.ts`; callers dedupe and chunk ids by 50 (U5) |

## Amendments from U5 Functional Design (2026-10-29)

Recorded on the Owner's standing instruction; source `construction/u5-orders-catalog/functional-design/functional-spec.md` § 5.

| # | Contract | Change |
|---|----------|--------|
| E1 | C3 create/edit | `customerId` and `variantId` are UUIDs of the session's business; otherwise 404 `not_found` |
| E2 | C3 `OrderSummary` | `customerName` from the catalog when linked, else the contact name; `itemLabels` from the variant label when linked, else the description |
| E3 | C7 | new read `GET /api/catalog/match-index` (`business.view`) → `{ products: [{productId, name, sku, axisNames, variants: [{variantId, axisValues}]}], truncated }`, at most 2 000 variants, whole products, ordered by name then id |
| E5 | C3 order detail | `GET /api/orders/:id` adds `customerName` and per-item `label` (additive) |
| E4 | C9 | migration `0023_link_orders_to_catalog.sql`: `UNIQUE (business_id, id)` on variants; `orders.customer_id` and `order_items.variant_id` become uuid with composite foreign keys; grants unchanged |
| — | C8 | unchanged; orders call it and chunk ids by 50 |

