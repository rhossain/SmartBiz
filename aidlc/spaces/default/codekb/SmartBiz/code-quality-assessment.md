# SmartBiz BD — Code Quality Assessment

## What this artifact is

A Standard-depth qualitative read of the prototype's code quality, focused on the things the architect (link 2) must carry forward to the production system. The intent is to flag **the tech debt that matters** and **the design discipline that must be preserved** — not to score the prototype as a finished product (it is not one) and not to recommend rewrites for their own sake.

Cross-references: `architecture.md` for the layer / pattern table; `component-inventory.md` for the file/responsibility table; `dependencies.md` for the runtime/test graph; `api-documentation.md` for the `App` namespace.

---

## 1. Test coverage

The test suite is the prototype's most distinctive quality asset.

**Eight bespoke Node CJS harnesses**, each with a different blind spot. From `tests/README.md` line 8: *"Eight harnesses, kept separate because **each one is blind to what the others catch**. That is the whole design; collapsing them into one runner would lose the property."*

| Harness | Lines | What it asserts | What it is blind to |
|---|---|---|---|
| `tests/boot.js` | 76 | Bootstrap; **click delegation is wired exactly once** (voice-toggle probe) | — |
| `tests/smoke.js` | 113 | No runtime errors across every route × device × AI × language × Role; every click from a freshly rendered state. ~16 000 render combinations + thousands of clicks. | Anything that renders without throwing — a wrong figure, a leaked figure, a Latin digit |
| `tests/auth-zero.js` | 110 | Signin / register / recovery / reset / replaced / setup / empty-dashboard / invitation states; negative-asserts OTP, forced setup wizard steps, legacy `staff`/`packer` Role keys | Anything outside the auth surface |
| `tests/truth.js` | 326 | Six sections: `econ()` internal-exactness; dashboard headlines = sum of rows; gated Roles reach no money figure on any route; Bangla view prints Bangla digits; assistant answers declare a legal Recognition Basis + sane completeness; settlement panel follows disposition. **Restates the spec inline** rather than importing from `data.js`. | Layout, async states, anything about how a screen looks |
| `tests/flows.js` | 307 | Multi-step behaviour: assistant route→answer/refuse/gated, voice dictation, three-level variant matrix, quick-add grid, paste-flow variant picker, parsed-item-scope, completeness-sheet | Anything not scripted as a flow; every figure it does not itself total |
| `tests/classes.js` | 122 | Every class that lands in the DOM has a CSS rule; every `is-/has-` modifier is joined to a base class in a selector. (The `.lang-card.is-on`-vs-bare-token blind spot was the reason this exists.) | Async states, which never render in a synchronous pass |
| `tests/contrast.js` | 226 | WCAG luminance ratios computed off `tokens.css` (not against runtime — "a caption at 2.9:1 looks *quiet* rather than broken"). Asserts text-AA, large-text-3.0, ink-toned AA, control-border 3.0. Also checks `DESIGN.md` parity. | Colour applied at runtime — reads the source, so inline styles / JS values are invisible |
| `tests/story-coverage.js` | 52 | 76 stories in `epics.md` ↔ 76 designs in `SMARTBIZ_SCREEN_MAP` ↔ 76 addressable frames each carrying title/surface/state/proofs/primary action | Visual composition and browser layout |
| `tests/shot.js` | 193 | Real-Chrome screenshots via CDP for states jsdom cannot reproduce (real type rendering, layout, specificity, overflow) | Arithmetic — "never read a number off a screenshot" |
| `tests/measure.js` | 110 | Real-box geometry + computed padding via CDP | Meaning |

**Two load-bearing rules** the README documents and the harnesses honour:

1. *"Never dispatch `DOMContentLoaded` yourself."* `app.js` defers `boot()` to that event and jsdom fires its own. Dispatching it means two boots, the click delegation attaches twice, and every toggle silently becomes a no-op — a whole passing run that proves nothing. `boot.js` instead yields until `readyState` leaves `loading`, then asserts the delegation is wired exactly once and aborts if it is not.
2. *"Never read a number off a screenshot."* Bangla digits have been misread three times. Arithmetic is checked in a jsdom boot or not at all — `truth.js` is where it is checked. Contrast is the same kind of claim and gets the same treatment: `contrast.js` computes the ratios rather than trusting an eye.

**Two `truth.js` rules** for the same reason:

- *"It restates the specification rather than importing it."* The recognition rule and the profit formula are written out in the test. A test that reads the same map the product reads cannot notice the map changing, so flipping `EARNED` or dropping a component from `profit` has to fail here — and only an independent statement of the answer makes that possible.
- *"Gating is asserted by absence, over every route."* Not by the presence of a lock on the one route someone remembered. The leak this harness was written for lived on a Role-adaptive screen that carried no `money` flag, so no per-screen check could have seen it. It also asserts the inverse — that the Owner still reaches the audit trail and the daily card — because a gate that hides a surface from everyone passes an absence test and fails the product.

**Mutation discipline** (README line 33): *"A passing test that cannot fail is worth nothing; mutate it before trusting it."* Every assertion in `truth.js` has been checked by mutation: each defect it was written for was reintroduced one at a time, and each was caught. Two early versions of `truth.js` were not — a self-consistent `1 of 1` completeness claim and a flipped `returnLoss` both passed — which is how those two assertions came to exist. **This is unusual and worth preserving at the architect stage.**

**Coverage tooling:** none. No `nyc`, no `c8`, no Istanbul. The harnesses assert structural and arithmetic properties rather than statement coverage. This is a deliberate trade-off — the prototype's bugs are wrong figures, wrong Role gates, and wrong numerals, not untested branches — but the architect should add a coverage tool to the production CI to catch the third class.

**The single largest coverage gap:** the paste-parser's segment-isolation rule (`screens-orders.js` line 206–210) is asserted once, in `flows.js` "parsed details come from the item they belong to." The parser itself (`parseMessage`, line 141–262) is the most regression-prone code path in the prototype — see Tech Debt Signal #5 below.

---

## 2. Linting

**None.** No ESLint / JSHint / Prettier / EditorConfig anywhere in the prototype. [dev-scan §"Code Quality Indicators"] The architect should adopt ESLint + Prettier at the first production PR, with rules calibrated to preserve the ES5-with-one-ES2015+-file pattern OR to migrate everything to one consistent level (recommended).

---

## 3. CI/CD

**None in the prototype.** No GitHub Actions, no `.gitlab-ci.yml`, no Jenkinsfile, no CircleCI config. The `prototype/tests/` harnesses are local-only and not wired to any CI pipeline. [dev-scan §"Code Quality Indicators"] The architect should wire `npm test` (extended with the production architecture) into a CI pipeline that runs on every PR. The hard-coded macOS Chrome path in `shot.js` / `measure.js` must be parameterised (env var or `chrome-launcher`) before any cross-platform CI can run the CDP harnesses — see Tech Debt Signal #7.

---

## 4. Documentation quality

This is a **bright spot** in the prototype and worth emulating.

### 4.1 High-signal `tests/README.md`

35 lines that earn their place. Documents the harness rationale, the mutual-blindness table, the two load-bearing rules, and the mutation discipline. Reading this file once is enough to understand why the suite is shaped the way it is.

### 4.2 Every module carries a leading block comment

Examples, from the developer scan:

- `data.js` line 1–4: *"one coherent business, one frozen day. Every figure … is computed from this object, never hard-coded"*
- `screens-orders.js` line 1–3: *"the paste parser here is real, not staged: it anchors on an 11-digit phone number and works outward"*
- `screens-catalog.js` line 1–6 (variant matrix rationale)
- `screens-system.js` line 1–8 (audit + AI)
- `app.js` line 1–3: *"Hash routing so the prototype opens straight from the filesystem with no server"*
- `i18n.js` line 1–4: *"a Bangla-first product that renders 1,250 in Latin digits is only half translated"*
- `ui.js` line 1–3: *"a change to how a figure declares its Recognition Basis changes it on every screen at once"*

### 4.3 In-file inline comments are dense and load-bearing

Document decisions, not syntax. Notable examples from the developer scan:

- `ui.js` line 84–93 (the three-form Role capability matrix)
- `data.js` line 215–220 (settlement `declaredTotal` invariant)
- `screens-orders.js` line 206–210 (the pink-dupatta-came-out-black bug)
- `screens-system.js` line 38–44 (audit screen's `roles` vs `money` flag)
- `screens-money.js` settlement variance disposition state machine
- `app.js` line 57–58 (the detach-then-re-attach dance for toasts)
- `app.js` line 184–190 (`SCREEN_INDEX` is the review checklist)
- `app.js` line 201–217 (the nearest-match scorer for sub-routes)

The codebase reads as an exemplar of *"comments-as-design-rationale."*

### 4.4 What is missing

- **No JSDoc / no type annotations.** Pure ES5 IIFE module pattern. The recognition-basis invariant in particular would benefit from `'earned' | 'realized'` as a discriminated string.
- **No architecture document in the repo** (this codekb is the first).
- **No CHANGELOG**, no `CONTRIBUTING.md`, no `LICENSE`.

---

## 5. Style conventions

- **ES5 only** in 10 of 11 files (`var`, no `let`/`const`; no arrow functions; no `class`; no template literals; no destructuring in module bodies). String concat everywhere, heavy `L(bn, en)` for bilingual copy, `App.esc()` for HTML escape. [ui.js line 71–75]
- **IIFE module pattern** in every `js/` file: `(function (App) { 'use strict'; ... })(window.App);`.
- **One exception** — `screens-journeys.js` uses `const`, arrow functions, `Object.assign`, template literals (line 16–28, etc.). The inconsistency has no engineering reason — it suggests this file was authored later, separately. **The architect should pick one** (recommendation: modern ES in production).
- **Naming** — kebab-case verb actions; `App.LANG` for vocabulary; `App.<noun>` for collections; data IDs `ORD-####`, `P-###`, `C-##`, `D-##`, `E-###`, `S-##`, `A-##`, `STL-####`.
- **CSS classes** — BEM-ish single-class with a tail for state (`.cash-cell`, `.basis.realized`, `.basis.earned`, `.completeness.full`, `.chip.green.sm`, `.is-on` / `.has-…` paired with their base).

---

## 6. Tech debt signals (concrete, file/line cited)

These are the signals the developer scan enumerated, with architect-relevant annotation.

### 6.1 Tech Debt Signal #1 — **No persistence layer** ⚠️ **highest impact**

Zero `localStorage` / `sessionStorage` / IndexedDB. Every reload reverts to seed. Implication for production: there is **no data model, no migration, no storage abstraction** in this prototype — the entire "data layer" is the `App.orders` / `App.customers` / `App.products` / `App.audit` / `App.settlementRun` arrays declared in `data.js`. **This is the single most consequential thing the architect (link 2) must carry forward** — there is no schema, only a seed.

The 76 stories described in `screen-map.js` and `epics.md` describe a far more sophisticated system (tenant isolation, capability gate, inventory movement ledger, recovery-code five-step overwrite) that the prototype does not begin to cover.

### 6.2 Tech Debt Signal #2 — No data-flow / state boundary

Everything is a single global (`window.App`). The hash router triggers a full DOM rebuild on every navigation (`app.js render()` line 81). For 16 000+ render cases this is fine; for a production app it is a re-architecture.

### 6.3 Tech Debt Signal #3 — ES5 / ES2015+ inconsistency

`screens-journeys.js` is the only file using `const`, arrow functions, `Object.assign`, template literals (line 16–28, etc.). Every other module is strict ES5. The inconsistency has no engineering reason — it suggests this file was authored later, separately. **Architect should pick one.**

### 6.4 Tech Debt Signal #4 — Magic-string `SCREEN_INDEX`

The `App.SCREEN_INDEX` (`app.js` line 106–181) is a hand-maintained 75-row literal that must stay in sync with the registered `App.screens.*` keys and with the `screen-map.js` mockup. The chrome dropdown sync (line 192–218) has a hand-coded nearest-match scorer because "routes carrying a different record id are not in the index by name." The `story-coverage` harness re-validates the index against `epics.md` / `SMARTBIZ_SCREEN_MAP`.

**This triple-load is a tech-debt signal but not a bug — it is the explicit design** (comment at line 104–105: *"Every screen the prototype can reach, in walkthrough order. This doubles as the review checklist for the UX phase."*). Production should generate `SCREEN_INDEX` from the registered `App.screens` map and a typed screen-define contract.

### 6.5 Tech Debt Signal #5 — Paste-parser segment-isolation is the most regression-prone code path ⚠️ **highest risk**

`parseMessage` (`screens-orders.js` line 141–262) is genuinely implemented (not staged), and `flows.js` exercises it, but the segment-isolation invariant (*"an item's details must come from the item's own words"*) is asserted once, in `flows.js` "parsed details come from the item they belong to." The comment at line 206–210 documents a real bug it prevented.

**Architect should treat this as the single most regression-prone code path in the prototype.** Production capture-flow tests should assert "an item's details come from the item's own words" with a wider variety of inputs (multiple products, multiple variants per product, common Bangla connector words).

### 6.6 Tech Debt Signal #6 — Three-layer Role gate by design

`roleLock()` (`ui.js` line 331–340) and the absence-gated routing (every `money`/`price`/`cost`/`roles` flag plus `App.canReach` `ui.js` line 94–102) is enforced on every navigation but also re-enforced inside Role-adaptive screens (e.g. `dailySummary()` in `screens-core.js` line 496–500 self-gates even though `home` cannot carry the `money` flag). This duplication exists *by design* and is documented in the comments. **Architect must keep both layers or the leak returns.**

### 6.7 Tech Debt Signal #7 — Hard-coded Chrome binary path

Hard-coded Chrome binary path in `shot.js` line 10 and `measure.js` line 6 (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`). **Will not work on Linux/Windows without code edit.** Not a prototype bug — a runtime-environment assumption worth flagging. Production should use `chrome-launcher` or an env var.

### 6.8 Tech Debt Signal #8 — Audit trail is append-only by design

`App.audit` (`data.js` line 262–273, 10 entries). Reversals are *new* entries (A-84 reverses E-199), never edits. Documented at `screens-system.js` line 1–8. **This is the contract**, not debt. Architect must preserve it.

### 6.9 Tech Debt Signal #9 — `App.state` is a free-form mutable bag

All UI state — filters, paste buffers, voice state, insight state — is parked under `App.state.*` with no schema. Tests reach into it directly (`boot.js` line 60–69 sets and inspects `App.state.voice`). Production must formalise this.

### 6.10 Tech Debt Signal #10 — Frozen `App.TODAY` clock

`App.TODAY = '2026-09-07'` (`data.js` line 11) and `App.ago()` (`i18n.js` line 85–93) reads against it. `time()` (`i18n.js` line 60–70) reads the hours from a stored timestamp. **No real `new Date()` anywhere in the data path.** This is deliberate — the seeded day must add up — but architect must decide whether production freezes TODAY or replaces it with `new Date()`.

### 6.11 Tech Debt Signal #11 — No `console.log` / `TODO` / `FIXME` / dead code

No `console.log` / `console.warn` / `debug` / `TODO` / `FIXME` / `HACK` / `XXX` / `TBD` anywhere in `prototype/js/` or `prototype/css/`. The only `console.log` is in `prototype/tests/*` harnesses, which is correct. (Grep confirmed.) **No dead code visible.** No commented-out blocks. No `var unused = …;` leftovers. The code reads as a working artefact, not a draft. [dev-scan §"Code Quality Indicators"]

### 6.12 Tech Debt Signal #12 — The `parseMessage` bangla digit normalisation is a hidden coupling

`parseMessage` line 144 normalises Bangla digits to Latin via `[০-৯]` regex on the *text* and on each *segment* (line 250). This is correct but subtle — it is the kind of code that will break silently if someone refactors the variant axes to use Latin values. Tests cover it; production should still type it carefully.

### 6.13 Concerns not flagged by the developer scan

The architect adds the following observations after cross-referencing the source:

- **The `screen-map.js` mockup contract is loaded by URL** (`index.html` line 66, relative path `../_bmad-output/...`). This is brittle — moving the prototype will break the loading. Production should either commit a copy under source control or import the design contract as a typed module.
- **No "first-time setup" state machine** — `setup` is a single screen, not a wizard. The 76-story contract describes a more involved first-run experience (tenant isolation, capability gate, recovery-code five-step overwrite) that the prototype does not implement. This is part of the "no schema" gap.
- **`App.go(path, replace)` does not validate `path`** — the prototype relies on the chrome dropdown + sidebar to feed only valid routes, but a hand-typed `#/not-a-route` shows the roleLock state if a `screen` is registered with that name (it isn't) or a "Not found" empty state. The empty state is good UX; the roleLock-on-unknown-route is a class of bug waiting to happen if anyone adds a screen with a `roles` flag.
- **`App.canReach(route)` parses on `'/'`** to get the first segment — but if a sub-route is named with a different first segment (e.g. `recovery/reset` vs `recovery/reveal`), the gate only checks the first segment. The audit screen is `audit` only; its sub-route `audit/A-84` is gated by the same first segment. This is by design but worth being explicit about.
- **`nearer(target, actEl, goEl)` is subtle** — when both `[data-go]` and `[data-act]` match, the action wins if the action is the nearer ancestor. This is the right default but a single misnested button can produce surprising behaviour. The dev-scan does not flag it.
- **`App.history` is in-memory** — the back button works within a session but a reload starts fresh. This is consistent with "no persistence" but means deep-linking back into a 76-story walkthrough requires re-clicking the chrome dropdown.
- **The Bangla numbers in the past-date fallback** (`App.ago`) assume `App.TODAY` is set; if it isn't, `App.ago` defaults to `'2026-09-07'` (`i18n.js` line 86). The default is the same as the data, but the pattern (silent default) is a fragile one.

---

## 7. The recognition-basis invariant — by design, not debt

This deserves its own section because it is the most architecturally consequential design property of the prototype.

> "Remove [the basis pill] and the numbers become opinions." — `ui.js` line 130–131

Every money figure in the product states two things:

1. **Its basis** — `basisPill` (`earned` vs `realized`).
2. **Its completeness** — `completeness(have, of)` button with `data-act="completeness-why"`.

This invariant is encoded in **six places** — at the data layer (`App.RECOGNITION` in `data.js` line 412), at the component layer (`basisPill` and `completeness` in `ui.js` line 132–147), at the action layer (`completeness-why` and `basis-why` in `app.js` line 343–406), at the screen layer (every screen that totals money uses these), at the test layer (`truth.js` restates the spec inline), and at the documentation layer (every module comment that touches money references it).

**The architect must not collapse these.** If the production system shows a number without a basis, it is no longer the SmartBiz product. The `completeness-why` sheet is the user-facing artifact of this invariant; the `basis-why` sheet is its companion.

---

## 8. What the production system inherits

| From the prototype | Inherit as-is | Refactor | Replace with new design |
|---|---|---|---|
| ES5 IIFE + `window.App` global | | ✅ | (modern ES + scoped modules) |
| `App.screens` / `App.actions` registry | ✅ (pattern) | | (typed contract) |
| `App.parseMessage` segment-isolation | ✅ (logic) | | (typed + tested) |
| `App.RECOGNITION` | ✅ (concept) | | (typed) |
| `basisPill` / `completeness` | ✅ (component shape) | | (typed) |
| `completeness-why` / `basis-why` sheets | ✅ (UX) | | (typed) |
| `App.canReach` + per-screen self-gate | ✅ (pattern, three layers) | | (typed) |
| Audit trail append-only | ✅ (contract) | | (production schema) |
| 8-harness test suite | | ✅ (modern test runner, same blind-spot design) | |
| `App.TODAY` frozen | | | ✅ (real `new Date()`) |
| No persistence | | | ✅ (database, schema, migrations) |
| Hard-coded Chrome path | | ✅ (env var / `chrome-launcher`) | |
| ES5/ES2015+ split | | ✅ (pick one) | |
| `App.state` free-form | | | ✅ (typed state container) |
| `App.SCREEN_INDEX` magic string | | ✅ (generated from registry) | |
| No lint / no CI / no types | | ✅ (ESLint + Prettier + CI + TypeScript) | |

---

## Sources

- `[dev-scan]` — full developer scan, test coverage, code quality indicators, tech debt signals
- `[prototype:tests/README.md]` — mutual-blindness table, two load-bearing rules, mutation discipline
- `[prototype:tests/truth.js]` — `EARNED_STATUSES`, `REALIZED_STATUSES`, `PIPELINE_STATUSES`, `LATIN_OK`, `CAN_AUDIT/CAN_CAPTURE/CAN_ASK`
- `[prototype:tests/boot.js]` — delegation-wired-once assertion (line 57–68)
- `[prototype:tests/classes.js]` — `.lang-card.is-on`-vs-bare-token blind spot
- `[prototype:tests/contrast.js]` — `tokens.css` reading strategy
- `[prototype:tests/story-coverage.js]` — 76-story parity
- `[prototype:tests/shot.js]` — Chrome path (line 10), port 9333
- `[prototype:tests/measure.js]` — Chrome path (line 6), port 9334
- `[prototype:js/data.js]` — `RECOGNITION` (line 412), `econ` (line 287–323), `summary` (line 352–385), `audit` (line 262–273)
- `[prototype:js/ui.js]` — `basisPill` (line 132–135), `completeness` (line 137–147), `roleLock` (line 331–340), `canReach` (line 94–102)
- `[prototype:js/app.js]` — `completeness-why` (line 343–382), `basis-why` (line 384–406), `SCREEN_INDEX` (line 106–181), `nearer` (line 332–340), `parse` (line 22–26), `go` (line 28–32)
- `[prototype:js/screens-orders.js]` — `parseMessage` (line 141–262), segment-isolation comment (line 206–210), `DEMO_MSG` (line 130–136)
- `[prototype:js/screens-core.js]` — `dailySummary` (line 496–500)
- `[prototype:js/screens-system.js]` — `audit` `roles` flag (line 38–44), audit append-only contract (line 1–8)
- `[scope-md §5, §6, §9]` — module scope, business rules, free-tier constraint
- `[intent-backlog]` — MoSCoW + dependency-first sequencing, cross-cutting concerns (TC1–TC9, OC1–OC2, PC1–PC2)