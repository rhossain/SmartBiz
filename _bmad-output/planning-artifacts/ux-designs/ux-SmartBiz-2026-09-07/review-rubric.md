# Spine Pair Review — SmartBiz

## Overall verdict

The updated pair is source-extractable and implementation-ready under all eight rubric categories. Former flow, token, component, state, vocabulary, Role-gating, and visual-reference findings are closed; every load-bearing reference checked resolves, and the prototype and story catalog pass their full verification gates.

## 1. Flow coverage — strong

The PRD defines exactly nine journeys: `UJ-0`, `UJ-1`, `UJ-1a`, and `UJ-2` through `UJ-7`. EXPERIENCE.md now preserves all nine identifiers and titles verbatim. Each Key Flow names Rehana (and Sumi where delegation requires a supporting Member), contains six numbered steps, includes an explicit **Climax**, and closes with an `Edge:` failure or degradation path (`prd.md:65–94`; `EXPERIENCE.md:350–451`).

### Findings

No findings.

## 2. Token completeness — strong

DESIGN.md frontmatter parses successfully. All 49 color tokens are literal six-digit hex strings, including `realized`, `earned`, and `incomplete`; all 87 unique token references in DESIGN.md and all five in EXPERIENCE.md resolve to defined frontmatter paths. Contractual viewport, hit-area, empty-state, stepper, selection-border, and icon dimensions are tokenized. Contrast targets are stated for text, inverted text, large/small semantic hues, control boundaries, focus, and amber/brass non-color redundancy (`DESIGN.md:1–225, 259–266`).

### Findings

No findings.

## 3. Component coverage — strong

The pair exposes 27 canonical names: two presentation-only catalog constructs and 25 runtime components. The names and order match exactly between DESIGN.md.Components and EXPERIENCE.md.Component Patterns, and every entry carries substantive visual and behavioral rules. DESIGN.md also maps implementation token-group names such as `sheet`, `completeness`, and `button-primary` back to the canonical human names, preventing variant keys from competing with component identity (`DESIGN.md:309–345`; `EXPERIENCE.md:219–258`).

### Findings

No findings.

## 4. State coverage — strong

Global patterns cover first run, credential recovery, cold load, empty lists, capability gating, local-draft resilience, optional dependencies, assisted states, unresolved variance, reversal, and focus. The surface-family closure matrix then walks every IA family across loading, empty, validation/error, offline, and permission columns, using explicit non-applicability marks rather than silent omissions (`EXPERIENCE.md:260–301`). Story-specific copy and addressable variants are delegated to the mockup catalog without replacing the behavioral contract.

### Findings

No findings.

## 5. Visual reference coverage — strong

The visual set contains 24 files under `mockups/`; `imports/` is empty and `wireframes/` is absent. Both spines link the authoritative `mockups/all-screens.html`, delegate catalog mechanics and support-file roles to the catalog README, classify archived visuals through the linked archive, and state that either spine wins over current or archived visuals. The live visual, support mechanics, and historical files therefore have distinct authority without implying that each archived PNG is a current implementation reference; the 76-story manifest gate passes (`DESIGN.md:226, 315–316`; `EXPERIENCE.md:15–19, 223–229`; `mockups/README.md:1–46`; `mockups/archive/README.md:1–5`).

### Findings

No findings.

## 6. Bloat & overspecification — strong

The pair is detailed because the product has unusually load-bearing money, Role, localization, reversal, degradation, and responsive rules. The update moved catalog mechanics to the README, tokenized recurring dimensions, separated presentation constructs from runtime components, and uses compact matrices for IA, components, states, and responsive behavior. The repeated six-step Key Flow shape is functional traceability rather than decorative narrative.

### Findings

No findings.

## 7. Inheritance discipline — strong

Both spines carry the same three source paths and all resolve. Exact Order Status, Collection Status, and COD Custody Status vocabularies match the PRD; the phone Tab bar has an exact per-Role map; generated numbers localize while human-readable identifiers remain Latin per AD-17; Stock count is absent; and the IA reproduces FR-63's closed 15-type audit set exactly. The explicit Insight Query × Role matrix now derives non-money capabilities as well as figure visibility from PRD §6.2: Inventory Staff receive queries 3 and 8 only, query 4 is withheld because Customer viewing is denied, and the same decision applies to the visible list, routed answer, direct action, and endpoint (`EXPERIENCE.md:176–213`). Cross-spine component identities and token references are stable.

### Findings

No findings.

## 8. Shape fit — strong

DESIGN.md contains every canonical section in the locked order: Brand & Style, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, and Do's and Don'ts. EXPERIENCE.md contains every default section, plus Responsive and Platform for its multi-viewport contract and Inspiration & Anti-patterns for its declared reference and rejection set. Its six product-specific law sections earn their place by centralizing decisions that downstream consumers cannot safely infer.

### Findings

No findings.

## Mechanical notes

- YAML frontmatter for both spines parses successfully; required name/description fields are present; both statuses are `final`; source lists are identical and every source path resolves.
- Journey extraction: PRD 9, EXPERIENCE.md 9, exact title misses 0, extras 0; every flow has six numbered steps, a climax, and an edge path.
- Token extraction: 49 color tokens, non-hex colors 0; 87 unique DESIGN.md references and five unique EXPERIENCE.md references, unresolved 0.
- Component extraction: 27 DESIGN.md names and 27 EXPERIENCE.md names, missing in either direction 0.
- All Markdown local-file links in both spines resolve. No Mermaid blocks are present.
- Exact source checks passed for the eight Order Status values, three COD Custody Status values, three Collection Status values, Role-composed phone tabs, AD-17 identifier exemption, and FR-63's closed audit set.
- `node mockups/verify-coverage.js` passes: 76/76 stories, responsive contracts, variants, and 228 in-frame proofs.
- Role-gate verification explicitly asserts Owner/Manager/Sales capture allowed, Accountant/Inventory capture refused; exact per-Role Insight Query IDs; Inventory Staff list `3, 8`; and a routed/direct query 4 action resolving to the Role-withheld state.
- `npm test` in `prototype/tests/` exits 0: smoke, auth/zero-setup, truth, flows, class coverage, contrast (49 colors, no drift), and 76/76 story coverage all pass.
- Finding counts: **critical 0 · high 0 · medium 0 · low 0**.
