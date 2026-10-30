# Design System Mapping — App Wiring (B6)

> The design system is the existing `src/pres/` component set and `src/pres/tokens.css`. The
> prototype's `prototype/css/tokens.css` is the reference the production tokens were derived from.
> No new colour token is added; every new component is built from existing tokens.

## Tokens used

> **Updated 2026-10-30 (redesign v2, `mockups.md` §19).** Token names are kept so the screens did
> not change; values moved to a cooler, cleaner palette with one brand colour. Added:
> `--color-brand-deep`, `--radius-xl`, `--space-12`, `--shadow-xs`, `--shadow-hero`,
> `--content-max` and translucent layers (`--glass`, `--glass-line`, `--glow-*`,
> `--hairline-on-dark`), which are never used as text colours. Every colour token is in at least
> one pair measured by `tests/unit/contrast.test.ts`. The §18 values are in git history.

| Token | Value | Used for |
|-------|-------|----------|
| `--color-text` | `#111a16` (17.8:1 on white) | body text, figures |
| `--color-text-2` | `#4a5550` (7.6:1 on white, 7.2:1 on canvas) | labels, secondary text |
| `--color-text-3` | `#626d68` (5.4:1 on white, 5.0:1 on canvas) | captions, column heads, phone cell labels, placeholders |
| `--color-canvas` | `#f5f6f3` | page background (cool neutral) |
| `--color-surface` / `--color-surface-2` | `#ffffff` / `#f9faf8` | section cards, inputs, buttons / inset blocks inside a card, table heads |
| `--color-line` | `#e5e8e4` | hairline borders and rules (decorative) |
| `--color-control-border` | `#8a938f` (3.2:1) | borders that bound an input (WCAG 1.4.11) |
| `--color-header-bg` / `-text` / `-muted` / `-active` | `#0c1613` / `#eaf0ed` (16.0:1) / `#9db0a8` (8.1:1) / `#16241f` | ink sidebar and drawer; lit nav row, account card |
| `--color-accent` / `--color-accent-text` | `#d6b36a` (ink on it 9.2:1) / `#8a6420` (5.4:1 on white) | gold brand tile, avatar, current-page bar and icon, "earned" marker |
| `--color-brand` / `-dark` / `-deep` | `#0b6e52` (white on it 6.2:1) / `#085a43` (8.2:1) / `#06382a` (12.0:1) | links, primary buttons (top-to-bottom gradient brand → dark), current tab, focus ring; hover; hero gradient start |
| `--color-on-brand-muted` | `#cfe9dd` (4.9:1 on brand, 10.2:1 on deep) | labels on the daily-card hero tile |
| `--color-brand-tint` / `--color-bg-success` | `#eff7f3` / `#e4f2eb` | row-action hover, link chips / success pill, current-tab pill |
| `--color-warning` / `--color-bg-warning` | `#9a5f0c` / `#fbefd9` (4.6:1) | warning pill, incomplete item edge |
| `--color-error` / `--color-bg-error` | `#a4252b` / `#fbeaea` (6.3:1) | danger pill, error banners |
| `--color-bg-neutral` / `--color-bg-muted` | `#eef0ec` (text-2 on it 6.8:1) | neutral pill, counts, segmented control track, disabled buttons |
| `--color-link` | `#0b6e52` (6.2:1) | inline links (no more stray blue); focus outline |
| `--radius-xs/sm/md/lg/xl/pill` | 6 / 10 / 14 / 18 / 24 / 999 px | options / controls / inset blocks / section cards / hero tiles and sign-in card / pills |
| `--shadow-xs`, `--shadow-raised`, `--shadow-card`, `--shadow-float`, `--shadow-button`, `--shadow-hero`, `--ring-brand` | layered, low-contrast | inputs, buttons, section cards, drawer and toast, primary buttons, daily hero, focus halo |
| `--glass`, `--glass-line` | 86 % white, 8 % ink | frosted phone top bar and tab bar (with backdrop blur) |
| `--sidebar-width`, `--topbar-height`, `--tabbar-height`, `--content-max` | 256 / 56 / 64 / 1180 px | shell layout (§18.1); content column centred beside the sidebar |
| `--space-1…12` | 4–48 px | spacing; 48 px desktop gutter, 24 px tablet, 16 px phone |
| `--font-ui` | Inter (if installed), system-ui, Hind Siliguri, Noto Sans Bengali, Kohinoor Bangla | no hosted font (CSP `default-src 'self'`) |
| `--focus-ring-outline` | 2 px solid brand + 4 px halo | every focusable element |

### Visual language

- **Type scale:** screen title 30 px / 700, −0.025 em (26 px on phones); section heading 16 px /
  650; labels 13 px / 600 in `--color-text-2`; captions 12 px in `--color-text-3`; stat figures
  26–34 px / 700 with tabular numerals and tight tracking.
- **Surfaces (v2):** the screen is open on the canvas, centred in a 1180 px column. Each section
  (stat card, filter, table, form, panel, contact, totals, actions) is one white card with a
  hairline and `--shadow-card`, radius 18. Inside a card, groups are inset `surface-2` blocks or
  titled sections under a hairline; never a card inside a card.
- **Chrome:** ink sidebar with a faint gold glow (desktop); frosted light top bar + drawer +
  frosted bottom tab bar (phone). Gold marks only the brand and the current page.
- **Controls:** 44 px inputs and primary buttons, 40 px secondary buttons, 34–36 px row buttons
  and in-table inputs, 44 px icon buttons. Phone inputs are 16 px text so iOS never zooms.
- **Buttons:** one emerald gradient button per area; the rest are white with a hairline. A row's
  action is a quiet emerald text button with an arrow. Disabled is a grey control, not a faded
  primary.
- **Pills:** 11.5 px / 600 with a leading dot; the text always carries the meaning (NFR9.9). Basis
  and completeness pills appear on every money figure at every width (§18 D18-4).
- **Icons:** twelve inline 24 px stroke SVGs in `Shell.tsx`, decorative (`aria-hidden`), never the
  only label.
- **Motion:** 120–280 ms ease-out on hover, drawer and toast; all of it off under
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

Added by redesign v2 (§19): `stat`, `stat--earned`, `stat--realized`, `stat--pipeline`,
`stat__label` (the orders summary cards) and `paste-input` (the message card on the paste screen).

Added by the 2026-10-30 redesign (§18): `shell--app`, `shell--public`, `shell__topbar`,
`shell__topbar-brand`, `shell__icon-button`, `shell__account`, `shell__locale`, `shell__user`,
`shell__avatar`, `shell__who`, `shell__scrim`, `shell__tabbar`, `icon`, `visually-hidden`,
`table--stack` (with `data-label` and `data-cell="corner" | "half"` on cells).

Added by the 2026-10-28 refresh: `screen__back` (the back link on sub-screens), `paste-item__facts`,
`fact`, `fact__label` (labelled quantity, size and colour chips) and `paste-item__price`.

`api-state`, `api-state__banner`, `api-state__skeleton`, `link-sheet`, `link-sheet__field`,
`search-box`, `list-item`, `list-item__lead`, `list-item__body`, `chip--selectable`, `variant-row`,
`variant-row--low`. Each must be reachable from a rendered screen (the `classes` harness rule).
