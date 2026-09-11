---
name: 'Reconciliation — UX spines against the architecture spine'
type: review
reviews: '../ARCHITECTURE-SPINE.md'
against:
  - '../../../ux-designs/ux-SmartBiz-2026-09-07/DESIGN.md'
  - '../../../ux-designs/ux-SmartBiz-2026-09-07/EXPERIENCE.md'
  - '../../../../../prototype/'
status: draft
created: '2026-09-08'
---

# Reconciliation — UX spines vs. ARCHITECTURE-SPINE.md

## Verdict

The architecture spine is strong where the product's *arithmetic* is at risk and weak where the product's *surface* is at risk. AD-4, AD-5, AD-8, AD-9, AD-10 and AD-11 discharge Money Truth and Reversal and Audit almost line for line — AD-8's inseparable `(value, basis, completeness)` triple is a better mechanism than EXPERIENCE.md asked for. But the spine treats DESIGN.md as a set of values the presentation layer will "implement" (line 54) and never establishes a home for them: the Stack table (lines 243–258) names no styling technology, the source tree (lines 350–352) has no `styles/`, no `tokens.css`, and the word *accessibility* does not appear in the document. The five prototype harnesses that currently enforce both spines have no successor, and one of them — `contrast.js` — cannot survive the port to JSX at all.

Two behavioural state patterns are unmechanised outright: **Offline** (EXPERIENCE.md line 240) and **Cold open** (line 235). AD-20 does not cover either; it covers the *server's* cold start, which is a different event from the one the seller sees. And AD-3, the one AD that carries Role gating, is derived from a source (PRD §6.2) that contradicts a deviation EXPERIENCE.md recorded as a decision, with a test clause that would fire on the pack slip — the product's one deliberate exception.

Fourteen findings below. Six must be fixed in the spine before epics are cut; the rest split between spine text and epic ownership as marked.

## Triage

| # | Finding | Owner | Severity |
| --- | --- | --- | --- |
| F1 | Offline capture has no architectural mechanism | Architecture | Critical |
| F2 | Cold-open cached figures contradict AD-20 + Deferred:Caching, and leak past AD-3 | Architecture | Critical |
| F3 | AD-3 reverts EXPERIENCE.md's Packer deviation; §6.2 is a matrix, not a ladder; the pack slip fails AD-3's test | Architecture | Critical |
| F4 | DESIGN.md has no implementation home and no enforcement successor; `contrast.js` dies at the JSX boundary | Architecture | Critical |
| F5 | Three-step import wizards have no home for intermediate state under AD-18 + one-page-per-Inertia-page | Architecture | Critical |
| F6 | Bottom sheets: route or local state? Addressability and back-out-of-a-sheet undecided | Architecture | Major |
| F7 | AD-14 defines two routing outcomes; EXPERIENCE.md requires three, plus stable query ordinals | Architecture | Major |
| F8 | AD-17 vs the Identifiers convention — `ORD-1042` or `ORD-১০৪২`, and no home for the Latin-digit allow-list | Architecture | Major |
| F9 | AD-17 covers `gettext`, not bilingual *content*; the ER diagram has no per-axis Bangla/English fields | Architecture | Major |
| F10 | AD-17's formatter contract returns a string; DESIGN.md needs formatted *parts* | Architecture | Moderate |
| F11 | Two Bangla web-font families undeclared; AD-16's font decision is PDF-only; tabular Bangla numerals unverified | Architecture | Moderate |
| F12 | No Inertia shared-props / persistent-layout layer for Role-derived nav, badges, language, Member | Architecture | Moderate |
| F13 | IA → source tree: `frontend/pages/` mirroring `apps/` cross-cuts the five nav groups; Process flows has no module | Architecture (light) | Moderate |
| F14 | Accessibility floors: 44px, focus ring, `aria` state, styled↔reachable, reduced motion — no AD, no required test | Architecture + epics | Major |

---

## Correcting one input to this review

The brief given to this review said EXPERIENCE.md describes "roughly 24 screens and 58 routes". Both numbers are real but they are not the same kind of thing, and conflating them hides F13.

- **58 routes** is exact. `prototype/js/app.js` lines 106–173 (`App.SCREEN_INDEX`) enumerates exactly 58 entries carrying a route value, matching EXPERIENCE.md line 16's "all 58 routes". No route exceeds three path segments, so EXPERIENCE.md line 100's depth cap holds.
- **24 is the prototype's screen-*handler* count**, not a screen count: `grep -c "App.screens" prototype/js/screens-*.js` returns 24 across five files (catalog 5, core 6, money 7, orders 3, system 3). EXPERIENCE.md's IA tables (lines 32–99) enumerate **56 distinct surfaces** — 7 onboarding, 18 Work, 8 Catalogue, 13 Money, 3 Insight, 7 System. The extra two routes are additional Order-detail records (`order/ORD-1033`, `order/ORD-1031`).

The 24-vs-58 gap is itself the finding. `App.screens.capture` (`screens-orders.js` line 97) serves nine routes; `App.screens.settlement` (`screens-money.js` line 146) serves five. The prototype consolidated because sub-routes *share live state*. The spine's rule at line 230 — "One React page component per Inertia page" — forces those back apart into 58 page components with a server round trip at every seam. That is the mechanism behind F5 and F6.

---

## A. Findings the architecture must fix

### F1 — Offline capture has no architectural mechanism at all `[CRITICAL]`

EXPERIENCE.md line 240 states a state pattern with no qualifier on its surface column:

> | Offline | **Everywhere** | Capture continues locally; no blocking banner. Sync state surfaces in Settings only. |

This is not decoration. Line 24 makes it a founding constraint — "a mid-range Android phone, an intermittent mobile connection … Every interaction assumes it may be interrupted" — and line 114 puts it in the seller's own words as approved microcopy ("ইন্টারনেট ধীর হলেও কাজ করে").

The spine has no answer. Searching `ARCHITECTURE-SPINE.md` for `offline` and `service worker` returns zero hits. The three ADs that look adjacent do not cover it:

- **AD-12** (lines 172–176) is about *optional transports* — courier, email, insight provider, OCR. Its fallbacks are all server-side adapter selections ("selected by configuration"). Loss of the network between browser and Render is not one of the four ports.
- **AD-20** (lines 220–224) says "all work happens in the request that asked for it". Offline capture is by definition work happening with no request available.
- **AD-18** (lines 208–212) forbids a durable *server* filesystem, which is orthogonal.

Meanwhile the stack chosen makes this harder than the alternative it displaced. With inertia-django and Django-owned form validation, a captured order is a POST that must reach the server to be validated at all; there is no local write path. Plain Django templates with HTMX had the identical problem, so this is not a regression — but the spine changed the front end without noticing that it had inherited an unfunded requirement.

**Required in the spine.** Either a new AD naming the mechanism (a client-side outbox in IndexedDB plus a replay endpoint plus an idempotency key, with a service worker for the shell), or — more likely correct for a 2–4 week single-developer build on free-tier hosting — an explicit, funded **scope reduction** that narrows line 240 to something achievable and says so. Per PRD §8 a reduction has to be named. Candidate narrowing: capture *forms* retain their in-progress input across a failed submit and retry when the connection returns, within one page session; no cross-session queue, no background sync. That is defensible and testable. What is not acceptable is leaving line 240 standing with no mechanism, because "Everywhere" will be read by an epic as already handled.

**Secondary.** Line 240's second clause — "Sync state surfaces in Settings only" — references a Settings surface that does not exist in EXPERIENCE.md's own System table (line 97 lists Settings · Members & roles · Business profile · AI assistant). Whatever F1 resolves to, either that surface is added to the IA or the clause is struck.

### F2 — Cold open requires a client-side cache the spine forbids, and the cache would leak past AD-3 `[CRITICAL]`

EXPERIENCE.md line 235:

> | Cold open | Dashboard | **Cached figures render immediately with their basis pills**; a refresh never blanks a figure that was already on screen |

Reinforced in Flow 1, line 293 ("The Dashboard is already drawn from cache") and its failure line 300 ("cache miss on cold open → figures render with their basis pills and a Completeness Indicator rather than blanking").

The spine forbids this twice:

- **AD-20** line 224: "In-process memory is never a cache of record — a projection is a database row, not a dictionary."
- **Deferred** line 386: "**Caching.** Nothing is cached in v1. At 50 orders a day and 18,000 a year, a query plan is cheaper than a stale figure."

AD-20's closing sentence — "The cold start is a first-class UI state per NFR-21, not an error" (line 224) — reads like coverage but is about a different event. Two distinct cold starts are being conflated:

1. **The instance cold start.** The Render free instance spins down after 15 minutes and takes ~60s to return (line 289). During that minute the browser has *no response at all*. There is nothing rendering a "first-class UI state", because under Inertia the app shell arrives in the same Django response that is being waited on. Declaring the cold start a UI state does not make it one; something must be served independently of Django waking up — a static shell, a service worker, or a holding page at the edge. The spine names no static-asset strategy anywhere (no WhiteNoise, no CDN, no `STATIC_ROOT`), despite Vite being in the stack and Django having to serve the built bundle.
2. **The seller's cold open.** Line 235 is about the *figures*, and it wants them from a client store so the Dashboard is legible before the server answers.

The second one carries a security consequence the spine has not seen. **AD-3** (lines 118–122) guarantees that "a money field a Role may not see is never serialised into the Inertia payload". A client-side cache of Dashboard props inverts that guarantee's scope: the payload was correctly filtered for the Role that was signed in, and it then persists on a shared shop phone across a Member switch, a Role change by the Owner (PRD §6.2 line 1384 grants exactly that), or a language flip. AD-3's test asserts a property of the *response*; nothing asserts a property of what the browser kept. A Packer picking up Nusrat's phone reading last night's `earnedProfit` out of `localStorage` is the precise failure AD-3's own "Prevents" paragraph describes, one layer further out.

**Required in the spine.** Decide the mechanism and scope it, in an AD or an amendment to AD-20:
- what store (`sessionStorage` is materially safer than `localStorage` here and probably sufficient — it dies with the tab, which is the shared-phone case);
- what is cacheable (only the four cash-strip cells plus the attention count, each already carrying its basis and completeness per AD-8 — never a list, never a Customer);
- the invalidation key (Business + Member + Role + language, so any change discards rather than filters);
- and an explicit carve-out in Deferred line 386, which currently reads as a blanket prohibition.

Then resolve the instance cold start separately, since a cache in the tab does nothing for a seller opening the app fresh.

### F3 — AD-3 silently reverts EXPERIENCE.md's Packer deviation, treats a matrix as a ladder, and its test fires on the pack slip `[CRITICAL]`

Three problems in one AD. All three trace to the same sentence in Inherited Invariants, line 51:

> | §6.2 Roles and money visibility matrix | PRD §6.2 | The five Roles and the money-visibility ladder are given. AD-3 fixes only where the matrix is enforced. |

combined with line 45: "a local decision contradicting one is a conflict to raise, not to override."

**(a) The Packer deviation is reverted without anyone deciding to revert it.** PRD line 105 names the five Roles as "Owner, Manager, Sales Staff, Inventory Staff, or Accountant" — no Packer. EXPERIENCE.md lines 139–145 carries Owner/Manager/Accountant/Staff/**Packer** on a three-level ladder (`full`/`price`/`none`) and records the substitution as a decision, with its reasoning stated at length:

> §6.2's Inventory Staff may see Purchase Cost while being denied margin, which is a fourth money level and not an easier one — the level would have to grant cost and withhold selling price, so the ladder would stop being a ladder. What that fourth level would cost is the `none` Role itself, and the `none` Role is the one that demonstrates the thesis.

PRD §6.2 confirms the shape EXPERIENCE.md rejected: line 1365 grants Inventory Staff "See Purchase Cost — Yes", line 1369 denies "See margin and profit", and line 1399 defends the combination as deliberate. So the two documents genuinely conflict, and the spine's inheritance rule resolves the conflict *toward the PRD, silently*. `apps/tenancy/` (line 334) is annotated "Business, Member, Role, §6.2 capability matrix", so the tenancy epic will seed five Role rows from §6.2 and the substitution will be discovered as a bug in the UI, not as a decision.

The cost of reverting is concrete, not stylistic:
- DESIGN.md line 308's tab-bar rule keys on a Role that "may not see a selling price" — §6.2 has no *selling price* row at all, so under the PRD's five Roles that rule has nothing to derive from. The four-slot, no-centre-action tab bar becomes unreachable.
- `prototype/js/data.js` lines 14–20 implements `owner/manager/accountant/staff/packer` at `full/full/full/price/none`.
- `prototype/tests/truth.js` line 148 hardcodes `CAN_ASK = { owner: 10, manager: 10, accountant: 10, staff: 4, packer: 3 }` and line 147 `CAN_AUDIT`; line 115 sweeps `['staff', 'packer']` for money leaks across every route. Every one of those assertions is keyed to the deviation.

**Required:** the spine must name the five Roles it is building, adopt EXPERIENCE.md's set explicitly, and record the deviation with its funding — or raise the conflict per line 45 and get it decided. It must not be left to inheritance.

**(b) §6.2 is a 31-row capability matrix; AD-3 is written as if it were a money filter.** AD-3's rule (line 122) says "one capability function derived from the §6.2 matrix both guards the view and filters the props. A money field a Role may not see is never serialised… A test asserts, per Role, that the response body for **every money-bearing page** contains **no field** the matrix denies."

Roughly twenty of §6.2's thirty-one rows are not visibility at all — they are action permissions ("Set Order Status to Cancelled, Failed Delivery, or Returned", line 1358; "Import Orders from a spreadsheet", line 1356; "Change a Member's Role", line 1384). Two consequences AD-3's text does not reach:

- **Role-gated surfaces that carry no money.** EXPERIENCE.md line 137 names this explicitly as a mistake worth avoiding: "the audit trail is the Owner's and the Accountant's, and the **Manager is excluded from it while seeing every figure in the product**." PRD line 1378 and line 1402 confirm. The audit trail is not a money-bearing page, so AD-3's test does not cover it; and EXPERIENCE.md line 239's Capability-gated pattern names it as a first-class case ("or one gated by Role outright like the audit trail"). `truth.js` line 147 asserts it. The spine does not.
- **Per-transition permission.** PRD line 1401: "FR-11 enforces this as a **transition-level** permission, not a screen-level one", restated at line 511. AD-3 guards views and filters props; an Order-detail page legitimately renders for Sales Staff while three of its status actions must be absent. Nothing in AD-3 or AD-9 says where transition permission is checked. (AD-9 says one service call is one transaction — the natural home is the service, but it is not stated.)

**Required:** widen AD-3 from "money field" to "capability", state that the capability function's second axis is *reachability by Role* independent of the money level, and add the transition-level check to AD-3 or AD-9.

**(c) AD-3's test, as written, fails on the pack slip.** EXPERIENCE.md line 61 calls the pack slip "the one money-bearing screen no Role is gated from"; line 151 states it as a decision:

> **The pack slip is the deliberate exception.** It carries the amount to collect, because a Packer who cannot see the COD amount cannot hand the parcel over.

Flow 6 (lines 346–355) is built on it. AD-3's test — "the response body for every money-bearing page contains no field the matrix denies" — is a page-level universal that the pack slip violates by design. The likely outcome is worse than a red test: someone satisfies the test by removing the amount, and Jamal cannot do his job. `truth.js` handles this correctly at line 42 with a named carve-out (`const SLIP = /\/slip$/`) and says why. **Required:** the carve-out must be named in AD-3's rule text, not left for the test author to rediscover.

### F4 — DESIGN.md has no implementation home, and its enforcement mechanism does not survive the port `[CRITICAL]`

This is the largest structural gap, and it has two halves.

**(a) No styling layer exists in the architecture.** The Stack table (lines 243–258) lists Python, Django, Postgres, inertia-django, React, Vite, TypeScript, WeasyPrint, Pango, pypdfium2, Gunicorn, Playwright, Gemini and Render. It names **no styling technology** — not Tailwind, not CSS modules, not vanilla CSS, not a token pipeline. The source tree's `frontend/` (lines 350–352) has `pages/`, `components/` and `lib/format.ts` and nothing else. The only two occurrences of "CSS" in the whole spine (lines 200, 354) are the WeasyPrint document templates.

So DESIGN.md's entire frontmatter — 60 colour tokens, 9 typography steps, 5 radii, 13 spacing steps, 4 elevations, 3 motion durations and 17 component specs (lines 10–201) — has nowhere to live. Line 54 assigns it to "the presentation layer", which is a layer, not a file. `prototype/css/tokens.css` is the existing artifact and DESIGN.md line 208 declares it normative ("Every token above ships in `prototype/css/tokens.css`"); the spine's source tree does not carry it forward. Two of the spine's own commitments depend on it existing somewhere specific: AD-16 needs one font stack shared between web and PDF, and AD-17 wants one formatting contract shared the same way — the same argument applies verbatim to tokens, and would be stronger if made.

**(b) `contrast.js` cannot run after the port, and nothing requires a replacement.** This is the concrete finding the brief anticipated, and it is worse than a `class`/`className` rename.

`prototype/tests/contrast.js` enforces DESIGN.md in four passes:
1. Lines 34–36 parse `--token: #RRGGBB` out of `css/tokens.css` into a table; lines 64–77 assert the arithmetic floors from DESIGN.md lines 241–243 against `canvas-sunk` as the worst of the three backgrounds.
2. Lines 79–89 assert the **inverse** floor — that `line` and `line-strong` *stay below* 3:1, so nobody "fixes" the ruled ledger lines and destroys the look. This is DESIGN.md line 243's exemption and line 329's prohibition, encoded.
3. Lines 107–190 scan **`prototype/js/*.js` source text** for control boundaries drawn in a ruled-line colour. Line 119 is the load-bearing regex: `/<(button|a)\b[^>]{0,400}?class="([^"]*)"/g`. Lines 134–138 pair that against selectors in `app.css` and `screens.css`. Lines 178–185 hold a `MUST_CHECK` tripwire (`qa-tile`, `act-tile`, `cond-tile`, `q-chip`, `iconbtn.bordered`, `qty-stepper`, `pick-tile`) that fails loudly if the scan stops matching, so the check cannot silently pass by finding nothing.
4. Lines 204–223 compare `tokens.css` against DESIGN.md's own frontmatter, token for token, so the prototype cannot drift from the spine.

Under React 19 + JSX, passes 3 and 4 break for at least five independent reasons, and only the first is the one the brief named:
- the attribute is `className`, not `class`;
- its value is rarely a string literal — it is a template literal, a `clsx`/`cva` call, or a variant prop resolved elsewhere, so `([^"]*)` captures nothing useful even after renaming;
- the element is `<Button>` or `<Chip>`, not `<button>` or `<a>`, so the tag anchor fails;
- the class names in `MUST_CHECK` are prototype-specific and will not exist, so the tripwire fires permanently and the harness is deleted rather than fixed;
- if the styling decision in (a) turns out to be Tailwind or CSS-in-JS, there is no `app.css`/`screens.css` for pass 3's CSS side to read at all, and the whole "is this border a ruled line or a control boundary" distinction moves into utility classes where a source scan cannot resolve the cascade.

The harness's own comments (lines 91–106) explain why it is static rather than rendered: `.cond-tile` and `.snode` are both `<button>` but "neither appears in a synchronous pass — they need a return disposition picked and a state machine opened first — so a DOM walk is exactly the instrument that missed them." That reasoning is what makes the loss non-trivial. A rendered check under React would miss the same states again.

And the spine does not require any replacement. Consistency Conventions line 238: "Every AD clause reading 'a test asserts' has a named test under `tests/invariants/`. Playwright covers the Hero flows, plus a full pass with every optional adapter absent per AD-12." No AD contains a contrast clause, so **zero contrast tests are required to exist**. `tests/invariants/` (line 356) is enumerated as "AD-2, AD-3, AD-5, AD-8, AD-13, AD-14" — all server-side arithmetic and gating.

The same argument voids the other harnesses:
- `classes.js` lines 100–108 enforces EXPERIENCE.md line 265 exactly ("A modifier class with no rule behind it is an accessibility defect"), by diffing DOM classes against CSS-defined classes across every route × Role × language × device × AI state. No successor.
- `truth.js` lines 182–203 sweeps all 58 routes for a Latin digit in a Bangla view — EXPERIENCE.md line 156, DESIGN.md line 325 — which is AD-17's only real proof. Lines 111–138 assert gating by absence over every route rather than by a lock on the one route someone remembered; its header comment (lines 13–15) records that the leak it was written for "lived on a Role-adaptive screen that carried no `money` flag, so no per-screen check saw it". AD-3's test is per-page, i.e. the shape that missed it.

**Required in the spine:**
1. Name the styling technology in the Stack table and give tokens a path in the source tree (`frontend/styles/tokens.css` is the obvious port of `prototype/css/tokens.css`), with the rule that DESIGN.md's frontmatter is the source and the file is generated from or diffed against it — pass 4 is cheap to keep and catches drift in both directions.
2. Add an AD — call it AD-21, *DESIGN.md's floors are asserted, not reviewed* — with "a test asserts" clauses so line 238 pulls them into `tests/invariants/`: the token-value floors, the `line`/`line-strong` inverse floor, and the amber-vs-brass pair (F4c below).
3. Decide how the *usage* check (pass 3) is replaced, and accept that the answer depends on (1). If tokens stay in plain CSS with semantic class names, a source scan adapted to `className` plus component-name anchors is viable. If the answer is utility classes, the check has to move to a rendered pass over a component gallery with every state forced — which is weaker, and the spine should say so rather than discover it.

**(c) The amber/brass redundancy rule is a semantic constraint with no home.** DESIGN.md line 246 is a full paragraph:

> **Amber and brass are 1.05:1 apart, and that is a constraint, not a bug to paint over.** … Hence the rule: **neither colour is ever the sole carrier of its meaning.** Amber always travels with an explicit Recognition Basis label, and brass always travels with the Completeness Indicator's bar and its "based on N of M items".

Restated as a prohibition at line 328, as an accessibility floor at EXPERIENCE.md line 271, and as component behaviour at EXPERIENCE.md lines 219–220. `contrast.js` lines 192–202 asserts it in the only way arithmetic can — by asserting the pair **stays** indistinguishable, so that if a future palette separates the hues the *rule* is flagged as relaxable rather than silently kept or silently dropped. Its comment states the general principle: "Two meanings one colour apart is not a contrast failure, it is a semantics failure, and no ratio floor catches it."

The architecture covers the *data* half of this well, and this should be credited: **AD-8** (line 152) makes the triple inseparable — "It returns a triple — value, basis, completeness — and the three are inseparable: a caller cannot obtain the value alone." That is precisely the right mechanism, and it is stronger than the UX spines asked for.

What is missing is the *render* half. AD-8 guarantees a caller receives the basis; nothing guarantees a component renders it. DESIGN.md line 293 ("Accompanies every figure") and EXPERIENCE.md line 219 ("Never omitted, never abbreviated to a colour alone") are component contracts. **Required (small):** extend AD-8, or add to Consistency Conventions, that one `Money`/`Figure` component is the only render path for a money value, that it accepts AD-8's triple as a single indivisible prop, and that it cannot render the value without the pill — mirroring AD-8's data rule at the component boundary. Then a test asserts no page renders a money-toned figure outside it. Without that, AD-8's guarantee stops at the props and the DESIGN.md rule rests on review.

### F5 — The three-step import wizards have no home for intermediate state `[CRITICAL]`

EXPERIENCE.md line 57 specifies a three-surface wizard, and the middle step is the point of the feature:

> | Spreadsheet import → Column mapping → Import preview | Capture hub | A batch, **with the mapping shown before it commits** |

Flow 2 steps 2–3 (lines 306–307) specifies the same for settlement: "She imports the file; the column mapping screen shows her guesses and lets her correct them. Match review splits the run." The IA carries both — `capture/import` → `capture/import/map` → `capture/import/preview`, and `settlement/import` → `settlement/import/map` → Match review (six of the 58 routes).

Two spine decisions collide here:

- **Line 230:** one React page component per Inertia page. Three routes are three Inertia pages, therefore three server round trips.
- **AD-18, line 212:** "uploads are parsed within the request and **discarded**; only derived rows persist… **No feature may assume a file exists after its response ends.**"

So between step 1 and step 3 the parsed rows and the column mapping must survive with no file and no client router holding them. The spine never says where. The candidates are not equivalent:
- re-upload at each step — contradicts the flow as written and loses the seller's corrections;
- stash parsed rows in the Django session — a payout file is potentially hundreds of rows in a DB-backed session row, and AD-20's "in-process memory is never a cache of record" points away from it without forbidding it;
- persist draft rows immediately and let the wizard edit them — which *is* "only derived rows persist" and is almost certainly the right answer.

If it is the third, the schema is missing. `SETTLEMENT_BATCH` / `SETTLEMENT_ROW` (ER diagram, lines 318–319) can plausibly hold a payout mid-mapping, and `COURIER ||--o{ COLUMN_MAPPING` (line 317) already persists mapping — good. But there is **no draft-order or import-batch entity for `capture/import`** anywhere in the diagram, and a spreadsheet of orders arriving as real `ORDER` rows before the preview commits would contaminate every derived figure on the Dashboard, which AD-8's consumers all read. It would also collide with PRD line 1356, where Sales Staff may create Orders one at a time but may not import a file — the blast-radius rule that makes the preview step necessary in the first place.

**Required:** an AD or an ER addition naming where multi-step import state lives, with an explicit reconciliation against AD-18's "discarded", and a draft/staging entity for order import that is invisible to `money`, `reports` and `insights` until commit. This should not be left to the `orders` epic, because two epics (`orders`, `settlement`) will otherwise solve it two ways — exactly the divergence AD-1 exists to prevent.

### F6 — Bottom sheets: route or local state? `[MAJOR]`

EXPERIENCE.md makes three commitments that are individually easy and jointly a decision:

- Line 222: "| Bottom sheet | **Every commit that needs context** | Titled, dismissible by scrim / close / cancel."
- Line 254: "**Bottom sheets carry every commit that needs context**, so the seller never loses the list they were working through."
- Line 253: "**Navigation is addressable.** Every surface has a route; back always returns to where the seller came from, **including out of a sheet**."
- Line 267 (accessibility): "focus moves into a sheet on open and back to the invoking control on close."

The prototype opens 21 distinct sheets (`grep -c` over `js/*.js`) and `classes.js` lines 66–75 walks every one of them. The spine mentions sheets zero times.

With no client-side router — the spine's explicit position — the seller's expectations pull two ways:
- **Sheet as an Inertia page**: back works, the sheet is addressable, focus order is a fresh document — but opening a confirm sheet costs a server round trip, on the intermittent connection of EXPERIENCE.md line 24, for a sheet whose entire job is to restate an effect the client already knows. Under F1's conditions that is the worst possible place to need the network.
- **Sheet as local component state**: instant and correct for the seller's connection, but browser back does not close it without deliberate history manipulation, which is the one thing line 253 names.

There is a third answer — sheet as local state plus a `history.pushState` shim in one shared `Sheet` component — and it is probably right. The point is that it is an architectural decision created by the no-client-router choice, it applies to all 21+ sheets, and if each epic decides for itself the back button behaves differently on different screens. Related: EXPERIENCE.md line 193 makes reversal reachable "from the record it affects, the audit trail, and — while it is still on screen — the toast that confirmed the original action", and line 223 says the toast "Carries undo for reversible operations, which extends its dwell". Under Inertia a commit is POST-then-redirect, so the new Audit Entry's id must survive the redirect for the toast to offer undo. The spine's Error shape row (line 235) specifies the failure payload and nothing specifies the success payload.

**Required:** one Consistency Conventions row, or a short AD, fixing (i) sheets as local state within a page component with history integration in one shared component, (ii) focus capture and restore as that component's responsibility per EXPERIENCE.md line 267, and (iii) a success-flash convention carrying `{ message, undo_target }` so the toast's undo works across the redirect.

### F7 — AD-14 defines two routing outcomes; EXPERIENCE.md requires three, and the query ordinals must be stable `[MAJOR]`

**(a) The missing outcome.** AD-14's rule ends (line 188): "Routing chooses among exactly ten queries **or returns the explicit unroutable outcome**; it never composes a query." Two outcomes.

EXPERIENCE.md line 171 forbids exactly that collapse:

> **A withheld answer is not a refusal.** A gated Role's question can route correctly to one of the ten and still not be theirs to read; the screen says the question was understood and the figure is not for their Role. **Calling that "outside the ten" would be a lie about the closed set**, and the seller would learn to distrust the refusal that means what it says.

The State Patterns table separates all four resulting states — routing (line 242), refused (243), withheld (244), unavailable (245) — and gives them three *different colours* carrying three different meanings from DESIGN.md's palette: violet for routing, brass for refusal (a capability boundary), teal provenance for unavailable (DESIGN.md line 234). Withheld is a Role fact, not a model fact. PRD line 1391 backs this: "each answer is computed under the asking Role and refused where the rows above withhold the figures … The permission to ask is not the permission to know."

Under AD-14 as written, a Staff member asking about profit routes to query 6 and then has nowhere to land but "unroutable" — the lie line 171 names. **Required:** AD-14's rule gains a third outcome, *routed-but-withheld*, and it must be produced by the capability function of AD-3 rather than by the router, since the router does not know the Role.

Credit where due: the **unavailable** state is genuinely covered. AD-12 (line 176) and AD-15 (line 194) together give "the button list is offered", and EXPERIENCE.md line 245 asks for exactly that — "the ten stay answerable from the numbered list that names them: the figures were never the model's to compute." AD-15's nine-second envelope is a better specification than EXPERIENCE.md asked for.

**(b) Stable ordinals.** EXPERIENCE.md line 170:

> Their numbers in the closed set do not change: **query 8 is query 8 whoever is reading**, so a Packer's list reads 3, 4 and 8.

`truth.js` lines 162–170 asserts this and explains why the id is written out rather than searched for: "if the ten are renumbered again, the parcel assertion below fails loudly instead of quietly checking a different query."

Consistency Conventions line 231 says "Insight Query **names** are `UPPER_SNAKE` string constants in the owning module" — names, no ordinal. A filtered list built from a name-keyed collection will renumber itself 1, 2, 3 by default, which is the specific defect line 170 prohibits. **Required (one clause):** the ten constants carry their FR-65 ordinal, the ordinal is what renders as the row's lead, and a filtered list never renumbers.

### F8 — AD-17 vs the Identifiers convention: is it `ORD-1042` or `ORD-১০৪২`? `[MAJOR]`

Three documents give three answers to the same question, and the spine contains two of them.

- **EXPERIENCE.md line 156:** "Every number the product renders — money, counts, dates, times, percentages, **IDs where they are numeric** — converts to Bangla digits in Bangla mode. **A single Latin digit inside a Bangla string is a defect**, including the clock inside a timestamp."
- **ARCHITECTURE-SPINE.md line 232 (Identifiers):** "Every reference a seller reads or says aloud is a per-Business human code (**`ORD-1042`**, **`P-101`**)" — written in Latin digits, in a document whose AD-17 (line 206) requires every surface to route text and numbers through `localization`.
- **`prototype/tests/truth.js` lines 26–35** exempts them, with a stated rationale: "Latin digits are legitimate in a Bangla view only where the string is an identifier or a foreign artefact: a record id, a phone number, a filename, a URL, or a cell copied verbatim out of the seller's own spreadsheet." The allow-list is seven regexes — record ids, `#`-prefixed short references, BD phone numbers, filenames, URLs, version strings, ISO dates in raw data.

Since DESIGN.md line 206 and EXPERIENCE.md line 14 both say the spines win over the prototype, EXPERIENCE.md line 156 literally requires `ORD-১০৪২` — which is the code the seller reads aloud to a courier over the phone, and which is also the value in the URL per line 232 ("No UUID in a user-facing URL"). A Bangla-digit route segment is a different question again.

This is not a cosmetic conflict. It is load-bearing in three places: the URL, the pack slip Jamal reads at the door (EXPERIENCE.md line 350), and the consignment number matched against a courier's payout file (Flow 2). And AD-17's own phrasing makes it worse rather than better — "Bangla-digit input is normalised at one input boundary, so nothing downstream ever sees a Bangla numeral in a number field" (line 206) handles input, and says nothing about which outputs are exempt.

**Required:** the spine settles it, and carries the allow-list. AD-17 should name the exempt classes explicitly — identifiers, phone numbers, filenames, URLs, ISO dates in imported source data — since `truth.js`'s regex list is the only place they currently exist and it is about to be deleted. **Also required:** the same AD must carve out the two import surfaces. `truth.js` line 189 skips `capture/import*` and `settlement/import*` because "the import screens show cells copied out of the seller's own spreadsheet, which are source data and must be shown exactly as they arrived" — a documented exception to DESIGN.md line 325 that AD-17's absolute phrasing would erase.

### F9 — AD-17 covers `gettext`, not bilingual *content*; the schema has no per-axis fields `[MAJOR]`

EXPERIENCE.md line 158 is a data requirement wearing localisation clothing:

> **Bangla is the source of truth for content that has both scripts.** Product names, variant values, courier names, and Member names carry a Bangla form and an English form; the English view **resolves each part against its own axis** rather than falling through to the Bangla string. A variant key that renders "Embroidered Kurti মেরুন XL" in English mode is a defect.

AD-17 (line 206) offers `gettext` catalogues, which handle *authored UI strings* and cannot handle seller-entered content: a Product name Nusrat typed is not a msgid. This is a **schema** requirement — `Product`, `Variant`/`VariantDimension` values, `Courier`, and `Member` each need a Bangla field and an English field — and the ER diagram (lines 295–323) shows none. `prototype/js/data.js` lines 15–19 already carries the pattern (`name` / `nameEn`, `label` / `labelEn`), and lines 22–27 handle the derived case (initials follow the language rather than being stored).

The "resolves each part against its own axis" clause interacts badly with a Deferred item. Line 391 defers "The Variant stock key": "The prototype models a variant matrix as axis-value composite keys; the schema above gives `VARIANT` its own row instead. Which representation the per-combination SKU and cost hang off in detail is the `catalog` epic's call." But line 158's defect example is precisely a composite variant key rendered by falling through to Bangla for one axis. If `VARIANT` is a row with a single display label, the English view has no per-axis values to resolve against and line 158 cannot be satisfied — so this deferral is not as free as it reads. The composite-key requirement comes from the UX spine, not from the epic's convenience.

**Also under AD-17: `ngettext` with Bangla as the source language.** AD-17 line 206 says "Bangla is the source language and English is selectable". EXPERIENCE.md line 159 says "**Counted nouns pluralise per language**, not per string: Bangla takes a single suffix, English needs both forms", and line 121 makes the English case a quality bar: "'1 items' reads as a bug and undermines every figure beside it." Mechanically, `ngettext(singular, plural, n)` requires two source strings. With Bangla as source and one Bangla form, the two msgids are identical — which `gettext` tooling treats as degenerate, and which leaves the English catalogue's two plural forms hanging off an identity pair. This is a real, small, entirely avoidable mechanical trap.

**Required:** (i) bilingual content fields named in the ER diagram for the four entity classes at line 158; (ii) an explicit note that variant display must resolve per axis, which constrains line 391's deferral; (iii) one sentence in AD-17 on the plural mechanism — either Bangla msgids are disambiguated with a context marker, or English is the msgid language for counted nouns only, with the asymmetry stated rather than discovered by the developer building the low-stock list.

### F10 — AD-17's formatter contract returns a string; DESIGN.md needs parts `[MODERATE]`

DESIGN.md line 258:

> The currency mark `৳` is a **separate span at reduced emphasis**: the seller is reading the quantity, not the currency.

Restated at line 295 ("Money element — tabular figure with the currency mark de-emphasised") and line 302 (the cash-strip cell). A formatted string cannot carry a span. AD-17 (line 206) gives `localization` ownership of "digit, currency and date formatting" and AD-4 (line 128) says "React performs no arithmetic on money — it formats what it is given", so the contract is the only place this can be solved — and it must be solved once, because AD-16's WeasyPrint templates render the same money element and the same span (DESIGN.md's figure rules do not stop at the browser).

**Required (small but real):** AD-17's contract returns *structured parts* — currency mark, integer digits with grouping, fractional digits, sign — not one string, so both the React `Money` component and the `templates/documents/` markup can mark up the mark separately from the magnitude. DESIGN.md line 295 also requires negatives take "red plus an explicit minus sign, never parentheses", which is a formatter-level decision belonging in the same contract.

Related, and worth an `[ASSUMPTION]` in the spine rather than a finding: DESIGN.md's `money` typography token (lines 104–108) and line 299 require tabular figures "in either script". `font-variant-numeric: tabular-nums` is specified for lining figures; whether Hind Siliguri ships tabular Bengali numerals is not something to assume, and a column of Bangla digits that jitters as values change breaks the ledger read that DESIGN.md line 258 exists for. This should be verified at the same time as F11.

### F11 — Two Bangla web-font families are undeclared `[MODERATE]`

DESIGN.md typography (lines 60–108, 250–253) is built on **Hind Siliguri** (UI voice, 6 of 9 steps) and **Noto Serif Bengali** (display voice), with named Latin fallbacks chosen to hold editorial weight. `prototype/css/tokens.css` lines 84–85 declares both stacks and `prototype/index.html` lines 7–9 loads them from the Google Fonts CDN with a blocking `<link>`.

The spine's font decisions are all server-side: AD-16 (line 200) commits to "One font file, one shaping stack, Pango with HarfBuzz" for PDF, and the Dockerfile line (358) carries "Pango, HarfBuzz, fontconfig, **the Bangla font**" — singular, for WeasyPrint. Nothing addresses the browser. Two consequences:

- **AD-16's own argument applies to the web too and is not made.** AD-16 exists because "Two renderers means two font stacks and two shaping paths, and conjuncts come out correct in the invoice and broken in the summary card". A different family in the browser than in the PDF is that same defect across the web/document seam — the seller compares the on-screen figure against the printed slip.
- **Delivery is unaddressed on the constrained path.** Two Bangla families are heavy, and a blocking CDN stylesheet on EXPERIENCE.md line 24's intermittent connection is exactly the wrong shape — it also compounds F2's cold open, where the whole point is that something renders before the server answers. Self-hosting through Vite is the likely answer, which needs the static-asset strategy F2 also asks for.

**Required:** name both families in the Stack table, state that the web and the PDF share the family (AD-16's argument extended), and decide self-hosted-via-Vite vs CDN. Verify tabular Bengali numerals at the same time (F10).

### F12 — No shared-props or persistent-layout layer `[MODERATE]`

The spine's only front-end structural rule is line 230: "One React page component per Inertia page, `PascalCase`, at `frontend/pages/<module>/<Page>.tsx`". Nothing describes what sits *around* a page, but both UX spines put a lot there:

- DESIGN.md line 307: the desktop sidebar carries "grouped nav (Work · Catalogue · Money · Insight · System), **counts and warning badges inline**, the current Member and Role pinned to the foot."
- DESIGN.md line 308: the phone tab bar's fifth slot is Courier & COD or Customers **depending on the Role**, and the raised capture action is **absent** for a Role that may not see a selling price.
- EXPERIENCE.md line 149: money nav items are *removed*, not disabled.
- EXPERIENCE.md line 280: "the sidebar keeps place" across navigation.

So navigation chrome is Role-derived, count-bearing, and must persist across visits — which under Inertia means a persistent layout fed by shared props from Django middleware. The spine names neither. Two things follow if it stays unnamed:

- Each of ~58 page views assembles its own nav props, and they diverge — the failure AD-1 is written to prevent, occurring in the presentation layer where AD-1 does not reach.
- The sidebar's badge counts are derived (EXPERIENCE.md line 131: "Every count beside a figure is derived from the same records as the figure"), so every page pays for the badge queries on every request, with nothing cached (Deferred line 386) — an NFR-14 exposure that should at least be acknowledged.

**Required:** one Consistency Conventions row: a persistent layout component; nav, Member, Role, language and badge counts arrive as Inertia shared props from one middleware; the shared-prop builder calls AD-3's capability function so nav filtering and payload filtering cannot disagree.

**Adjacent, and a real AD-3 gap.** EXPERIENCE.md line 152:

> **The Dashboard's attention list is one list, filtered.** Money items are flagged and dropped for gated Roles; the two cards are never authored separately, because two copies of the same counts are how they drift apart.

AD-3 filters *fields* ("A money field a Role may not see is never serialised"). Here whole *rows* must be dropped, and — because of line 131 — the count must be derived **after** the Role filter, or a gated Role reads "3 decisions" above 2 rows. DESIGN.md line 303 adds that the card is **absent**, not empty, when nothing remains, which means the filter can empty the list to zero and the layout must handle that. AD-3's rule text should cover row-level omission and post-filter count derivation explicitly, since a field-level reading of AD-3 passes a payload with the wrong count in it.

### F13 — IA → source tree: the mirror rule cross-cuts the five nav groups `[MODERATE]`

Line 230 places pages at `frontend/pages/<module>/<Page>.tsx` and line 351 says `pages/` mirrors `apps/`. EXPERIENCE.md organises the same surfaces into five nav groups. The two taxonomies cross-cut, and in several places the mirror rule has nowhere to put a screen:

- **Process flows** (EXPERIENCE.md line 98 — "The three state machines, drawn: order to cash end to end, order statuses, and settlement", a sidebar destination, `flows` in the prototype at `screens-system.js` line 508) has **no owning module** among the fifteen and **no row** in the Capability → Architecture Map (lines 364–380). It is a real screen with real content, and it currently belongs to nobody.
- **Onboarding's seven surfaces** (lines 32–42) span `accounts` (splash, sign in, verify), `tenancy` (create business, invite team) and `catalog` (seed catalogue) — a single chromeless flow, "outside the app shell entirely" per line 30, scattered across three page directories with no shared home for the flow's own state.
- **Daily summary card** is reached from the Dashboard (`money`) but is produced by `documents` (Capability map line 379).
- **Settings → AI assistant** (line 97) sits in the System nav group but is `insights`' configuration (AD-12's disableable assistant, EXPERIENCE.md line 173).
- **Ask SmartBiz** sits under a group header that reads "**Insight** — requires `money: full`" (line 85) while the row immediately below says "**Every Role** reaches this screen" (line 89). A capability function derived from a group-level money rule gates it wrongly. (This is an EXPERIENCE.md defect — see D2 — but AD-3 is what will inherit it.)

None of this is fatal; it is a navigability cost that compounds over 58 files. **Suggested (light):** keep the `apps/` mirror for the 15 modules, but state that a surface's directory is its *owning module*, not its nav group, and add the two missing homes — `flows` under a module (`audit` or a small `system` page group) with a Capability-map row, and an `onboarding` page group for the seven chromeless surfaces. Also worth one sentence: 58 Inertia pages is the real count, against the prototype's 24 handlers, so the wizard-shaped groups (capture, settlement, import) are where F5 and F6 land.

### F14 — Accessibility floors: no AD, no required test `[MAJOR]`

The word "accessibility" does not appear in ARCHITECTURE-SPINE.md. EXPERIENCE.md's Accessibility Floor (lines 260–271) states eight behavioural requirements and DESIGN.md states the visual ones; the spine inherits them at line 54 and then never mentions them. Four have no mechanism and no test:

- **Tap targets ≥ 44px** (EXPERIENCE.md line 266, "including chips in dense list rows"). This one also has a *conflict* with DESIGN.md, inherited unresolved: DESIGN.md line 299 specifies the quantity stepper's buttons at **32px** and its `sm` variant at **26px**, and line 162 gives chips `{spacing.1} {spacing.3}` padding at `{typography.xs.fontSize}` — nowhere near 44px. The prototype does not resolve it either: the only 44px in its CSS are one icon button (`screens.css` line 582) and the sheet grabber (`app.css` line 514), while `screens.css` line 1187 sets `min-height: 26px`. So the floor is asserted, contradicted by the component specs, unmet in the reference implementation, and unenforced in both harnesses. Either the hit area extends beyond the visual box — the standard resolution, and it should be stated as the rule — or one of the two documents is wrong.
- **Focus ring on every interactive element, never suppressed** (EXPERIENCE.md line 248), **focus is an outline and never a border recolour** (line 270), with DESIGN.md line 244 giving the exact token and the measurement that motivated it ("The halo this replaced measured 1.00:1 against the canvas").
- **`role` and state announced** — `aria-pressed` / `aria-checked` on exclusive choices and toggles (line 264), and line 265's paired rule: "A state that is styled must be reachable, and a state that is reachable must be styled. A modifier class with no rule behind it is an accessibility defect, not a cosmetic one." `classes.js` lines 100–108 is the only thing that has ever enforced this, over every route × Role × language × device.
- **`prefers-reduced-motion` collapses all three durations to 1ms** (line 268, DESIGN.md line 141).

Under line 238, tests exist only where an AD says "a test asserts". None does, for any of the above. Playwright covers "Hero flows", which touches a handful of the 58 routes in one Role and one language.

**Required:** fold these into F4's new AD (or a sibling) with "a test asserts" clauses, and resolve the 44px/32px/26px conflict explicitly. **Epic-owned:** the per-component `aria` wiring and focus management itself — but the *floor* and its enforcement belong in the spine, because five separate epics will otherwise each decide how much of it to do.

---

## B. Findings an epic or the code will own

Listed so they are not mistaken for spine gaps. Each is genuinely a code-level concern under an invariant the spine already sets.

1. **Empty states.** DESIGN.md line 291 (52px icon tile, cause at h3, explanation held to `34ch`, then the resolving action) and EXPERIENCE.md line 228. Note DESIGN.md's clause "This is also the surface a gated Role sees, which is why it **must never look like an error**" — the component is shared with F3's locked explanation, worth naming in the component epic.
2. **List-row descendant-selector trap.** DESIGN.md lines 290 and 330: row typography must target direct children only, or the nested status chip is forced to `display: block` and stretches the row. A real defect with a stated cause; belongs in the component's implementation and, ideally, a visual test.
3. **Exclusive tile pair invariants.** DESIGN.md line 300 ("Exactly one is marked — a pair with both marked or neither is a defect, not a state") and EXPERIENCE.md line 226. Component-level, plus the `aria-checked` wiring from F14.
4. **Filter chips: always exactly one active**, count reflected immediately (DESIGN.md line 301, EXPERIENCE.md line 227).
5. **Cash strip: never five cells** (DESIGN.md line 302), four named cells (EXPERIENCE.md line 215), `9.75rem` minimum with horizontal scroll rather than compression.
6. **Banned interactions** (EXPERIENCE.md line 258): carousels on money surfaces, auto-advance, count-up animation on a figure, infinite scroll without a total, modal-on-modal, celebratory animation. Code-level, though "modal-on-modal" is worth encoding in F6's shared `Sheet` component (DESIGN.md line 331, EXPERIENCE.md line 222: one level deep, never stacked).
7. **Long-press unassigned** (EXPERIENCE.md lines 217, 257).
8. **Voice and tone** (EXPERIENCE.md lines 102–121). Microcopy, owned by the epics writing it — but note it constrains AD-17's catalogues, since "A number is never presented without its status" (line 119) means the msgid itself carries the basis word, which is why the `Money` component of F4c and the string catalogue have to agree.
9. **Part-of-day naming** — রাত / সকাল / দুপুর / বিকাল / সন্ধ্যা split at 6, 12, 15, 18, 20 rather than at a mechanical midpoint (EXPERIENCE.md line 157). Implementation detail *inside* `localization`, correctly placed by AD-17; noted only because the boundaries are specified and unusual, and a developer reaching for a library will get AM/PM or a midpoint split.
10. **Extraction fills only what it found** (EXPERIENCE.md lines 205–207), including the sharp sub-rule that an axis naming two values comes back *unresolved* rather than resolved by the scanner's iteration order. AD-12 correctly places the parser in `orders` (line 338, "capture and rule-based parser"); the no-guessing rule is that epic's core acceptance criterion and does not need an AD.
11. **Responsive breakpoints and the desktop measure** (EXPERIENCE.md lines 277–283, DESIGN.md line 266). CSS-level once F4 gives tokens a home.

---

## C. Where the spine already discharges the UX spines well

Recorded because a reconciliation that lists only gaps misrepresents the document.

- **AD-8** (lines 148–152) is the single best piece of alignment in the spine. The inseparable `(value, basis, completeness)` triple mechanises EXPERIENCE.md lines 127–131 more strongly than they asked — "a caller cannot obtain the value alone" makes DESIGN.md line 293's "Accompanies every figure" structurally difficult to violate rather than merely required. Its "no `profit` column exists anywhere" and single-function rule discharge EXPERIENCE.md line 131 ("Every count beside a figure is derived from the same records as the figure") and the Flow 2 climax at line 310 exactly.
- **AD-10** (lines 160–164) matches EXPERIENCE.md lines 192–197 clause for clause: seven operations, compensating writes, never a mutation, reversal is itself an audit entry, the original stays visible. The registry in `audit` also gives EXPERIENCE.md line 193's three entry points one implementation.
- **AD-9** (lines 154–158) — one service call, one transaction, one Audit Entry, no signals — is what makes EXPERIENCE.md line 197's "audit trail is a first-class destination" true rather than aspirational.
- **AD-15** (lines 190–194) is better than asked for. EXPERIENCE.md line 242 wanted routing labelled as classification, not computation; AD-15's staged deadlines (3s route / 3s compute / 3s phrase, enforced in the adapter) produce precisely that separation and bound it at nine seconds.
- **AD-14** (lines 184–188) discharges EXPERIENCE.md line 166 and DESIGN.md line 235 ("Violet never touches a figure") with a mechanism the UX spines did not propose: validating that every numeral in the model's text appears in the supplied figure set, falling back to templated phrasing. That is the trust rule made checkable.
- **AD-16** (lines 196–200) is the right call for DESIGN.md's Bangla-first typography, and its reasoning about conjunct formation across two renderers is the same reasoning F11 asks it to extend one step further.
- **AD-12** (lines 172–176) matches EXPERIENCE.md lines 201–204 including the teal provenance requirement's substance — "Every port ships a fallback that is a first-class surface, not an error state: simulated courier, copy-this-link invitation, button list with templated Bangla phrasing, no-OCR manual entry" — and the "full pass with every optional adapter absent, and it must be green" clause is the strongest test requirement in the document.
- **AD-4** (lines 124–128) anticipates a failure DESIGN.md and EXPERIENCE.md did not think to name: money crossing JSON as a string so a client-side sum cannot produce `1234.5499999999999` under a basis pill. That is the money-truth thesis defended at a layer the UX spines could not see.

---

## D. Internal UX-spine tensions the architecture inherits — do not let the spine resolve these silently

Three conflicts live *inside* DESIGN.md and EXPERIENCE.md. The architecture currently inherits all three without noticing, and in each case the risk is that a developer resolves it by accident.

**D1 — 44px vs 32px/26px.** EXPERIENCE.md line 266 sets a 44px tap-target floor "including chips in dense list rows"; DESIGN.md line 299 specifies 32px and 26px stepper buttons and line 162 gives chips sub-44px padding. See F14. Needs a stated resolution (extended hit area is the obvious one).

**D2 — Insight is `money: full` and also open to every Role.** EXPERIENCE.md line 85 heads the group "**Insight** — requires `money: full`"; line 89 says of Ask SmartBiz "**Every Role** reaches this screen; the list is filtered to the questions whose answer the Role may read"; line 170 repeats it ("Asking is granted to all five Roles, so the surface is never gated"); PRD line 1375 grants the row to all five and line 1391 explains why. The group header is simply wrong, but it is the line an AD-3 implementation reading the IA top-down will encode. Fix in EXPERIENCE.md; note in the spine.

**D3 — Bangla digits inside identifiers.** EXPERIENCE.md line 156 says numeric IDs convert; the architecture's line 232 writes `ORD-1042`; the prototype harness exempts them. See F8. This one must be decided, not inherited, because all three positions are currently live in artifacts that all claim authority.

---

## Appendix — line-number index

**ARCHITECTURE-SPINE.md:** inheritance rule 45; §6.2 inherited 51; DESIGN.md inherited 54; EXPERIENCE.md inherited 55; AD-1 60–64; AD-3 118–122; AD-4 124–128; AD-8 148–152; AD-9 154–158; AD-10 160–164; AD-12 172–176; AD-14 184–188; AD-15 190–194; AD-16 196–200; AD-17 202–206; AD-18 208–212; AD-20 220–224; one-page-per-Inertia-page 230; typed constants 231; identifiers 232; error shape 235; tests 238; Stack 243–258; envelope 289; ER diagram 295–323; source tree 329–360; `frontend/` 350–352; `tests/` 355–357; Capability map 364–380; Deferred 382–392 (caching 386, variant key 391).

**DESIGN.md:** frontmatter tokens 10–201; typography 60–108; spines win over prototype 206; tokens.css normative 208; palette meanings 228–237; contrast floors 239–244; ruled-line exemption 243; amber/brass rule 246; eyebrow and figure rules 255–258; layout 264–268; components 289–309 (empty state 291, basis pill 293, completeness 294, money 295, stepper 299, tile pair 300, chips 301, cash strip 302, attention list 303, sheet 305, sidebar 307, tab bar 308); don'ts 321–331 (Latin digits 325, colour-only 328, ruled-line text 329, descendant selector 330, stacked sheets 331).

**EXPERIENCE.md:** 58 routes 16; multi-surface 22; seller conditions 24; IA 28–100 (onboarding 32–42, pack slip 61, Insight header 85, Ask SmartBiz 89, closure and depth 100); voice 102–121; Money Truth 123–131; Role gating 133–152 (matrix-not-ladder 137, ladder table 139–144, Packer deviation 145, absence 149, locked surface 150, pack slip 151, one filtered list 152); Bangla and numerals 154–160; Assisted Intelligence 162–188 (eleven outcomes 168, numbering 170, withheld 171, the ten 177–188); Reversal 190–197; Degraded transports 199–207; Component patterns 209–228; State patterns 230–248 (first run 234, cold open 235, nothing to decide 237, gated 239, offline 240, slow transport 241, routing 242, refused 243, withheld 244, unavailable 245, focus 248); Interaction primitives 250–258; Accessibility 260–271 (styled↔reachable 265, 44px 266, focus order 267, reduced motion 268, focus outline 270, colour-never-alone 271); Responsive 273–285; Flows 287–356 (cache 293/300, mapping 306–307, parse 318–320, refusal 332, provider down 334, packer 346–355).

**prototype:** `js/app.js` 106–173 (58 routes); `js/data.js` 14–20 (Roles), 22–27 (derived initials); `css/tokens.css` 84–85 (font stacks); `index.html` 7–9 (CDN fonts); 24 screen handlers across `js/screens-*.js`; 21 sheet opens.

**prototype/tests:** `contrast.js` 17–36 (tokens), 64–77 (floors), 79–89 (ruled-line inverse floor), 91–106 (why static), 107–138 (source scan; regex 119), 178–185 (`MUST_CHECK`), 192–202 (amber/brass), 204–223 (spine drift). `classes.js` 100–108 (styled↔reachable). `truth.js` 13–15 (why absence), 26–35 (`LATIN_OK`), 42 (`SLIP`), 111–138 (gating sweep), 147–148 (`CAN_AUDIT`/`CAN_ASK`), 162–170 (query ordinals), 182–203 (Latin-digit sweep), 189 (import exemption).

**PRD §6.2:** five Roles 105; matrix 1353–1385 (Sales Staff no import 1356, transitions 1358, Inventory Staff cost 1365, no margin 1369, all Roles ask 1375, Manager no audit 1378, Role change 1384); assistant grants no visibility 1391; four deliberate consequences 1399–1402 (transition-level 1401).
