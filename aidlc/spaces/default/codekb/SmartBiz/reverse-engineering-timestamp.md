# SmartBiz BD — Reverse-Engineering Timestamp

## When

- **Date:** 2026-10-04 (AI-DLC link-2 architect synthesis).
- **Source commit (git):** `d267dddfa48d1225f718bbaeda992e326cdb88cc`
- **Snapshot fingerprint (`source_fingerprint`):** `git:d267dddfa48d1225f718bbaeda992e326cdb88cc`
- **Store generation (`store_generation`):** `none` (this is the first hand-off; nothing to compare against).
- **Scope / depth:** mvp / Standard.

## How

The AI-DLC reverse-engineering pipeline has two links: the developer code scan (link 1) and the architect synthesis (link 2).

- **Link 1 (developer scan)** ran end-to-end against `prototype/` and produced `aidlc/spaces/default/intents/261004-mvp/inception/reverse-engineering/developer-scan.md` — a 1 245-line file inventory + 12-section qualitative read.
- **Link 2 (this artifact)** re-verified the developer's findings against the prototype, then authored nine codekb artifacts into the staging directory `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/`. The publish step swaps them into `aidlc/spaces/default/codekb/SmartBiz/`.

The mint step was run to derive the fingerprint:

```
$ aidlc engine workspace codekb-scope-diff --repo SmartBiz --mint --paths ./prototype/
d267dddfa48d1225f718bbaeda992e326cdb88cc
```

The first-run NO_STORE diagnostic confirms this is the inaugural scan:

```
$ aidlc engine workspace codekb-scope-diff --repo SmartBiz
NO_STORE: no reverse-engineering-timestamp.md at aidlc/spaces/default/codekb/SmartBiz/ - first scan, nothing to compare.
```

## What was analyzed

Every file in `prototype/` was inventoried (11 JS files, 3 CSS files, 1 entry HTML, 1 tests README, 1 tests package.json, 1 tests .gitignore, plus `tests/node_modules/` (resolved deps) and `tests/shots/` (gitignored output)). 24 files were read in full; 2 CSS files were surveyed with Grep for class surface; 2 test harnesses were sampled for patterns beyond what the developer scan had already covered.

**Patterns picked up that the developer scan did not flag:**

1. `App.go(path, replace)` does not validate `path` — relies on the chrome dropdown + sidebar to feed only valid routes. A hand-typed `#/not-a-route` shows the roleLock state if a `screen` is registered with that name (it isn't) or a "Not found" empty state. The empty state is good UX; the roleLock-on-unknown-route is a class of bug waiting to happen.
3. `nearer(target, actEl, goEl)` (app.js line 332–340) is subtle — when both `[data-go]` and `[data-act]` match, the action wins if the action is the nearer ancestor. This is the right default but a single misnested button can produce surprising behaviour.
4. The `screen-map.js` mockup contract is loaded by URL (`index.html` line 66, relative path `../_bmad-output/...`). Moving the prototype will break the loading.
5. The Bangla numbers in `App.ago()` default to `'2026-09-07'` if `App.TODAY` is unset (`i18n.js` line 86) — the same value as the data, but the silent default is fragile.
6. The `parseMessage` Bangla-digit normalisation is subtle (`screens-orders.js` line 144 + line 250) — the kind of code that will break silently if someone refactors the variant axes.

These observations are recorded in the relevant artifacts (`code-quality-assessment.md §6.13`, `architecture.md §"What this architecture is *not*"`, `dependencies.md §3`).

## What was NOT analyzed

- `_bmad-output/planning-artifacts/ux-designs/ux-SmartBiz-2026-09-07/mockups/screen-map.js` — referenced by `prototype/index.html` line 66 and consumed by `prototype/tests/story-coverage.js` line 13. This is an **authoritative design contract** owned by the mockup set, not the prototype. Only the head of `screen-map.js` was opened to confirm it exports a `RAW_SCREENS` array of 76 stories.
- `_bmad-output/planning-artifacts/epics.md` — read by `tests/story-coverage.js`; treated as a peer authoritative contract.
- `prototype/tests/node_modules/` — listed to confirm `jsdom@^29.1.1` and `ws@^8.21.3` are the resolved packages; `package-lock.json` not opened beyond confirming versions.
- `prototype/tests/shots/` — gitignored; not opened.
- `prototype/css/app.css` and `prototype/css/screens.css` past the first ~100 lines — structure surveyed via Grep, not line-by-line.
- `prototype/tests/flows.js` sections 4–7 — pattern-matched only; sections 1–3 read in detail.
- `prototype/tests/truth.js` past section 6 — the first six sections were read in detail; the file's tail was skimmed.

## Artifact map

| # | Artifact | Path |
|---|---|---|
| 1 | Business overview | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/business-overview.md` |
| 2 | Architecture | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/architecture.md` |
| 3 | Code structure | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/code-structure.md` |
| 4 | API documentation | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/api-documentation.md` |
| 5 | Component inventory | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/component-inventory.md` |
| 6 | Technology stack | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/technology-stack.md` |
| 7 | Dependencies | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/dependencies.md` |
| 8 | Code quality assessment | `aidlc/spaces/default/intents/261004-mvp/.aidlc-engine/codekb-SmartBiz/code-quality-assessment.md` |
| 9 | Reverse-engineering timestamp | (this file) |

---

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: 261004-mvp
fingerprint: d267dddfa48d1225f718bbaeda992e326cdb88cc
analyzed:
  paths:
    - ./prototype/
  components:
    - ./prototype/index.html
    - ./prototype/css/tokens.css
    - ./prototype/css/app.css
    - ./prototype/css/screens.css
    - ./prototype/js/i18n.js
    - ./prototype/js/data.js
    - ./prototype/js/ui.js
    - ./prototype/js/app.js
    - ./prototype/js/screens-core.js
    - ./prototype/js/screens-orders.js
    - ./prototype/js/screens-catalog.js
    - ./prototype/js/screens-money.js
    - ./prototype/js/screens-system.js
    - ./prototype/js/screens-journeys.js
    - ./prototype/tests/README.md
    - ./prototype/tests/package.json
    - ./prototype/tests/.gitignore
    - ./prototype/tests/boot.js
    - ./prototype/tests/smoke.js
    - ./prototype/tests/auth-zero.js
    - ./prototype/tests/truth.js
    - ./prototype/tests/flows.js
    - ./prototype/tests/classes.js
    - ./prototype/tests/contrast.js
    - ./prototype/tests/story-coverage.js
    - ./prototype/tests/shot.js
    - ./prototype/tests/measure.js
    - ./prototype/tests/package-lock.json
    - ./prototype/tests/node_modules/
    - ./prototype/tests/shots/
fingerprint: d267dddfa48d1225f718bbaeda992e326cdb88cc
```

## Mint command output (verbatim)

```
$ aidlc engine workspace codekb-scope-diff --repo SmartBiz --mint --paths ./prototype/
d267dddfa48d1225f718bbaeda992e326cdb88cc
```

## Sources

- `[dev-scan]` — developer code scan handoff at `aidlc/spaces/default/intents/261004-mvp/inception/reverse-engineering/developer-scan.md`
- `[prototype:index.html]` — entry HTML, presentation chrome, load order, `screen-map.js` import path (line 66)
- `[prototype:js/i18n.js]` — `App.TODAY` default fallback (`i18n.js` line 86)
- `[prototype:js/app.js]` — `App.go` (line 28–32), `nearer` (line 332–340)
- `[prototype:js/screens-orders.js]` — `parseMessage` Bangla-digit normalisation (line 144, 250)
- `[prototype:tests/story-coverage.js]` — line 13 references `_bmad-output/.../screen-map.js`
- `[scope-md §5.1–§5.9]` — module scope
- `[intent-backlog]` — MoSCoW + dependency-first sequencing
- `[code-quality-assessment]` — concerns not flagged by the developer scan (§6.13)
- `[architecture]` — "What this architecture is *not*" section
- `[dependencies]` — §3 build-time/design-contract dependencies