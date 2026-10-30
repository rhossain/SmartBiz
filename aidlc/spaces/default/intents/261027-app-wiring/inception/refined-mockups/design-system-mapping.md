# Design System Mapping — App Wiring (B6)

> The design system is the existing `src/pres/` component set and `src/pres/tokens.css`. The
> prototype's `prototype/css/tokens.css` is the reference the production tokens were derived from.
> No new colour token is added; every new component is built from existing tokens.

## Tokens used

> **Updated 2026-10-30 (premium redesign, `mockups.md` §18).** Token names are kept so the screens
> did not change; values moved to a quieter ink-green and ivory palette, and a few tokens were
> added (`--color-surface-2`, `--color-text-3`, `--color-accent`, `--color-accent-text`,
> `--color-on-brand-muted`, `--scrim`, `--shadow-float`, layout sizes). Every colour token is in at
> least one pair measured by `tests/unit/contrast.test.ts`. The 2026-10-28 values are in git
> history.

| Token | Value | Used for |
|-------|-------|----------|
| `--color-text` | `#15201b` (16.7:1 on white) | body text, figures |
| `--color-text-2` | `#4b5752` (7.5:1 on white, 6.8:1 on canvas) | labels, secondary text |
| `--color-text-3` | `#66716c` (5.1:1 on white, 4.6:1 on canvas) | captions, column heads, phone cell labels |
| `--color-canvas` | `#f4f3ee` | page background (warm ivory) |
| `--color-surface` / `--color-surface-2` | `#ffffff` / `#faf9f6` | cards, inputs, buttons / quiet panels inside a card |
| `--color-line` | `#e6e3da` | hairline borders and rules (decorative) |
| `--color-control-border` | `#8c8272` (3.8:1) | borders that bound an input (WCAG 1.4.11) |
| `--color-header-bg` / `-text` / `-muted` / `-active` | `#0f1c17` / `#f1f4f2` (15.8:1) / `#a3b4ad` (8.1:1) / `#1d302a` | ink-green sidebar, top bar, drawer; lit nav row |
| `--color-accent` / `--color-accent-text` | `#c8a35a` (ink on it 7.4:1) / `#85621f` (5.6:1 on white) | gold brand tile, avatar, current-page bar and icon / gold as text |
| `--color-brand` / `--color-brand-dark` | `#0a5b44` (white on it 8.1:1) / `#06382a` | primary buttons, current tab, focused input; hover; hero gradient |
| `--color-on-brand-muted` | `#c8e6d8` (6.1:1 on brand, 9.8:1 on brand-dark) | labels on the daily-card hero tile |
| `--color-brand-tint` / `--color-bg-success` | `#eef6f2` / `#dcefe6` | row hover, link chips / success pill, current-tab pill |
| `--color-warning` / `--color-bg-warning` | `#8f5c11` / `#f8ebd3` (4.8:1) | warning pill, incomplete item edge |
| `--color-error` / `--color-bg-error` | `#a4252b` / `#fbeaea` (6.3:1) | danger pill, error banners |
| `--color-bg-neutral` | `#efede7` (text-2 on it 6.4:1) | neutral pill, counts |
| `--color-link` | `#1457b2` (6.9:1) | inline links; focus outline |
| `--radius-xs/sm/md/lg/pill` | 6 / 10 / 14 / 20 / 999 px | options / controls / panels / screen cards and tiles / pills |
| `--shadow-card`, `--shadow-raised`, `--shadow-float`, `--shadow-button`, `--ring-brand` | layered, low-contrast | screen cards, buttons and list cards, drawer and toast, primary buttons, focus halo |
| `--sidebar-width`, `--topbar-height`, `--tabbar-height` | 264 / 56 / 64 px | shell layout (§18.1) |
| `--space-1…10` | 4–40 px | spacing; 40 px desktop gutter, 16 px phone gutter |
| `--font-ui` | Inter (if installed), system-ui, Hind Siliguri, Noto Sans Bengali, Kohinoor Bangla | no hosted font (CSP `default-src 'self'`) |
| `--focus-ring-outline` | 2 px solid link colour + 4 px halo | every focusable element |

### Visual language

- **Type scale:** screen title 30 px / 700, −0.02 em (24 px on phones); section heading 17 px;
  labels 13 px / 600 in `--color-text-2`; captions 12 px in `--color-text-3`; stat figures 26–32 px
  / 700 with tabular numerals.
- **Surfaces:** ivory canvas → white screen card (radius 20, `--shadow-card`) → `surface-2` panels
  (filters, totals, contact, line cards) with a hairline border. On a phone the outer card is
  dropped and each panel sits on the canvas.
- **Chrome:** ink-green sidebar (desktop) or top bar + drawer + white bottom tab bar (phone); gold
  is the only accent and marks the brand and the current page.
- **Controls:** 46 px inputs and primary buttons, 42 px secondary buttons, 34 px row buttons,
  44 px icon buttons. A focused input gets the brand border plus `--ring-brand`.
- **Buttons:** one filled emerald button per area; the rest are white with a hairline border.
- **Pills:** 12 px / 600 with a leading dot; the text always carries the meaning (NFR9.9). Basis
  and completeness pills appear on every money figure at every width (§18 D18-4).
- **Icons:** twelve inline 24 px stroke SVGs in `Shell.tsx`, decorative (`aria-hidden`), never the
  only label.
- **Motion:** 140–260 ms ease-out on hover, drawer and toast; all of it off under
  `prefers-reduced-motion`.

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

Added by the 2026-10-30 redesign (§18): `shell--app`, `shell--public`, `shell__topbar`,
`shell__topbar-brand`, `shell__icon-button`, `shell__account`, `shell__locale`, `shell__user`,
`shell__avatar`, `shell__who`, `shell__scrim`, `shell__tabbar`, `icon`, `visually-hidden`,
`table--stack` (with `data-label` and `data-cell="corner" | "half"` on cells).

Added by the 2026-10-28 refresh: `screen__back` (the back link on sub-screens), `paste-item__facts`,
`fact`, `fact__label` (labelled quantity, size and colour chips) and `paste-item__price`.

`api-state`, `api-state__banner`, `api-state__skeleton`, `link-sheet`, `link-sheet__field`,
`search-box`, `list-item`, `list-item__lead`, `list-item__body`, `chip--selectable`, `variant-row`,
`variant-row--low`. Each must be reachable from a rendered screen (the `classes` harness rule).
