# Design System Mapping — App Wiring (B6)

> The design system is the existing `src/pres/` component set and `src/pres/tokens.css`. The
> prototype's `prototype/css/tokens.css` is the reference the production tokens were derived from.
> No new colour token is added; every new component is built from existing tokens.

## Tokens used

> **Updated 2026-10-28 (visual refresh before the demo).** The first version of this table listed a
> plain link-blue palette and "no new colour token". The shipped stylesheet now carries the
> prototype's ledger palette (`prototype/css/tokens.css`) as brand tokens. Every text pair is
> measured in `tests/unit/contrast.test.ts`, and the warning gap below is closed.

| Token | Value | Used for |
|-------|-------|----------|
| `--color-text` | `#1a1a1a` (16.1:1 on white) | body text, figures |
| `--color-text-2` | `#414a52` (8.2:1 on white, 7.6:1 on canvas) | labels, secondary text, table heads |
| `--color-canvas` | `#f6f5f1` | page background (warm ledger paper), panels inside cards |
| `--color-surface` | `#ffffff` | screen cards, inputs, secondary buttons |
| `--color-line` | `#e4e0d8` | decorative rules and card borders (no contrast floor) |
| `--color-control-border` | `#8c8272` (3.6:1) | borders that bound a control (WCAG 1.4.11) |
| `--color-header-bg` / `-text` / `-muted` / `-active` | `#131a20` / `#f3f1ec` (15.9:1) / `#a8b2ba` (8.4:1) / `#2a343c` | ink header, nav links, current page |
| `--color-brand` / `--color-brand-dark` | `#0a5b44` (white on it 7.6:1) / `#06382a` | primary buttons, brand mark, focused input; hover |
| `--color-brand-tint` | `#eff7f3` (brand on it 7.0:1) | row hover, contact strip, link sheet |
| `--color-bg-success` | `#deefe8` (brand on it 6.5:1) | `success` pill, role badge, saved toast |
| `--color-warning` / `--color-bg-warning` | `#8f5c11` / `#f8ebd3` (4.9:1) | `warning` pill, incomplete paste item border |
| `--color-error` / `--color-bg-error` | `#a4252b` / `#fbeaea` (6.3:1) | `danger` pill, error banners |
| `--color-bg-neutral` | `#efede7` (text-2 on it 7.0:1) | `neutral` pill, fact chips |
| `--color-link` | `#1457b2` (7.0:1) | inline links only (no longer the primary button colour) |
| `--radius-sm/md/lg/pill` | 8 / 12 / 16 / 999 px | controls / panels / screen cards / pills |
| `--shadow-card`, `--shadow-raised`, `--shadow-button`, `--ring-brand` | layered soft shadows | cards, buttons, primary buttons, focus halo |
| `--space-1…8` | 4–32 px | all spacing; card padding `--space-8`, gutter `--space-4` on phones |
| `--font-ui` | system-ui, Hind Siliguri, Noto Sans Bengali, Kohinoor Bangla | Latin from the platform face; Bangla through the offline chain |
| `--focus-ring-outline` | 3 px solid link colour | every focusable element (unchanged) |

**Warning gap: closed.** `--color-warning` `#8f5c11` on `--color-bg-warning` measures 4.9:1 and is in
the contrast harness.

### Visual language

- **Type scale:** screen title 28 px / 700 (24 px on phones); section heading 17 px / 700; labels
  13 px / 600 in `--color-text-2`; body 15–16 px; stat figures 26 px / 700 with tabular numerals.
- **Surfaces:** canvas page → white screen card (radius 16, `--shadow-card`) → canvas panels inside
  the card (filters, totals, line cards) with a `--color-line` border.
- **Controls:** 44 px inputs and primary buttons, 40 px secondary buttons, 32 px row buttons. A
  focused input gets the brand border plus `--ring-brand`.
- **Buttons:** one filled brand button per area; the rest are white with a control border. "New
  order" (orders list) and "Repeat order" (order detail) are the primary actions on their screens.
- **Pills:** 12 px / 600 with a leading dot in the pill's colour; the text always carries the
  meaning (NFR9.9). Order status uses `statusTone`: delivered and settled → success; cancelled and
  returned → danger; partial → warning; new, confirmed, packed and shipped → neutral.

## Screen → components

| Screen | Existing components | New components |
|--------|---------------------|----------------|
| Sign-up, sign-in, recover, reset, accept | `Screen`, `Field`, `Toast` | `ApiState` (banner only) |
| Staff | `Screen`, `Field`, `Pill` (role) | `LinkSheet`, `ApiState` |
| Customer list | `Screen`, `Pill` | `SearchBox`, `RiskChip`, `ApiState` |
| New / edit customer | `Screen`, `Field` (extended) | `RiskChip` (radio group labels) |
| Customer detail | `Screen`, `BasisPill`, `Pill` | `RiskChip`, `ApiState` |
| Product list | `Screen`, `Pill` | `SearchBox`, `LowStockMark`, `ApiState` |
| New product / detail | `Screen`, `Field` (extended) | `LowStockMark` |
| Low stock, suppliers | `Screen`, `Field` | `LowStockMark`, `ApiState` |
| Lock, not found | `LockSheet`, `Screen` | — |
| Every screen | `Shell` (extended), `Toast` | — |

## Prototype → production

| Prototype pattern | Production |
|-------------------|------------|
| `App.ui.riskChip(c)` from the return ratio | `RiskChip` from the manual 0–3 level (stories Q3); the return-ratio explanation waits for B4 data |
| `App.ui.emptyState({icon,title,body})` | `ApiState` `empty` prop |
| `App.ui.provenance(...)` teal note | not used in this intent (no derived figures shown) |
| one axis drilled at a time + bulk bar | one axis drilled at a time; the bulk bar is not in scope |
| `data-go` / `data-act` strings | typed routes and plain typed action functions (team.md Code Style) |
| `card flush` + `list-item` CSS | kept as BEM-ish classes in the production stylesheet; the `classes` harness gap (team.md) gets these as its first targets |

## Classes the new screens add

Added by the 2026-10-28 refresh: `screen__back` (the back link on sub-screens), `paste-item__facts`,
`fact`, `fact__label` (labelled quantity, size and colour chips) and `paste-item__price`.

`api-state`, `api-state__banner`, `api-state__skeleton`, `link-sheet`, `link-sheet__field`,
`search-box`, `list-item`, `list-item__lead`, `list-item__body`, `chip--selectable`, `variant-row`,
`variant-row--low`. Each must be reachable from a rendered screen (the `classes` harness rule).
