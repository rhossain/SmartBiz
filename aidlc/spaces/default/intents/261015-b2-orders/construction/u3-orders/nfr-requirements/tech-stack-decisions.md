# Tech Stack Decisions — U3-orders (B2)

> Brownfield run (SmartBiz BD). Per-Unit tech stack
> for U3-orders. The Q5 answer in
> `nfr-requirements-questions.md` binds this file:
> inherit U1's tech stack unchanged. No new tech-stack
> decision in B2. U3 uses the same runtime, build
> tools, ORM, validation, i18n, and presentation
> primitives as U1.

## Sources

- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [u1-tech-stack] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — U1 tech stack
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q5=A
- [team-rules] `aidlc/spaces/default/memory/team.md` — free-tier envelope, TypeScript strict
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md`

## Inheritance posture (Q5=A)

U3 inherits the U1 tech stack unchanged. The U3 unit
is the first Bolt that introduces a meaningful
data-shape boundary (`Order` + `OrderItem` +
`OrderStatus`), but the data plane reuses the same
runtime, build tools, ORM, validation, i18n, and
presentation primitives as U1. No new tech-stack
decision in B2.

The inheritance is one-line per category:

| Category | U3 decision | U1 binding | Notes |
|---|---|---|---|
| Language | TypeScript strict (NFR7.1) | U1 | inherited unchanged; the five strict flags + the two index/init flags |
| Runtime | bun 1.4.3 | U1 | inherited unchanged; the Vite dev server, the test runner, the script runner |
| Bundler | Vite 5.x (NFR7.7) | U1 | inherited unchanged; single bundle, modern ES, no code-split |
| Build shell | single top-level `package.json` (NFR7.3) | U1 | inherited unchanged; the prototype's test-only `package.json` is resolved at first PR |
| ORM / DB driver | postgres.js 3.x (B1 binding) | U1 | inherited unchanged; typed queries, no ORM (raw SQL + typed mappers) |
| Validation | Zod 3.x (B1 binding) | U1 | inherited unchanged; the typed `Order` / `OrderItem` / `ParseResult` shapes are Zod schemas |
| UI framework | React 18.x (B1 binding) | U1 | inherited unchanged; the Shell / Screen / Field / Pill primitives |
| i18n | I18nComponent (B1 binding) | U1 | inherited unchanged; `L(bn, en)`, `bnDigits`, Intl formatters |
| State container | typed closure (NFR7.5) | U1 | inherited unchanged; `get` / `set` / `subscribe` |
| Routing | hash router (B1 binding) | U1 | inherited unchanged; the three-layer gate (auth → capability → business-rule) |
| Money math | MoneyEngine (U1 sub-module) | U1 | inherited unchanged; paise-integer; no float drift |
| Password hashing | argon2id (m=64MB, t=3, p=1) | U1 | inherited unchanged (NFR5.2) |
| Invitation token | sha256 | U1 | inherited unchanged (NFR5.3) |
| Free-tier envelope | free-tier managed PostgreSQL + free-tier email gateway | U1 | inherited unchanged (NFR5.1) |
| Browser font | Noto Sans Bengali + Hind Siliguri (woff2 subsets) | U1 | inherited unchanged (NFR11.1) |
| No-code generation tools | (no new tools in B2) | U1 | U3 writes the typed `Order` / `OrderItem` / `OrderStatus` shapes by hand; no scaffolder |

## U3-specific typed contracts (no new tech, just new types)

The U3 unit introduces the following typed contracts.
These are not new tech-stack decisions; they are
typed shapes that use the existing tooling:

| Typed contract | Shape | Where used |
|---|---|---|
| `Order` | `{ id, customerId, source, status, items, totalPaise, perOrderDiscountPaise, deliveryChargePaise, createdAt, updatedAt, businessId }` | every U3 surface (orders list, order detail, paste-parse, manual, quick-add, repeat) |
| `OrderItem` | `{ productId, variantId, quantity, unitPricePaise, perLineDiscountPaise }` | every `Order` row |
| `OrderStatus` | discriminated string-literal union: `'new' \| 'confirmed' \| 'packed' \| 'shipped' \| 'delivered' \| 'settled' \| 'cancelled' \| 'returned' \| 'partial'` (FR5.3) | every status transition; the exhaustive `switch` has a `never`-asserted default |
| `ParseResult` | `{ ok: true, items: OrderItem[] } \| { ok: false, reason: 'empty' \| 'malformed' \| 'too_large' \| 'deferred' }` | the `parseMessage` return type; never throws |
| `OrderSource` | discriminated string-literal union: `'paste-parse' \| 'manual' \| 'quick-add' \| 'repeat' \| 'photo' \| 'spreadsheet' \| 'voice'` (FR5.5) | every `Order` row's `source` discriminator |
| `OrderAuditAction` | discriminated string-literal union: `'order.create' \| 'order.update' \| 'order.status_transition' \| 'order.cancel' \| 'order.return'` (FR12.3) | every order-mutating action's audit row |

## Deferred input mode placeholders (no new tech in B2)

The 3 deferred input modes (US1.14, US1.15, US1.16)
ride as typed placeholders. The placeholders use the
existing tooling (TypeScript strict, Zod, React 18.x)
and fail with `reason: 'deferred'` when invoked. The
OCR / parser / STT vendor is selected in a later
Bolt; the placeholder body lands when the vendor is
chosen.

| Placeholder | Typed shape | Deferred body | Future Bolt |
|---|---|---|---|
| `photoOrder` | `{ id, businessId, imageUrl, status: 'deferred' }` | OCR vendor (Tesseract.js / cloud OCR) | B3 or later |
| `spreadsheetOrder` | `{ id, businessId, fileUrl, status: 'deferred' }` | Spreadsheet parser (xlsx / csv) | B3 or later |
| `voiceOrder` | `{ id, businessId, audioUrl, status: 'deferred' }` | STT vendor (Web Speech API / cloud STT) | B3 or later |

## CI gates (tech stack enforcement)

The tech-stack decisions are enforced by the same
gates as U1:

| Gate | Bound to | Test | Failure mode |
|---|---|---|---|
| TS-strict | NFR7.1 | `bun run type-check` | fails the PR if any TS strict flag is relaxed |
| Lint | CS-1 | `bun run lint` | fails the PR if any ESLint rule is violated |
| Format | CS-1 | `bun run format` | fails the PR if any file is not Prettier-clean |
| Build | NFR7.7 | `bun run build` | fails the PR if `vite build` fails |
| Bundle size | NFR2.b | `gzip -c dist/assets/*.js` ≤ 350 KB | fails the PR if bundle > 400 KB gzip |

## Inapplicable decisions

| Sub-category | Position | Rationale |
|---|---|---|
| New ORM | N/A | U1 uses raw SQL + typed mappers; U3 inherits this. No new ORM in B2. |
| New bundler | N/A | U1 uses Vite 5.x; U3 inherits this. No new bundler in B2. |
| New UI framework | N/A | U1 uses React 18.x; U3 inherits this. No new UI framework in B2. |
| New state container | N/A | U1 uses a typed closure (`get` / `set` / `subscribe`); U3 inherits this. |
| New routing | N/A | U1 uses a hash router with the three-layer gate; U3 inherits this. |
| New money math | N/A | U1's MoneyEngine handles all money math; U3 inherits this. |
| New i18n | N/A | U1's I18nComponent handles all i18n; U3 inherits this. |
| New validation | N/A | U1 uses Zod 3.x; U3 inherits this. |
| New test framework | N/A | U1 uses bun test; U3 inherits this. |
| New DB driver | N/A | U1 uses postgres.js 3.x; U3 inherits this. |

## Open questions

None. The tech-stack decisions are inherited unchanged
from U1 (Q5=A).

## Per-decision coverage table

| Inception decision | U3 status | U3 binding | Notes |
|---|---|---|---|
| TypeScript strict | OK (inherited from U1) | NFR7.1 | the five strict flags + the two index/init flags |
| Vite | OK (inherited from U1) | NFR7.7 | single bundle, modern ES |
| bun | OK (inherited from U1) | (project pin) | runtime + test runner + script runner |
| React 18.x | OK (inherited from U1) | (U1 binding) | Shell / Screen / Field / Pill primitives |
| Zod 3.x | OK (inherited from U1) | (U1 binding) | typed `Order` / `OrderItem` / `ParseResult` shapes |
| postgres.js 3.x | OK (inherited from U1) | (U1 binding) | raw SQL + typed mappers |
| I18nComponent | OK (inherited from U1) | NFR11.x | `L(bn, en)`, `bnDigits`, Intl formatters |
| MoneyEngine | OK (inherited from U1) | ADR-002 | paise-integer; no float drift |
| Hash router | OK (inherited from U1) | (U1 binding) | three-layer gate |
| Free-tier envelope | OK (inherited from U1) | NFR5.1 | free-tier managed PostgreSQL + free-tier email gateway |

## Sources

- [tech-stack] `aidlc/spaces/default/codekb/SmartBiz/technology-stack.md` — prototype stack
- [u1-tech-stack] `aidlc/spaces/default/intents/261004-mvp/construction/U1-foundation/nfr-requirements/tech-stack-decisions.md` — U1 tech stack
- [unit-of-work] `aidlc/spaces/default/intents/261004-mvp/inception/units-generation/unit-of-work.md` — U3 card
- [questions] `aidlc/spaces/default/intents/261015-b2-orders/construction/u3-orders/nfr-requirements/nfr-requirements-questions.md` — Q5=A
- [nfr-requirements-stage] `.claude/aidlc-common/stages/construction/nfr-requirements.md` — Step 5
