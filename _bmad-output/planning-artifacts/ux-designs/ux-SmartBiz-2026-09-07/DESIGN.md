---
name: SmartBiz BD
description: Bangla-first order-to-cash surface for Bangladeshi SME sellers — a paper ledger's calm, where a figure's status is legible before the number is read.
status: final
created: 2026-09-07
updated: 2026-09-11
sources:
  - ../../prds/prd-SmartBiz-2026-09-07/prd.md
  - ../../../../docs/scope.md
colors:
  ink-900: '#0B1014'
  ink-800: '#131A20'
  ink-700: '#1C242B'
  ink-600: '#2A343C'
  canvas: '#F6F5F1'
  canvas-sunk: '#EFEDE7'
  surface: '#FFFFFF'
  line: '#E4E0D8'
  line-strong: '#D2CDC2'
  line-control: '#8C8272'
  line-ink: '#263038'
  text: '#0B1014'
  text-2: '#414A52'
  text-3: '#656C74'
  text-on-ink: '#F3F1EC'
  text-on-ink-2: '#A8B2BA'
  text-on-ink-3: '#7F8B94'
  green-900: '#06382A'
  green-700: '#0A5B44'
  green-600: '#0C6E52'
  green-500: '#128766'
  green-100: '#DEEFE8'
  green-050: '#EFF7F3'
  brass-700: '#896532'
  brass-600: '#A97F42'
  brass-500: '#C09755'
  brass-100: '#F3E9D9'
  brass-050: '#FAF5EC'
  amber-700: '#8F5C11'
  amber-600: '#B4761A'
  amber-500: '#D9932A'
  amber-100: '#F8EBD3'
  amber-050: '#FCF6EA'
  red-700: '#8C2A2A'
  red-600: '#A83232'
  red-500: '#C24444'
  red-100: '#F6E0E0'
  red-050: '#FBEFEF'
  teal-700: '#0F5C5A'
  teal-600: '#12706E'
  teal-100: '#DCEDED'
  teal-050: '#EEF6F6'
  violet-700: '#4A3A7A'
  violet-600: '#5C4A96'
  violet-100: '#E8E3F4'
  violet-050: '#F4F1FA'
  realized: '{colors.green-600}'
  earned: '{colors.amber-600}'
  incomplete: '{colors.brass-600}'
typography:
  display:
    fontFamily: Noto Serif Bengali
    fontSize: 2.125rem
    fontWeight: '600'
    lineHeight: '1.15'
    letterSpacing: -0.015em
  h1:
    fontFamily: Noto Serif Bengali
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.15'
    letterSpacing: -0.015em
  h2:
    fontFamily: Noto Serif Bengali
    fontSize: 1.1875rem
    fontWeight: '600'
    lineHeight: '1.35'
  h3:
    fontFamily: Hind Siliguri
    fontSize: 1.0625rem
    fontWeight: '600'
    lineHeight: '1.35'
  body:
    fontFamily: Hind Siliguri
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: '1.55'
  sm:
    fontFamily: Hind Siliguri
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: '1.35'
  xs:
    fontFamily: Hind Siliguri
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.35'
  micro:
    fontFamily: Hind Siliguri
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: 0.09em
  money:
    fontFamily: Hind Siliguri
    fontWeight: '600'
    letterSpacing: -0.015em
    note: Tabular figures; size inherits from the row it sits in.
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 999px
spacing:
  unit: 4px
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 32px
  '8': 40px
  '9': 56px
  '10': 72px
  phone-width: 390px
  sidebar-width: 244px
components:
  elevation:
    e1: 0 1px 2px rgba(11, 16, 20, 0.05)
    e2: 0 1px 2px rgba(11, 16, 20, 0.05), 0 6px 16px -8px rgba(11, 16, 20, 0.10)
    e3: 0 1px 3px rgba(11, 16, 20, 0.06), 0 14px 32px -12px rgba(11, 16, 20, 0.16)
    e4: 0 2px 6px rgba(11, 16, 20, 0.08), 0 28px 60px -20px rgba(11, 16, 20, 0.28)
  motion:
    ease: cubic-bezier(0.2, 0.8, 0.2, 1)
    ease-out: cubic-bezier(0.16, 1, 0.3, 1)
    fast: 130ms
    base: 200ms
    slow: 320ms
    note: All three durations collapse to 1ms under prefers-reduced-motion.
  button-primary:
    background: '{colors.green-600}'
    color: '{colors.text-on-ink}'
    radius: '{rounded.md}'
    padding: '{spacing.3} {spacing.5}'
    shadow: '{components.elevation.e1}'
  button-ghost:
    background: transparent
    color: '{colors.text}'
    border: 1px solid {colors.line-control}
    radius: '{rounded.md}'
  card:
    background: '{colors.surface}'
    border: 1px solid {colors.line}
    radius: '{rounded.lg}'
    shadow: '{components.elevation.e1}'
    padding: '{spacing.4}'
  chip:
    radius: '{rounded.full}'
    fontSize: '{typography.xs.fontSize}'
    padding: '{spacing.1} {spacing.3}'
    note: display inline-flex — never block, or it stretches its row.
  basis-pill:
    radius: '{rounded.full}'
    fontSize: '{typography.micro.fontSize}'
    letterSpacing: '{typography.micro.letterSpacing}'
    realized-color: '{colors.realized}'
    earned-color: '{colors.earned}'
  completeness:
    bar-track: '{colors.canvas-sunk}'
    bar-fill: '{colors.incomplete}'
    bar-fill-full: '{colors.realized}'
    fontSize: '{typography.xs.fontSize}'
  provenance:
    background: '{colors.teal-050}'
    border: 1px solid {colors.teal-100}
    icon-color: '{colors.teal-600}'
    radius: '{rounded.md}'
  sheet:
    background: '{colors.surface}'
    radius: '{rounded.xl} {rounded.xl} 0 0'
    shadow: '{components.elevation.e4}'
    scrim: rgba(11, 16, 20, 0.42)
  toast:
    background: '{colors.ink-800}'
    color: '{colors.text-on-ink}'
    radius: '{rounded.md}'
    shadow: '{components.elevation.e3}'
  sidebar:
    width: '{spacing.sidebar-width}'
    background: '{colors.ink-900}'
    item-active-background: '{colors.ink-700}'
    item-color: '{colors.text-on-ink-2}'
  input:
    background: '{colors.surface}'
    border: 1px solid {colors.line-control}
    radius: '{rounded.md}'
    focus-border: '{colors.green-600}'
    focus-outline: 2px solid {colors.green-500}
    focus-outline-offset: 1px
---

# SmartBiz BD — Design Spine

This spine owns how SmartBiz BD looks. [EXPERIENCE.md](EXPERIENCE.md) owns how it behaves. Both win on conflict with any mock, screenshot, or import — including the prototype they were distilled from.

→ Interactive reference implementation: [prototype/index.html](../../../../prototype/index.html) (open directly; no build step). Every token above ships in [prototype/css/tokens.css](../../../../prototype/css/tokens.css).

## Brand & Style

The product handles the money of people who have never trusted software with their money. The aesthetic answer is not to look impressive — it is to look **accountable**. The reference object is a well-kept paper ledger: warm stock, ruled lines, a confident hand, nothing decorative competing with the figures.

The style is **Warm Ledger** — quiet surfaces, generous line work, one jewel accent, and typography that treats Bangla as the primary script rather than a translation of a Latin design. Premium here means restraint that reads as competence: a seller shows this screen to a supplier, and it should carry the authority of a printed statement.

Three commitments follow from the product's thesis and constrain everything below.

**Status before magnitude.** A figure's *status* — earned or realized, complete or caveated — must be legible before the number is read. Colour and the pill that accompanies a figure carry that status; the digits carry only magnitude.

**Bangla is the design, not the localisation.** Type is chosen and sized for Bangla glyph height and its taller ascender/descender load. Numerals render in Bangla digits by default. A layout that only holds together in English is broken.

**Nothing shouts.** No gradient fills on figures, no chart chrome, no celebratory colour on a number that is merely expected. Emphasis is spent on the one thing on a screen that needs a decision.

## Colors

The palette is functional before it is decorative: two neutrals and six hues, each hue owning exactly one meaning, so that a colour never has to be explained twice.

- **Canvas `{colors.canvas}`** — warm paper, deliberately not blue-grey. A blue-grey background reads as *dashboard*; this reads as *ledger*. `{colors.canvas-sunk}` recesses a region beneath it; `{colors.surface}` is the white a card lifts to.
- **Ink `{colors.ink-900}`–`{colors.ink-600}`** — near-black with a cool cast, used for the desktop sidebar, toasts, and any inverted surface. Ink is the frame; it never holds a figure.
- **Money green `{colors.green-600}`** — a jewel green, locally resonant and unmistakably the colour of cash confirmed. It is the primary action colour and the colour of **realized** money. It is *not* used for growth, success in general, or any figure that has not actually been collected.
- **Brass `{colors.brass-600}`** — the premium accent, and the marker of a figure carrying a **completeness caveat**. Used sparingly by rule: brass on a screen means either a moment of quality (the wordmark, an onboarding accent) or a number the seller should read with a qualification. `{colors.brass-500}` and `{colors.brass-100}` support it.
- **Amber `{colors.amber-600}`** — pending, in courier custody, **earned but not yours yet**. Amber is the single most load-bearing colour in the product: it is the visual difference between a sale and cash. Never used for a warning about system state.
- **Red `{colors.red-600}`** — loss, variance, negative, owed. Red marks a figure that moves against the seller, never merely an error dialog.
- **Teal `{colors.teal-600}`** — informational, system-explanatory, and **simulated**. Every provenance note ("this came from the courier file", "this courier is simulated") is teal, so a seller learns one colour for *where this came from*.
- **Violet `{colors.violet-600}`** — AI and assisted output. Violet **never touches a figure**. The model routes questions and phrases sentences; the moment a number appears it belongs to the application, and it wears green, amber, brass, or red instead. This boundary is a visual rule because it is a trust rule.

Semantic aliases exist so the meaning survives a palette change: `{colors.realized}`, `{colors.earned}`, `{colors.incomplete}`.

**Contrast floors, measured against the warm canvas rather than white.** A figure can sit on any of three backgrounds — `{colors.surface}`, `{colors.canvas}`, and `{colors.canvas-sunk}` — and `{colors.canvas-sunk}` is the least forgiving of the three, so every floor below is checked against it:

- **Text** — `{colors.text}`, `{colors.text-2}`, and `{colors.text-3}` all clear 4.5:1 on all three backgrounds. The ramp is darker than it looks like it should be for exactly this reason; three lighter greys would have collapsed to two accessible ones.
- **Figures in amber or brass** — `-600` clears 3:1 and is therefore reserved for a figure set large and bold. Anything smaller uses `-700`, which clears 4.5:1.
- **Control boundaries** — a border that bounds a control needs 3:1, which neither `{colors.line}` nor `{colors.line-strong}` meets. Those two are *ruled ledger lines*: decoration, correctly faint, no floor applies. `{colors.line-control}` exists for inputs, ghost buttons, outline chips, selectable tiles, and any status graphic that carries information. A border drawn around a *group* of controls is that group's boundary and owes the same 3:1 — the quantity stepper and the search field are both a bordered wrapper holding the control that matters — while a divider between the group's own parts is still a ruled line.
- **Focus** — a 2px `{colors.green-500}` outline with offset, never a pale halo. The halo this replaced measured 1.00:1 against the canvas, and the border it paired with sat 1.19:1 against its own resting colour: a focus indicator that was, in practice, absent.

**Amber and brass are 1.05:1 apart, and that is a constraint, not a bug to paint over.** They are neighbours in hue and near-identical in lightness, so a seller cannot tell *earned but not yours* from *carries a caveat* by colour. Darkening both to `-700` does not help — the pair moves to 1.11:1. Hence the rule: **neither colour is ever the sole carrier of its meaning.** Amber always travels with an explicit Recognition Basis label, and brass always travels with the Completeness Indicator's bar and its "based on N of M items". Colour is the fast read for someone who already knows the product; the words are what make it reliable. A future palette revision may separate the two hues, but the redundancy rule holds regardless, because it is also what makes the product legible to a colour-blind seller.

## Typography

Two families, both chosen for Bangla first.

- **Hind Siliguri** — the UI voice. A humanist Bangla sans with even stroke weight at small sizes, which is what makes a dense list row legible on a low-cost phone screen. It carries body copy, labels, list rows, and every figure.
- **Noto Serif Bengali** — the display voice, and the source of the product's premium register. Used for screen titles, the wordmark, and large figures where the extra authority is earned. Its Latin fallbacks (Iowan Old Style, Georgia) are chosen to keep the same editorial weight when a Latin string appears mid-sentence.

The ramp is deliberately short — eight steps from `{typography.micro.fontSize}` to `{typography.display.fontSize}` — because a ledger's hierarchy comes from position and rule lines, not from font-size variety. Two rules govern its use:

- **Eyebrows are always `{typography.micro}`** — an eyebrow is the small tracked label that sits above a screen title or a card head, naming the section rather than the content. Uppercase-equivalent in Latin, tracked out to `{typography.micro.letterSpacing}`; the tracking is what makes a `{typography.micro.fontSize}` label read as a deliberate label rather than as small text.
- **Figures use tabular alignment and tight tracking**, so a column of money lines up on the digit and a total sits directly under its parts. The currency mark `৳` is a separate span at reduced emphasis: the seller is reading the quantity, not the currency.

Bangla text sets on a taller line-height than a Latin equivalent would need — `{typography.body.lineHeight}` for body copy — because Bangla's matra and conjunct stack collide at tighter leading.

## Layout & Spacing

A **4px base** scale, `{spacing.1}` through `{spacing.10}`. Steps are named by level, never by pixel value, at every call site.

The product is two surfaces from one layout model. On the phone (`{spacing.phone-width}` reference width) content is a single column with a bottom tab bar and a sticky action footer where a screen commits something. On desktop the same column sits beside a fixed `{spacing.sidebar-width}` navigation rail; content grows to a comfortable measure rather than filling the monitor, because a ledger line that runs 1600px wide cannot be read across.

Density is tuned for the real job: a seller triaging thirty orders needs rows that scan, so list rows hold their height and truncate rather than wrap. **A row's sub-line truncates on one line; it never becomes two.** Cards separate concerns; within a card, spacing steps of `{spacing.3}`–`{spacing.4}` group, and `{spacing.6}`–`{spacing.7}` separate sections that are genuinely different subjects.

## Elevation & Depth

Four shadow levels. From `{components.elevation.e2}` up, each is layered — a tight contact shadow plus a wide, very soft ambient shadow — so that lift reads as physical rather than as a drawn outline.

- **`{components.elevation.e1}`** — cards at rest. Barely there; the border does most of the work.
- **`{components.elevation.e2}`** — a card that is selected or hovered.
- **`{components.elevation.e3}`** — toasts and popovers.
- **`{components.elevation.e4}`** — bottom sheets, the only element allowed to feel like it is floating above the app.

Depth is otherwise **tonal**: `{colors.canvas}` for the page, `{colors.surface}` for a card, `{colors.canvas-sunk}` for a recessed region. Borders are `{colors.line}` at 1px and are the primary separation device — this is the ledger's ruled line, and it is why the interface can stay almost shadowless and still read as structured.

## Shapes

Corners soften as elements grow, so scale reads through shape alone: `{rounded.sm}` for inline tags and small marks, `{rounded.md}` for buttons and inputs, `{rounded.lg}` for cards, `{rounded.xl}` for the top corners of a bottom sheet, `{rounded.full}` for filter chips, status chips, basis pills, avatars, and counts.

The logic: a fully rounded pill signals *label, not control* — a thing you read. A `{rounded.md}` rectangle signals *control* — a thing you press. Confusing the two makes a status chip look tappable, and in a money product a mistaken tap is expensive.

## Components

- **Presentation journey hub** — the design-first index in `mockups/all-screens.html`. It combines the Warm Ledger ink rail, editorial serif heading, ruled epic groups, and a green completeness meter. Every story row carries the exact story ID and title plus its target surface and viewport. The hub is not an app dashboard; it is a review and presentation instrument, and it is the only place where “76 of 76” is a valid primary figure.
- **Story frame** — a phone or desktop target nested inside the presentation stage. The frame shows one intentional state, one primary action, and three visible proof points. Operational stories use the nearest product pattern—form, list, detail, flow, state, table, or report. Infrastructure and policy stories use the `proof` pattern so their acceptance evidence remains visible rather than pretending they have a conventional CRUD screen.

- **Card** — the default container. `{colors.surface}` on `{colors.line}` at `{rounded.lg}` with `{components.elevation.e1}`. A `flush` variant drops padding so a list can run edge-to-edge inside it.
- **List row** — a lead icon, a body (title plus one truncating sub-line), an optional trailing figure, and a chevron when it navigates. The sub-line frequently carries a status chip, so the row's typography rules must target **direct children only**; a descendant rule forces the nested chip to `display: block`, and the chip then stretches the full width of the row.
- **Empty state** — centred: a 52px `{rounded.lg}` `{colors.canvas-sunk}` icon tile, a cause at `{typography.h3.fontSize}`, an explanation at `{typography.sm.fontSize}` held to `34ch` so it stays one readable measure, then the action that resolves it. This is also the surface a gated Role sees, which is why it must never look like an error.
- **Status chip** — `{rounded.full}`, `display: inline-flex`, a tinted dot plus a label. One tone per order status, drawn from the palette's meanings: teal `new`, brass `confirmed`/`packed`, amber `shipped`, green `delivered`/`settled`, red `returned`/`partial`, neutral `cancelled`.
- **Basis pill** — the product's thesis compressed into one element. Accompanies every figure and states its Recognition Basis: `{components.basis-pill.realized-color}` for *হাতে পাওয়া / realized*, `{components.basis-pill.earned-color}` for *অর্জিত / earned*. A figure's label must never straddle two bases.
- **Completeness indicator** — a thin bar plus "based on N of M items". Fill is `{components.completeness.bar-fill}` (brass — a caveat) while incomplete, and `{components.completeness.bar-fill-full}` (green) once N equals M. The whole indicator is a button: the gap is always explainable.
- **Money element** — tabular figure with the currency mark de-emphasised. Tone is set by meaning, and negative values take red plus an explicit minus sign, never parentheses, which do not read as negative to this audience.
- **Provenance note** — teal block with an info mark, stating where a figure or behaviour came from. Present wherever the seller might otherwise assume the app knows something it does not.
- **Button** — `primary` is solid `{colors.green-600}`; `ghost` is a `{colors.line-control}` outline; `danger` is red-outlined, never red-filled, because a filled red button gets pressed by accident.
- **Input** — `{colors.line-control}` border, focus per `{components.input.focus-outline}`. Money inputs are tabular and aligned to the inline end.
- **Quantity stepper** — an `{rounded.full}` `display: inline-flex` group on `{colors.line-control}`: a 32px minus button, a value at `{typography.body.fontSize}` with inline rules either side, a 32px plus button. An `sm` variant drops both buttons to 26px for dense rows. The value is tabular so it does not jitter as digits change, in either script.
- **Exclusive tile pair** — two tiles at `{rounded.md}` on a **1.5px** `{colors.line-control}` border (heavier than a Card, so a selectable object reads as selectable), each holding a bold label over a `{typography.xs.fontSize}` consequence line. The chosen tile takes a `{colors.green-600}` border with a `{colors.green-050}` wash; a destructive option takes `{colors.red-500}` with `{colors.red-050}`. Exactly one is marked — a pair with both marked or neither is a defect, not a state.
- **Filter chips** — a horizontal `{rounded.full}` row that scrolls without a visible scrollbar and bleeds to both edges, so a chip cut off at the edge signals that more follow. The active chip is filled; the rest are `{colors.line-control}` outlines. Always exactly one active.
- **Cash strip** — the dashboard's first element, and the product's answer in four cells. A `{colors.surface}` panel on `{colors.line}` at `{rounded.lg}`. Cells sit on a column grid with a `9.75rem` minimum, so a strip too wide for the screen scrolls horizontally rather than compressing a figure. Each cell is a button holding an `{rounded.full}` basis pill above a `{typography.h3.fontSize}` figure, and `{colors.line}` divides one cell from the next on the inline end, the last excluded. Never five cells; a fifth means one of them is not load-bearing.
- **Attention list** — rows inside a Card, each a full-width button padded `{spacing.3} {spacing.4}`, with a tinted lead icon, the named record, and a chevron. A row needing money attention washes from `{colors.red-050}` into transparent across the leading 60% of its width — a tint, not a fill, so the row still reads as a list row. The card is **absent** when there is nothing to decide, never present and empty.
- **Sticky footer** — `position: sticky; bottom: 0`, negative inline margins so it spans the full surface width, a `{colors.line}` top rule and a `{colors.surface}` background. The committing button stretches to the full width; a `rich` variant puts a figure at the leading edge and holds the button to its intrinsic width.
- **Bottom sheet** — `{rounded.xl}` top corners, `{components.elevation.e4}`, a grabber, a titled head with a close control, a scrolling body, an optional footer holding cancel plus commit. One level deep; never two.
- **Toast** — inverted `{colors.ink-800}` pill, `{components.elevation.e3}`, with room for one trailing action.
- **Sidebar (desktop)** — `{colors.ink-900}` rail, grouped nav (Work · Catalogue · Money · Insight · System), counts and warning badges inline, the current Member and Role pinned to the foot.
- **Tab bar (phone)** — five slots with a raised centre action for capture. Its fifth slot is **Courier & COD** for a Role that sees money and **Customers** for one that does not, so a gated Member sees no money destination at all, rather than one that refuses. The raised capture action is likewise **absent** for a Role that may not see a selling price, since an order cannot be captured without one: four slots and no centre action is a legitimate tab bar here.
- **Icons** — a single 24px stroked set at 1.7px weight, geometric and unfilled. Each order status carries its own glyph so the state machine reads as a sequence rather than as nine coloured dots.

## Do's and Don'ts

**Do**

- Pair every figure with its Recognition Basis, and use amber the moment money is earned but not collected.
- Use teal for provenance and violet for assisted output — both are trust signals, and they are only trustworthy if they are used consistently.
- Let borders carry structure and keep shadow almost absent at rest — but use `{colors.line-control}` the moment a border bounds a control rather than separates two rows.
- Truncate a list row's sub-line on one line; hold row height so a long list scans.
- Set both scripts from the same tokens, and check every screen in Bangla *and* English before calling it done.

**Don't**

- Never colour a figure violet, and never let the model's output stand where a computed number belongs.
- Never use green for a figure that has not been collected — green is realized money, not good news.
- Never render Latin digits in a Bangla view, including inside a timestamp. A localised date with a Latin clock is a half-translated product.
- Never fill a destructive button; outline it.
- Never introduce a colour for a new meaning. Six hues carry six meanings; a seventh meaning must reuse one or displace it.
- Never let a colour be the only thing distinguishing two meanings: amber never appears without a Recognition Basis label beside it, and brass never without a Completeness Indicator. And never assume a pale tint reads as a ring. Check the ratio — amber against brass is 1.05:1, and a `{colors.green-050}` halo against the canvas is 1.00:1.
- Never set informational text in a ruled-line colour. `{colors.line}` and `{colors.line-strong}` are for lines and nothing else — a permission table whose "No" cells were drawn in one is how this rule was learned, but it holds anywhere a line colour is reached for to mean *quiet*.
- Never target a list row's typography with a descendant selector — it will override the nested chip.
- Never stack a second bottom sheet on a bottom sheet.
