# Refined Mockups — Questions

> Brownfield run (SmartBiz BD). Refining the 10 rough wireframes from
> `ideation/rough-mockups/` into mid-fidelity mockups with explicit
> interaction specs, design-system mapping, and accessibility
> checklist. Anchored to the 39 user stories in
> `inception/user-stories/stories.md` and the 12 FR clusters / 8 NFR
> clusters in `inception/requirements-analysis/requirements.md`.

## Sources

- [wireframes] `aidlc/spaces/default/intents/261004-mvp/ideation/rough-mockups/wireframes.md` — 10 rough screens
- [user-flow] `aidlc/spaces/default/intents/261004-mvp/ideation/rough-mockups/user-flow.md` — happy path + state matrix
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories / 3 epic families
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — FR1–FR12, NFR1–NFR8
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md` — TypeScript-strict, comments-as-design, basis pill, role-gate
- [refined-mockups-stage] `.claude/aidlc-common/stages/inception/refined-mockups.md`
- [ux-guide] `.claude/knowledge/aidlc-design-agent/ux-guide.md`
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`
- [interaction-design-patterns] `.claude/knowledge/aidlc-design-agent/interaction-design-patterns.md`
- [component-spec-template] `.claude/knowledge/aidlc-design-agent/component-spec-template.md`

## Q1. Fidelity and component depth

The rough wireframes are low-fidelity ASCII; the brownfield prototype
already carries mid-fidelity behaviour (the `App.screens` registry,
the role × capability matrix, the basis pill). [wireframes]
[component-inventory] What fidelity does the refined mockup set target?

A. **Mid-fidelity, one mockup per story screen.** Each user-story
   screen gets a mid-fidelity mockup (real labels, real layout,
   Bangla copy, no hi-fi polish); interaction specs cover the 4
   must-have input modes (US1.10–US1.13) + 3 `[Deferred]`
   placeholders (US1.14–US1.16) + the binding money / status /
   role-gate / audit components. The 30-component chrome
   baseline inherits the default AA baseline per Q4=B. The
   7 phase-2 input-mode stories (US1.14–US1.16) and the
   dashboard placeholder (US3.9) are mocked as `[Deferred]`
   placeholders matching the story deferral. [Q1 of
   user-stories] [refined-mockups-stage §Step 4]
B. **High-fidelity with full visual design.** Add color tokens,
   spacing scale, and pixel-precise layout. Doubles the time per
   screen; the prototype's `tokens.css` already covers colors and
   spacing, so the work is mostly transcription.
C. **Low-fidelity annotation pass.** Keep ASCII wireframes; just
   annotate state transitions, role-gate boundaries, and audit
   triggers on each screen. Fastest, but downstream Construction
   has to re-derive the layout.
X. Other (please specify)

[Answer]: A

## Q2. Design system mapping source

The refined mockups need a design-system mapping artifact. The
brownfield prototype ships a `tokens.css` and a `component-inventory.md`
listing 30 components with role × capability annotations. Where does
the design system come from?

A. **Promote prototype tokens.css + component-inventory.md to the
   design system baseline.** Treat the prototype's color tokens,
   spacing scale, type ramp, and 30 components as the baseline;
   the design-system-mapping.md adds the missing pieces (modal,
   toast, dialog, status-pill, basis-pill) as gaps to be closed
   in Construction. [team-practices §"Code Style"] [component-
   inventory]
B. **Design a fresh design system in this stage.** Re-derive
   colors, spacing, type ramp, and component library from scratch.
   Duplicates the prototype work; risks losing the basis-pill /
   status-pill conventions the prototype already proved.
C. **Hybrid: prototype tokens + ad-hoc additions in the mapping
   document.** Use prototype tokens directly; the mapping document
   records every prototype component, every gap, and every
   add-on. The map is the contract for Construction.
X. Other (please specify)

[Answer]: A

## Q3. Interaction patterns for the seven order-capture input modes

The 7 input modes in FR5.1 have very different interaction shapes:
paste-parse is a textarea + parse button; manual is a per-line form;
repeat is a single tap on a previous order; quick-add is a one-line
form; photo / spreadsheet / voice are deferred. The interaction spec
needs to encode this. [stories §US1.10–§US1.16]

A. **One interaction spec per input mode.** A separate spec section
   per US1.10 / US1.11 / US1.12 / US1.13 (and a `[Deferred]`
   placeholder per US1.14 / US1.15 / US1.16). The segment-isolation
   rule is restated inline in the paste-parse spec, matching
   CC-AC-STATUS-BUCKET and AC1.10.2. [stories §CC-AC] [team-practices
   §"Test-after ordering per layer"]
B. **One spec for all 7, with the segment-isolation rule restated
   once.** Saves duplication but conflates the input modes that
   have very different state machines.
C. **One spec for the 4 must-have input modes (US1.10–US1.13) and
   a shared placeholder for the 3 deferred.** Mirrors the
   Must/Should split in the stories.
X. Other (please specify)

[Answer]: A

## Q4. Accessibility scope

The accessibility checklist needs a defined scope. NFR4.1 fixes WCAG
2.1 AA as the target. The brownfield prototype carries 30 components
with role × capability annotations. [NFR4.1] [component-inventory]
[accessibility-wcag] What goes on the checklist?

A. **WCAG 2.1 AA full coverage.** Every component, every screen,
   every state. Includes contrast, keyboard, ARIA, screen reader,
   focus management, touch targets, motion. ~50+ checklist items.
B. **WCAG 2.1 AA focused on money + status surfaces.** Money
   figures, basis pill, status lifecycle, role-gate surfaces, audit
   trail, daily card, settlement. Other surfaces follow the
   default AA baseline without per-component enumeration. Smaller
   checklist, higher signal per item.
C. **WCAG 2.1 AA on the 39 stories' screens only.** Skip
   global surfaces (app bar, sidebar) and only enumerate the
   10 rough screens / story screens.
X. Other (please specify)

[Answer]: B

## Q5. Responsive breakpoint policy

The wireframes commit to mobile-first responsive with sidebar
collapsing to a top hamburger + bottom-tab nav on mobile. The
component-inventory shows the prototype renders consistently
at three breakpoints. [wireframes §Navigation Surface]
[component-inventory]

A. **Three breakpoints: mobile (<768px), tablet (768–1023px),
   desktop (≥1024px).** Matches the prototype's tested surface
   and the interaction-design-patterns guide's recommended set.
   The mapping document records per-component behavior at each
   breakpoint. [interaction-design-patterns §"Responsive
   Breakpoint Strategy"]
B. **Two breakpoints: mobile (<768px) and desktop (≥768px).** The
   tablet and small-desktop are visually identical; the only
   breakpoint is the sidebar-to-hamburger transition.
C. **Four breakpoints: mobile (<640px), tablet (640–1023px),
   desktop (1024–1439px), large desktop (≥1440px).** Adds a
   large-desktop container cap. The prototype has no large-desktop
   test surface, so this adds a screen the prototype never proved.
X. Other (please specify)

[Answer]: A

## Assumption Confirmation

A. Accept assumptions — proceed to artifact generation with the
   answers above
B. Convert to follow-up questions — something above needs a
   structured question instead of an assumption

[Answer]: A
