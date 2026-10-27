# SmartBiz BD — Interaction Specification

> Component-level interaction specs for every primary component on
> every story screen. Anchored to the prototype's
> `App.ui` namespace (`basisPill`, `completeness`, `sheet`, `toast`,
> `roleLock`, `statusChip`, `field`, `toggleRow`, `riskChip`,
> `moneyEl`), the `component-spec-template.md` format, and the 9
> cross-cutting CC-AC invariants from `stories.md`. Each component
> carries a complete state matrix (default / hover / focus /
> disabled / loading / error / empty) and the WCAG-AA accessibility
> implementation per the focused a11y scope (Q4=B: money + status
> surfaces get full enumeration; other surfaces inherit the default
> AA baseline).

## How to read this document

Each component entry follows the format from
`.claude/knowledge/aidlc-design-agent/component-spec-template.md`:
a header table, a state matrix, props/inputs, responsive behavior
at 3 breakpoints, and an accessibility implementation. The shared
chrome (`app-bar`, `sidebar`, `tabbar`, `bottom-tab-nav`) is
specified once in §1; money-bearing and status-bearing components
get full enumerations per the Q4=B focus; the 30 prototype
components that don't touch money / status / role-gate / audit
inherit §1's chrome baseline + the CC-AC-I18N invariant.

The `## Sources` section at the end ties every component back to
its owning story, requirement, and prototype module.

---

## §1 Shared chrome components

### App Bar (`<header id="app-bar">`)

| Field | Value |
|---|---|
| Component | App Bar |
| Description | Top-of-app-wide bar with logo, user menu, role chip |
| Category | layout / navigation |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Logo + user menu | page load |
| hover (logo) | Underline / `--text-2` | mouseover |
| focus (user menu) | 2px outline `--line-control` | Tab key |
| disabled (user menu) | n/a — always interactive | — |
| loading | n/a — chrome is static | — |
| error | n/a — chrome is static | — |
| empty | n/a — chrome is static | — |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| user | `{ id, name, role }` | yes | — | Current session user |
| business | `{ id, name }` | yes | — | Current business |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Logo + user menu only; sidebar collapses to hamburger |
| tablet (768–1023px) | Logo + user menu; sidebar collapses to top hamburger |
| desktop (≥1024px) | Logo + user menu + role chip; sidebar visible at 244 px |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<header role="banner">` |
| Keyboard interaction | Tab to logo (Enter → home), Tab to user menu (Enter → open) |
| Label / aria-label | Logo has `aria-label="SmartBiz BD — হোম"` |
| Contrast ratio | `--text` on `--canvas` ≥ 4.5:1 (per `tokens.css`) |
| Screen reader | "SmartBiz BD — হোম, [user name], ব্যবহারকারী মেনু" |
| Focus management | First focusable: logo; tab order: logo → user menu |

### Sidebar (`<nav id="sidebar">`)

| Field | Value |
|---|---|
| Component | Sidebar |
| Description | Module navigation rail on desktop |
| Category | navigation |

#### States

| State | Description | Trigger |
|---|---|---|
| default | 8 modules, active one with `--line-control` left edge | page load |
| hover | Module name `--text` → `--text-2` | mouseover |
| focus | 2px outline `--line-control` | Tab key |
| collapsed | Visible only on desktop ≥1024px; hidden on tablet/mobile | — |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| modules | `Module[]` | yes | — | Module list |
| active | `module.id` | yes | — | Active module |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Hidden; sidebar collapses to top hamburger + bottom-tab nav |
| tablet (768–1023px) | Hidden; sidebar collapses to top hamburger |
| desktop (≥1024px) | Visible at 244 px (`--sidebar-w`) |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<nav role="navigation" aria-label="প্রধান নেভিগেশন">` |
| Keyboard interaction | Tab/Shift+Tab through modules; Enter to navigate |
| Label / aria-label | Each module has `aria-current="page"` when active |
| Contrast ratio | `--text` on `--canvas-sunk` ≥ 4.5:1 |
| Screen reader | "প্রধান নেভিগেশন, [module name], পৃষ্ঠা" |
| Focus management | First focusable: first module; focus visible |

### Bottom Tab Bar (`<nav id="bottom-tab-nav">`)

| Field | Value |
|---|---|
| Component | Bottom Tab Bar |
| Description | 5 most-used modules + overflow on mobile |
| Category | navigation |

#### States

| State | Description | Trigger |
|---|---|---|
| default | 5 tabs + "আরও" overflow | page load |
| hover | Tab background `--canvas-sunk` | mouseover |
| focus | 2px outline `--line-control` | Tab key |
| active | Tab background `--surface` + `--line-control` top edge | current route |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| primary | `Module[]` | yes | — | 5 primary modules |
| overflow | `Module[]` | yes | — | Overflow modules |
| active | `module.id` | yes | — | Active module |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Visible; 5 tabs + overflow |
| tablet (768–1023px) | Hidden |
| desktop (≥1024px) | Hidden |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<nav role="navigation" aria-label="প্রধান নেভিগেশন">` |
| Keyboard interaction | Tab/Shift+Tab through tabs; Enter to navigate |
| Label / aria-label | Each tab has `aria-current="page"` when active; touch target 48×48 px |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1 |
| Screen reader | "প্রধান নেভিগেশন, [module name]" |
| Focus management | First focusable: first tab |

---

## §2 Money-bearing components (focused a11y scope)

### Basis Pill (`<span class="basis">`)

| Field | Value |
|---|---|
| Component | Basis Pill |
| Description | Visual marker for every money figure's recognition basis |
| Category | component |

The basis pill is the load-bearing visual for the recognition-basis
invariant (CC-AC-BASIS, FR10.1). Every money figure on every screen
carries the pill; the pill is rendered by `App.ui.basisPill(basis)`.

#### States

| State | Description | Trigger |
|---|---|---|
| default | Pill with basis label (`অর্জিত` / `হাতে পাওয়া`) | page load |
| hover | Pill background `--green-050` | mouseover |
| focus | 2px outline `--line-control` (interactive variant) | Tab key |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| basis | `'earned' \| 'realized' \| 'incomplete'` | yes | — | Recognition basis |
| interactive | `boolean` | no | false | Whether the pill is clickable (opens why-missing sheet) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Inline next to figure; never wraps to second line |
| tablet (768–1023px) | Inline next to figure |
| desktop (≥1024px) | Inline next to figure |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<span>` with `aria-label` (decorative when non-interactive; `button` when interactive) |
| Keyboard interaction | Tab/Enter when `interactive=true` → opens basis-why sheet |
| Label / aria-label | `aria-label="earned"` / `"realized"` / `"incomplete"` |
| Contrast ratio | `--earned` / `--realized` against `--canvas` ≥ 4.5:1 (per `tokens.css`) |
| Screen reader | "অর্জিত" / "হাতে পাওয়া" / "অসম্পূর্ণ" |
| Focus management | Interactive variant traps focus inside the basis-why sheet per modal rules |

### Completeness Control (`<button class="completeness">`)

| Field | Value |
|---|---|
| Component | Completeness Control |
| Description | "X of Y items" button that opens the why-missing sheet |
| Category | component |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Progress bar + "X of Y items" + "কেন?" button | page load |
| hover | Progress bar `--green-600` | mouseover |
| focus | 2px outline `--line-control` | Tab key |
| disabled | n/a — always interactive | — |
| loading | Skeleton progress bar | data in flight |
| error | Inline error in `--red-700` | data load failure |
| empty | "কোনো আইটেম নেই" | no items in figure |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| have | `number` | yes | — | Items counted |
| of | `number` | yes | — | Items expected |
| basis | `'earned' \| 'realized'` | yes | — | Recognition basis |
| whySheet | `WhySheetContent` | no | — | Why-missing content (custody / settlement-pending / variance-unresolved) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Single line, text truncated to fit |
| tablet (768–1023px) | Single line |
| desktop (≥1024px) | Single line, progress bar 200 px wide |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<button aria-haspopup="dialog">` |
| Keyboard interaction | Enter / Space opens why-missing sheet; Escape closes |
| Label / aria-label | `aria-label="X of Y items, completeness details"` |
| Contrast ratio | `--text-2` on `--canvas-sunk` ≥ 4.5:1; progress bar `--green-600` ≥ 3:1 |
| Screen reader | "অর্জিত, X of Y items, completeness details" |
| Focus management | Focus moves into the why-missing sheet on open; returns to button on close |

### Money Element (`<span class="money">`)

| Field | Value |
|---|---|
| Component | Money Element |
| Description | Single money figure with Bangla digits and optional basis pill |
| Category | display |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Bangla digits, basis pill, completeness control | page load |
| hover | n/a — static | — |
| focus | n/a — non-interactive | — |
| disabled | n/a — always rendered | — |
| loading | Skeleton figure | data in flight |
| error | Inline `--red-700` figure | data load failure |
| empty | "৳—" placeholder | no figure |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| amount | `number` | yes | — | Money amount in BDT |
| basis | `'earned' \| 'realized'` | no | — | Recognition basis |
| completeness | `{ have, of }` | no | — | Completeness control |
| allowLatin | `boolean` | no | false | Whether Latin digits are allowed (default false) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Wraps to second line if needed |
| tablet (768–1023px) | Inline |
| desktop (≥1024px) | Inline |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<span>` with `aria-label` |
| Keyboard interaction | n/a — non-interactive (basis pill is interactive separately) |
| Label / aria-label | `aria-label="৳ X, basis: earned"` (Bangla digits + basis) |
| Contrast ratio | `--text` on `--canvas` ≥ 4.5:1 |
| Screen reader | "৳ X, earned" |
| Focus management | n/a |

### Status Chip (`<span class="status-chip">`)

| Field | Value |
|---|---|
| Component | Status Chip |
| Description | Visual marker for the order status enum value |
| Category | component |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Status label + per-status glyph | page load |
| hover | Background `--canvas-sunk` (interactive variant) | mouseover |
| focus | 2px outline `--line-control` (interactive variant) | Tab key |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| status | `'new' \| 'confirmed' \| 'packed' \| 'shipped' \| 'delivered' \| 'settled' \| 'cancelled' \| 'returned' \| 'partial'` | yes | — | Order status enum value |
| interactive | `boolean` | no | false | Whether the chip is clickable |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Inline, glyph 16 px, label 13 px |
| tablet (768–1023px) | Inline, glyph 18 px, label 13 px |
| desktop (≥1024px) | Inline, glyph 20 px, label 13 px |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<span>` with `aria-label` (decorative when non-interactive; `button` when interactive) |
| Keyboard interaction | Tab/Enter when `interactive=true` → opens status history sheet |
| Label / aria-label | `aria-label="নতুন"` / `"নিশ্চিত"` / ... / `"partial" |
| Contrast ratio | `--text` on chip background ≥ 4.5:1; per-status color ramps per `tokens.css` |
| Screen reader | "নতুন" / "নিশ্চিত" / ... |
| Focus management | Interactive variant opens a status history sheet; focus management per modal rules |

### Settlement Disposition Picker (`<select>`)

| Field | Value |
|---|---|
| Component | Settlement Disposition Picker |
| Description | Variance disposition select for the settlement run |
| Category | input |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Variance disposition select | page load |
| hover | Border `--line-control` | mouseover |
| focus | 2px outline `--line-control` | Tab key |
| disabled | Select disabled when consignment already dispositioned | — |
| loading | n/a — static | — |
| error | Inline `--red-700` validation | write_off without reason |
| empty | "—" placeholder | no disposition set |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| value | `'accept_partial' \| 'dispute' \| 'write_off' \| null` | yes | null | Disposition |
| reason | `string` | conditional | — | Required for `write_off` (`aria-required="true"`) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full-width; reason note field below |
| tablet (768–1023px) | Inline with reason note |
| desktop (≥1024px) | Inline with reason note |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<select>` with `aria-required` on write_off |
| Keyboard interaction | Arrow keys navigate; Enter selects; Escape closes |
| Label / aria-label | `aria-label="ভেরিয়েন্স নিষ্পত্তি"` |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1; control border `--line-control` 3:1 |
| Screen reader | "ভেরিয়েন্স নিষ্পত্তি, accept_partial" / "dispute" / "write_off" |
| Focus management | Focus moves to the reason note field when `write_off` is selected |

---

## §3 Input-mode interaction specs

### Paste-Parse (`parseMessage`)

| Field | Value |
|---|---|
| Component | Paste-Parse Order Capture |
| Description | Free-text paste area + parse button + parsed-items preview |
| Category | input / flow |

The paste-parse path is the highest-leverage single feature for the
Owner (OQ3). The **segment-isolation rule** is the most regression-
prone code path in the product, and tests restate the rule inline
rather than importing the constants (CC-AC-STATUS-BUCKET, US1.10.2).

> **Segment-isolation rule** (restated verbatim, per
> CC-AC-STATUS-BUCKET): *"an item's details come from the item's
> own words."* A flip in the rule is a failing test, not a silent
> re-shape.

#### States

| State | Description | Trigger |
|---|---|---|
| default | Empty textarea, parse button disabled | page load |
| hover (parse) | Button background `--green-600` | mouseover |
| focus (textarea) | 2px outline `--line-control` | Tab key |
| disabled (parse) | Parse button disabled until textarea has content | validation |
| loading | Inline spinner on parse button | parseMessage |
| error | Inline form error in `--red-700` (e.g. "কোনো পণ্য পাওয়া যায়নি") | parseMessage failure |
| empty (parsed) | "পার্স করা আইটেম প্রদর্শিত হবে" | no items parsed |
| partial (parsed) | Some items parsed, some flagged with `--amber-700` | parseMessage partial |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| text | `string` | yes | — | Pasted message text |
| phone | `string` | no | — | Detected customer phone |
| items | `ParsedItem[]` | no | — | Parsed items (variant, qty, price, discount) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Textarea full-width; parsed items stack vertically |
| tablet (768–1023px) | Textarea full-width; parsed items stack vertically |
| desktop (≥1024px) | Textarea full-width; parsed items in a table |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<textarea aria-label="মেসেজ পেস্ট করুন">` |
| Keyboard interaction | Tab to textarea; paste text; Tab to parse; Enter to parse |
| Label / aria-label | `aria-label="মেসেজ পেস্ট করুন"` on textarea |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1; parse button `--text-on-ink` on `--green-600` ≥ 4.5:1 |
| Screen reader | "মেসেজ পেস্ট করুন, [text], পার্স করুন" |
| Focus management | After parse, focus moves to the first parsed item; per-item edit is keyboard-reachable |

### Manual Entry

| Field | Value |
|---|---|
| Component | Manual Order Capture |
| Description | Per-line form rows with product, variant, qty, discount |
| Category | input / flow |

#### States

| State | Description | Trigger |
|---|---|---|
| default | 1 row; "+" to add more; save | page load |
| hover (row) | Background `--canvas-sunk` | mouseover |
| focus (input) | 2px outline `--line-control` | Tab key |
| disabled (save) | Save disabled until at least 1 valid row | validation |
| loading | Inline spinner on save | save in flight |
| error | Per-field + per-row error in `--red-700` | validation failure |
| empty (rows) | "কোনো আইটেম নেই — + আইটেম যোগ করুন" | no rows |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| rows | `ManualRow[]` | yes | — | Per-line rows |
| orderDiscount | `number` | no | 0 | Per-order discount |
| deliveryCharge | `number` | no | 0 | Delivery charge |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Rows stack vertically; each row collapses to 4 inputs |
| tablet (768–1023px) | Rows stack vertically; each row is 5 inputs in a row |
| desktop (≥1024px) | Rows stack vertically; each row is 6 inputs in a row |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<form>` with `aria-labelledby="h2-আইটেম"` |
| Keyboard interaction | Tab through rows; Enter to save |
| Label / aria-label | Each row has `aria-label` for product / variant / qty / discount |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1; per-field labels ≥ 4.5:1 |
| Screen reader | "আইটেম, [product], [variant], [qty], [discount]" |
| Focus management | Tab order: customer → date → row 1 → row N → order discount → delivery charge → save |

### Repeat

| Field | Value |
|---|---|
| Component | Repeat Order |
| Description | Pre-filled items + date from a previous order |
| Category | input / flow |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Source-order reference, pre-filled items, date | page load |
| hover | date | Editable |
| focus | 2px outline | Tab key |
| loading | Inline spinner on save | save in flight |
| error | Inline form error | validation failure |
| empty (source) | "আগের অর্ডার নেই" — Repeat CTA disabled; secondary action "ম্যানুয়াল অর্ডার" routes to S7b Manual Order | no previous order |
| missing (source order) | sourceOrderId absent at load | props invalid |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| sourceOrderId | `string` | yes | — | Source order id |
| items | `RepeatItem[]` | yes | — | Pre-filled items |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Items stack vertically |
| tablet (768–1023px) | Items stack vertically |
| desktop (≥1024px) | Items in a table |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<form>` with `aria-labelledby="h2-আইটেম"` |
| Keyboard interaction | Tab to date; Tab to items; Enter to save |
| Label / aria-label | Source-order reference is `aria-readonly="true"` |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1 |
| Screen reader | "আগের অর্ডার থেকে, [order id], [customer], [items]" |
| Empty-source ARIA | `aria-live="polite"` announces "আগের অর্ডার নেই — ম্যানুয়াল অর্ডার খুলুন" when the empty-source state is rendered |
| Focus management | First focusable: date field |

### Quick-Add

| Field | Value |
|---|---|
| Component | Quick-Add Order |
| Description | Single-item form for fast one-line orders |
| Category | input / flow |

#### States

| State | Description | Trigger |
|---|---|---|
| default | 4 fields: customer, product, variant, qty | page load |
| hover | — | — |
| focus | 2px outline | Tab key |
| disabled (save) | Save disabled until all fields filled | validation |
| loading | Inline spinner on save | save in flight |
| error | Per-field error in `--red-700` | validation failure |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| customer | `string` | yes | — | Customer id |
| product | `string` | yes | — | Product id |
| variant | `string` | yes | — | Variant id |
| qty | `number` | yes | — | Quantity |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Single column, fields stack |
| tablet (768–1023px) | Two columns |
| desktop (≥1024px) | Two columns |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<form>` with `aria-labelledby="h2-quick-add"` |
| Keyboard interaction | Tab through fields; Enter to save |
| Label / aria-label | Each field labelled |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1 |
| Screen reader | "Quick-add, [customer], [product], [variant], [qty]" |
| Focus management | First focusable: customer field |

### Photo Capture `[Deferred]`

| Field | Value |
|---|---|
| Component | Photo Order Capture |
| Description | Image upload + OCR (deferred to phase 2) |
| Category | input / flow |

[Deferred] — OCR pipeline vendor and free-tier envelope resolved
in Construction (A1, US1.14.D). The mockup carries a `[Deferral
notice]` placeholder explaining the phase-2 surface in Bangla. The
segment-isolation rule (US1.14.1) applies when the surface lands.

### Spreadsheet Import `[Deferred]`

| Field | Value |
|---|---|
| Component | Spreadsheet Order Capture |
| Description | .xlsx / .csv upload + row validation (deferred to phase 2) |
| Category | input / flow |

[Deferred] — Same Construction resolution as photo capture
(US1.15.D). The mockup carries a `[Deferral notice]` placeholder.

### Voice Capture `[Deferred]`

| Field | Value |
|---|---|
| Component | Voice Order Capture |
| Description | Audio recording + STT (deferred to phase 2) |
| Category | input / flow |

[Deferred] — STT pipeline (Web Speech API vs free-tier cloud)
resolved in Construction (US1.16.D). The mockup carries a
`[Deferral notice]` placeholder.

---

## §4 Modal / sheet / toast components

### Sheet (`<dialog class="sheet">`)

| Field | Value |
|---|---|
| Component | Sheet |
| Description | Bottom-anchored sheet for transient detail / form flows |
| Category | layout |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Slide-up from bottom | open |
| hover | — | — |
| focus | First focusable inside the sheet | Tab key |
| loading | Skeleton header | — |
| error | Inline error | — |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| title | `string` | yes | — | Sheet title |
| body | `ReactNode` | yes | — | Sheet body |
| footer | `ReactNode` | no | — | Sheet footer |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full-width, anchored to bottom |
| tablet (768–1023px) | 480 px wide, anchored to bottom |
| desktop (≥1024px) | 480 px wide, anchored to right |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<dialog role="dialog" aria-modal="true">` |
| Keyboard interaction | Escape closes; focus trapped inside |
| Label / aria-label | `aria-labelledby="sheet-title"` |
| Contrast ratio | `--text` on `--surface-raised` ≥ 4.5:1 |
| Screen reader | "[Sheet title], dialog, modal" |
| Focus management | Focus moves into sheet on open; returns to trigger on close |

### Toast (`<div class="toast">`)

| Field | Value |
|---|---|
| Component | Toast |
| Description | Transient feedback (success / info / warn / error) |
| Category | feedback |

#### States

| State | Description | Trigger |
|---|---|---|
| success | `--green-600` background | success action |
| info | `--teal-600` background | info action |
| warn | `--amber-600` background | warn action |
| error | `--red-600` background | error action |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| message | `string` | yes | — | Toast message |
| variant | `'success' \| 'info' \| 'warn' \| 'error'` | yes | — | Toast variant |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Bottom-anchored, full-width minus 16 px margins |
| tablet (768–1023px) | Bottom-right, 360 px wide |
| desktop (≥1024px) | Bottom-right, 360 px wide |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<div role="status" aria-live="polite">` |
| Keyboard interaction | Tab to dismiss button (auto-dismiss after 5 s) |
| Label / aria-label | `aria-label="[variant]: [message]"` |
| Contrast ratio | `--text-on-ink` on per-variant background ≥ 4.5:1 |
| Screen reader | Announced via aria-live; auto-dismiss timer pauses on hover |
| Focus management | n/a — toast is transient |

### Modal (`<dialog class="modal">`)

| Field | Value |
|---|---|
| Component | Modal |
| Description | Center-anchored modal for confirmations / critical flows |
| Category | layout |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Center-anchored, scrim behind | open |
| focus | First focusable inside the modal | Tab key |
| loading | Skeleton body | data in flight |
| error | Inline error in body | — |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| title | `string` | yes | — | Modal title |
| body | `ReactNode` | yes | — | Modal body |
| actions | `Action[]` | yes | — | Modal actions (primary, secondary, destructive) |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full-width, anchored to bottom (sheet-style) |
| tablet (768–1023px) | 560 px wide, centered |
| desktop (≥1024px) | 560 px wide, centered |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<dialog role="dialog" aria-modal="true">` |
| Keyboard interaction | Escape closes; focus trapped inside |
| Label / aria-label | `aria-labelledby="modal-title"` |
| Contrast ratio | `--text` on `--surface-raised` ≥ 4.5:1; scrim `--ink-900` opacity 0.5 |
| Screen reader | "[Modal title], dialog, modal" |
| Focus management | Focus moves into modal on open; returns to trigger on close |

---

## §5 Form input components

### Field (`<div class="field">`)

| Field | Value |
|---|---|
| Component | Field |
| Description | Labeled input group with optional help text and error |
| Category | input |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Label + input + optional help text | page load |
| focus | 2px outline `--line-control` on input | Tab key |
| disabled | Input disabled when `prop.disabled=true` | — |
| loading | n/a | — |
| error | Inline `--red-700` error message below input | validation failure |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| label | `string` | yes | — | Visible label |
| help | `string` | no | — | Help text |
| error | `string` | no | — | Error message |
| required | `boolean` | no | false | Whether the field is required |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Label above input; full-width |
| tablet (768–1023px) | Label above input; full-width |
| desktop (≥1024px) | Label above input; full-width |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<label>` + `<input>` paired via `for`/`id` |
| Keyboard interaction | Tab to focus; type to change value |
| Label / aria-label | Visible label is the accessible name |
| Contrast ratio | `--text` on `--surface` ≥ 4.5:1; error `--red-700` ≥ 4.5:1 |
| Screen reader | "[label], [value], [error]" |
| Focus management | Focus visible |

### Toggle Row (`<div class="toggle-row">`)

| Field | Value |
|---|---|
| Component | Toggle Row |
| Description | Labeled toggle for settings (AI opt-in, debug flows) |
| Category | input |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Toggle off (on) | page load |
| hover | Background `--canvas-sunk` | mouseover |
| focus | 2px outline `--line-control` on toggle | Tab key |
| disabled | Toggle disabled when `prop.disabled=true` | — |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| label | `string` | yes | — | Visible label |
| value | `boolean` | yes | — | Toggle value |
| disabled | `boolean` | no | false | Whether the toggle is disabled |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full-width |
| tablet (768–1023px) | Full-width |
| desktop (≥1024px) | 480 px wide |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<button role="switch" aria-checked>` |
| Keyboard interaction | Tab to focus; Space to toggle |
| Label / aria-label | `aria-label="[label], [on/off]"` |
| Contrast ratio | Toggle off `--line-control` ≥ 3:1; toggle on `--green-600` ≥ 3:1 |
| Screen reader | "[label], on" / "off" |
| Focus management | Focus visible |

### Risk Chip (`<span class="risk-chip">`)

| Field | Value |
|---|---|
| Component | Risk Chip |
| Description | Per-row risk indicator on the customers list |
| Category | component |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Color-coded chip with risk level | page load |
| hover | Background `--canvas-sunk` | mouseover |
| focus | 2px outline (interactive variant) | Tab key |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| level | `'low' \| 'medium' \| 'high'` | yes | — | Risk level |
| interactive | `boolean` | no | false | Whether the chip is clickable |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Inline, glyph 12 px, label 11 px |
| tablet (768–1023px) | Inline, glyph 14 px, label 12 px |
| desktop (≥1024px) | Inline, glyph 16 px, label 13 px |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<span>` with `aria-label` |
| Keyboard interaction | n/a — decorative |
| Label / aria-label | `aria-label="low risk"` / `"medium risk"` / `"high risk"` |
| Contrast ratio | Per-level color ramps ≥ 4.5:1 |
| Screen reader | "low risk" / "medium risk" / "high risk" |
| Focus management | n/a |

### Empty State (`<div class="empty">`)

| Field | Value |
|---|---|
| Component | Empty State |
| Description | Illustration + explanation + primary CTA |
| Category | feedback |

#### States

| State | Description | Trigger |
|---|---|---|
| default | Icon + heading + primary CTA | no data |

#### Props / Inputs

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| icon | `string` | yes | — | Icon (App.I.*) |
| heading | `string` | yes | — | Heading |
| cta | `{ label, action }` | no | — | Primary CTA |

#### Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| mobile (<768px) | Full-width, centered |
| tablet (768–1023px) | Full-width, centered |
| desktop (≥1024px) | Full-width, centered, max-width 480 px |

#### Accessibility

| Requirement | Implementation |
|---|---|
| ARIA role | `<div role="status">` |
| Keyboard interaction | Tab to CTA |
| Label / aria-label | `aria-label="[heading]"` |
| Contrast ratio | `--text-2` on `--canvas` ≥ 4.5:1 |
| Screen reader | "[heading], primary action" |
| Focus management | First focusable: CTA |

---

## Sources

- [component-spec-template] `.claude/knowledge/aidlc-design-agent/component-spec-template.md`
- [interaction-design-patterns] `.claude/knowledge/aidlc-design-agent/interaction-design-patterns.md`
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`
- [ux-guide] `.claude/knowledge/aidlc-design-agent/ux-guide.md`
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items, `App.ui` namespace
- [tokens] `prototype/css/tokens.css` — design tokens
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories, CC-AC cross-cutting list
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — FR1–FR12, NFR1–NFR8
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [mockups] `aidlc/spaces/default/intents/261004-mvp/inception/refined-mockups/mockups.md`

## Assumptions & Open Questions

- The shared chrome (app-bar, sidebar, tabbar, bottom-tab-nav)
  is specified once and applied to all 14 mockup screens.
- Money-bearing and status-bearing components get full
  enumerations per the Q4=B focused a11y scope; the 30 prototype
  components that don't touch money / status / role-gate / audit
  inherit the §1 chrome baseline + the CC-AC-I18N invariant
  (Bangla digits with the Latin-digit allow-list).
- The 3 deferred input modes (US1.14, US1.15, US1.16) carry a
  placeholder entry here; their interaction specs land in
  Construction when the OCR / STT / spreadsheet vendor is
  selected.
- The basis pill / completeness control / status chip spec is the
  binding contract for the recognition-basis invariant (CC-AC-
  BASIS); Functional Design must produce typed TypeScript
  signatures for the `App.ui.basisPill`, `App.ui.completeness`,
  and `App.ui.statusChip` helpers that match this spec.