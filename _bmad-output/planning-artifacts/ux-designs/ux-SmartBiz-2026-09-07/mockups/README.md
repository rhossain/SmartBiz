---
name: SmartBiz BD mockups
description: Authoritative story-to-screen contract for every story in epics.md.
status: final
created: 2026-09-08
updated: 2026-09-12
---

# Authoritative mockup catalog

Open [all-screens.html](all-screens.html) directly in a browser. It contains exactly 76 story frames across 12 epics. A green coverage card is read from the generated `coverage-manifest.js`; the browser never infers or self-asserts coverage.

Run the gate before review or implementation:

```sh
node verify-coverage.js
```

The gate fixes the contract at 76 stories and verifies unique planned/designed IDs, exact title parity, epic consistency, enums, both responsive modes, shell type, action behavior, application/mockup/prototype route semantics, addressable variants, and exactly three structured in-frame proofs per story. Application routes may repeat when several story states belong to the same product surface.

## Contract fields

| Field | Meaning |
| --- | --- |
| `primaryMode` / `secondaryMode` | Review priority only; both are views of the same responsive route and codebase |
| `responsive` | Required behavior between the 360px acceptance floor and desktop |
| `shell` | `onboarding` (chromeless), `app` (Role-composed navigation), or `proof` |
| `appRoute` | Planned route inside the real application; repetition is allowed |
| `mockupHash` | Canonical catalog address: `#story/{id}` |
| `prototypeJourneyUrl` | Downstream prototype reference: `prototype/index.html#/journeys/{id}` |
| `actionModel` | Commit, navigation, inspection, or export; only commits receive a sticky footer |
| `variants` | Addressable states under `#story/{id}/{variant}`; add `/phone` or `/desktop` to inspect either viewport |
| `proofs` | Exactly three stable IDs rendered inside the device frame as `data-proof-id` locators |

The catalog is Bangla-first. Latin identifiers may remain Latin; ordinary quantities, money, dates, and times use Bangla digits. Phone frames include the Role-composed bottom tab bar and desktop frames use the 244px five-group rail. Story 5.2 owns the addressable Inventory Staff pack-slip handoff exception: items, address, and COD amount are visible while Purchase Cost and margin remain absent.

## Authority and sequence

1. Revise `screen-map.js` and the story-specific renderer.
2. Run `node verify-coverage.js` to regenerate `coverage-manifest.js`.
3. Review both primary and parity viewports and every required variant.
4. Only then implement the corresponding application route in `prototype/` or production code.

`DESIGN.md` owns visual rules and `EXPERIENCE.md` owns cross-screen behavior. This catalog owns story-specific state, action, route, and visible acceptance evidence. If implementation exposes a problem, update the upstream contract and rerun the gate.

## Archive

[`archive/`](archive/) contains pre-contract screenshots and the obsolete journey-hub concept. They use earlier Role names, information architecture, and story groupings. They are retained only for visual-history reference and are **non-authoritative**: do not implement from them, cite them as coverage, or use them to resolve a conflict.
