# NFR Design — Questions (u4-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Inputs: U4's NFR requirements (NFR1.13–NFR10.4) and their review
> follow-ups R-01..R-06, U4's functional design, contracts C1, C7, C8, C9, and the shipped code
> (`orders_business_customer_idx` in migration 0008, `src/db/retry.ts`, `scripts/mutants.ts`,
> `tests/perf/order-api.bench.ts`). Pattern ids continue U3's (P18+, S26+, SC7+, R15+, O8+).

## Q1. How product create writes 144 variants (R-04)

A. One multi-row `INSERT … SELECT FROM unnest($axisValues::jsonb …)` for all variants of a product, inside the
product's transaction, after the change-log row and the product row: three statements regardless of
variant count. The budget statistic becomes p95 of 20 calls after 5 warm-up
B. One INSERT per variant
X. Other (please specify)

[Answer]: A. Constant round trips keep the 144-variant case near the 12-variant case.

## Q2. Who can read cost in the audit trail (R-01)

A. Cost appears in `product.create` and `product.cost.set` payloads. `/api/audit` needs `audit.view`, held by
Owner, Manager and Accountant — exactly the cost readers — so no extra stripping is needed. A role-table
test fixes that equivalence: if a future change gives `audit.view` to a role without a cost capability, the
test fails. Low-stock rows and supplier rows never carry cost
B. Strip cost from audit payloads
X. Other (please specify)

[Answer]: A. The two sets are the same today; pinning the equality with a test is cheaper and safer than a
filter that could drift.

## Q3. A double-submitted customer create (R-06)

A. The screen's submit guard (`use-submit-guard.ts`, already used by orders) disables the button while saving,
so one click is one request. The server does not dedupe: two creates make two customers, and the second gets
`duplicatePhoneOf` pointing at the first, so the person sees the warning at once
B. Server-side idempotency keys
X. Other (please specify)

[Answer]: A. The duplicate-phone warning already turns the rare double create into something visible.

## Q4. Search query size (R-05)

A. `q` is at most 100 characters (zod), `%`, `_` and `\` are escaped before `ILIKE … ESCAPE '\'`, and all
stored text is rendered by React as text (never `dangerouslySetInnerHTML`), with a test that a note holding
`<img onerror>` renders as literal characters
B. No cap
X. Other (please specify)

[Answer]: A. Closes the cheap long-query scan and the wildcard trick.
