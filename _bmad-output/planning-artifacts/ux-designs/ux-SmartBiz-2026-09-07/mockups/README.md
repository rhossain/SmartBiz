---
name: SmartBiz BD mockups
description: Authoritative story-to-screen design catalog for every story in epics.md.
status: final
created: 2026-09-08
updated: 2026-09-11
---

# Mockups

This folder is the design authority for story-to-screen work. Open [all-screens.html](all-screens.html) directly in a browser. It provides a presentation hub and one addressable design frame for each of the **76 stories across 12 epics**.

The sequence is deliberate:

1. Define or revise the screen in `screen-map.js` and the mockup catalog.
2. Run `node verify-coverage.js`; the result must be 76/76 with exact `epics.md` title parity.
3. Only after that gate passes may the corresponding route be implemented in `prototype/`.

`screen-map.js` is the source of truth for each story's target surface, viewport, presentation state, primary action, and three visible proof points. Hash routes such as `all-screens.html#story/4.12` make every frame directly presentable. The generated [journey hub concept](journey-hub-concept.png) records the approved visual direction; the browsable catalog carries the exact copy and complete coverage.

## Coverage artifacts

| Artifact | Purpose |
| --- | --- |
| `all-screens.html` | Browsable presentation hub and all 76 story frames |
| `screen-map.js` | Authoritative story-to-screen contract |
| `mockups.css` / `mockups.js` | Warm Ledger responsive presentation rendering |
| `verify-coverage.js` | Exact comparison of the design map with `epics.md` |
| `journey-hub-concept.png` | Visual exploration used to set the catalog direction |

The older PNG captures remain useful records of individual product states, but they are no longer the coverage index. When a still, prototype route, or implementation disagrees with this catalog, [DESIGN.md](../DESIGN.md), or [EXPERIENCE.md](../EXPERIENCE.md), update the downstream artifact rather than silently changing the design contract.

## Presentation paths

- Start at the hub and select any epic or search a story.
- Use “Present from start” to walk Story 1.1 through Story 12.5 in order.
- Use the previous/next controls to keep the presentation linear.
- Each frame states its planned prototype route and shows synthetic data explicitly.

System stories are not hidden. They use a visible **proof surface** showing the testable assurance—tenant isolation, capability enforcement, rendering, recognition basis, completeness, and safe-answer validation—so every story has something concrete to present.
