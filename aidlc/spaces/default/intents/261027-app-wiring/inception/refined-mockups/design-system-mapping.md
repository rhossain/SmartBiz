# Design System Mapping — App Wiring (B6)

> The design system is the existing `src/pres/` component set and `src/pres/tokens.css`. The
> prototype's `prototype/css/tokens.css` is the reference the production tokens were derived from.
> No new colour token is added; every new component is built from existing tokens.

## Tokens used

| Token | Value | Used for |
|-------|-------|----------|
| `--color-text` | `#1a1a1a` (16.1:1 on white) | body text |
| `--color-bg` / `--color-bg-muted` | `#ffffff` / `#f5f5f5` | page / card and skeleton |
| `--color-link` | `#1457b2` (7.0:1) | links, primary button background (`--color-on-primary` text 7.5:1) |
| `--color-error` | `#a4252b` (6.8:1) | error text, banners, `danger` pill |
| `--color-success` | `#1f6f3d` (5.4:1) | saved toast, `success` pill |
| `--color-border` | `#6b6b6b` (4.9:1) | input borders, dividers (meets 3:1 for UI) |
| `--space-1…8` | 4–32 px | all spacing; gutter `--space-4` |
| `--font-ui` | Hind Siliguri, Noto Sans Bengali, system-ui | all text (offline fallback chain kept) |
| `--font-size-sm/base/lg/xl` | 14/16/20/24 px | hint / body / h2 / h1 |
| `--focus-ring` | 3 px `rgba(20,87,178,.4)` | every focusable element |

**Gap:** there is no `warning` colour token yet, but `Pill` has a `warning` kind. The functional design
must add `--color-warning` with a measured ratio ≥ 4.5:1 on white (for example `#8a5a00`, 5.9:1), and
the contrast harness must cover it before `RiskChip` level 2 or `LowStockMark` ship.

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
`api-state`, `api-state__banner`, `api-state__skeleton`, `link-sheet`, `link-sheet__field`,
`search-box`, `list-item`, `list-item__lead`, `list-item__body`, `chip--selectable`, `variant-row`,
`variant-row--low`. Each must be reachable from a rendered screen (the `classes` harness rule).
