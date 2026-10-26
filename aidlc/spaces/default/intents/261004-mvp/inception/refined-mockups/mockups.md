# SmartBiz BD — Refined Mockups

> Mid-fidelity mockups for the 39 MVP user stories, anchored to the
> brownfield prototype's component inventory (30 items), the 12 FR
> clusters and 8 NFR clusters, and the 10 rough wireframes in
> `ideation/rough-mockups/wireframes.md`. The deferral markers on
> US1.14 / US1.15 / US1.16 / US3.9 carry forward as
> `[Deferred]` placeholders in this stage. The prototype's
> `tokens.css` is the design-system baseline; the role × capability
> matrix and the basis-pill / completeness control conventions are
> load-bearing and carry forward verbatim.

## Scope

- **One mockup per story screen, with a dedicated low-stock
  surface.** 15 mockup blocks cover the 30 story-bearing screens
  (S1–S14 + the dedicated S4-low for US1.9.3). The 9 system /
  operational stories (US1.4 role-gate, US2.10 recognition-basis
  invariant, US3.5–US3.8 settings/audit/test targets) have no
  surface by design and are documented in the interaction-spec
  and the accessibility-checklist instead. The rough wireframes'
  10 screens are the spine; the additional mockups come from the
  7 input modes (US1.10–US1.16), the daily card (US3.1), the
  audit trail (US3.2), the role-restricted surfaces (US3.3), the
  business toggles (US3.4), the low-stock screen (US1.9.3 +
  US2.7), the consignment detail (US2.1), the settlement
  variance disposition state machine (US2.2), the supplier
  detail (US2.6), the returned-stock physical-received event
  (US2.8), the stock-adjustment screen (US2.9), and the deferred
  inputs + dashboard placeholder.
- **Mid-fidelity, not pixel-perfect.** Real labels, real layout,
  real Bangla copy, real component composition. Colors and spacing
  follow `tokens.css`; the per-component CSS is not transcribed. The
  work downstream is Component Design / Functional Design; this
  document is the spec they implement.
- **`[Deferred]` is honest, not silent.** The 4 deferred stories
  (US1.14 photo, US1.15 spreadsheet, US1.16 voice, US3.9 dashboard)
  appear in this document as labelled placeholders that name the
  reason for the deferral and the Construction-stage resolution.

## Navigation surface (shared chrome)

The navigation surface, app bar, sidebar, and bottom-tab bar are
shared chrome and appear on every authenticated screen. The
composition is mid-fidelity, anchored to the prototype's
`#chrome` (5 toggles) and `.sidebar` / `.tabbar` / `.topbar` /
`.statusbar` styles.

### Desktop (≥1024px)

```
+--------------------------------------------------------------+
| [Logo: SmartBiz BD]               [User menu ▾] [Role chip] |
+----------+---------------------------------------------------+
|          |                                                   |
| অর্ডার    |   <page content here>                            |
| গ্রাহক    |                                                   |
| পণ্য     |   (h1 → primary action → summary → table)         |
| মজুদ     |                                                   |
| খরচ     |                                                   |
| বাকি    |                                                   |
| সরবরাহকারী|                                                  |
| প্রতিষ্ঠান|                                                  |
|          |                                                   |
+----------+---------------------------------------------------+
```

Sidebar is 244 px (the prototype's `--sidebar-w` token). Module
names are in Bangla per Q1 of rough-mockups. Active module carries
the `--line-control` 3 px left edge.

### Tablet (768–1023px)

```
+----------------------------+
| ☰  SmartBiz BD        [👤] |
+----------------------------+
|                            |
|  <page content>            |
|                            |
+----------------------------+
```

Sidebar collapses to a top hamburger menu (`☰`); the active module
name appears next to the hamburger label. The bottom tab bar is
hidden on tablet.

### Mobile (<768px)

```
+----------------------------+
| ☰  SmartBiz BD        [👤] |
+----------------------------+
|                            |
|  <page content>            |
|                            |
+----------------------------+
|  অর্ডার (active)           |  <- bottom tab nav on smallest viewports
+----------------------------+
```

Sidebar collapses to the top hamburger. Bottom-tab bar carries the 5
most-used modules (অর্ডার, গ্রাহক, পণ্য, মজুদ, বাকি); the other 3
(খরচ, সরবরাহকারী, প্রতিষ্ঠান) live under a "আরও" overflow tab.

## S1 — Login / Register (US1.1, US1.2)

```
+------------------------------+
|  SmartBiz BD                 |
|  ------------------          |
|  ইমেইল: [_______________]    |
|  পাসওয়ার্ড: [_______________]  |
|                              |
|  [   লগইন করুন   ]           |
|                              |
|  নতুন ব্যবসা রেজিস্টার করুন?  |
+------------------------------+
```

- **Composition**: h1 "SmartBiz BD" → form (email, password) →
  primary action (লগইন) → secondary action (রেজিস্টার). Two actions
  are not adjacent: রেজিস্টার sits below the primary as a
  text link per the prototype's `--brass-700` style.
- **States**:
  - empty: form fields blank, primary disabled until both filled
  - loading: inline spinner next to primary, primary disabled
  - success: redirect to S2 (first-run) or last-visited module
  - error: inline form error in Bangla, e.g. "ভুল ইমেইল বা পাসওয়ার্ড"
- **Accessibility**: h1 title, role-gate not yet applied (auth
  surface), keyboard entry at email field, autocomplete attributes
  set.
- **Story coverage**: US1.1 (sign-up + business auto-provisioning),
  US1.2 (sign-in + recovery).

## S2 — Business Setup (US1.1, US1.3, US1.5)

```
+--------------------------------------------------------------+
| প্রতিষ্ঠান সেটআপ                                              |
+--------------------------------------------------------------+
|  প্রতিষ্ঠানের নাম: [____________________________]            |
|  ঠিকানা: [________________________________]                 |
|  ফোন: [_________________________________]                 |
|                                                              |
|  ## কর্মী আমন্ত্রণ                                            |
|                                                              |
|  [ + নতুন কর্মী যোগ করুন ]                                   |
|                                                              |
|  | নাম | ইমেইল | ভূমিকা | স্ট্যাটাস |                          |
|  |------|-------|-------|---------|                          |
|  | ...  | ...   | ...   | ...     |                          |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Composition**: h1 "প্রতিষ্ঠান সেটআপ" → form (name, address,
  phone) → h2 "কর্মী আমন্ত্রণ" → invite table → primary save.
  Save is the only primary action; invite row actions are
  secondary.
- **States**:
  - empty: form fields blank, invite table empty-state
    ("এখনো কোনো কর্মী নেই")
  - loading: inline spinner on save
  - success: redirect to S4 Products (first-run onboarding continues)
  - error: field-level + form-level validation
- **Accessibility**: h1; h2; primary at top; table has caption; the
  four non-Owner roles (Manager, Sales Staff, Inventory Staff,
  Accountant) are listed in the role select with Bangla labels.
- **Story coverage**: US1.1 (sign-up), US1.3 (staff invite),
  US1.5 (business profile edit).

## S3 — Customers (US1.6, US1.7)

```
+--------------------------------------------------------------+
| গ্রাহক                                            [+ নতুন]   |
+--------------------------------------------------------------+
|  মোট গ্রাহক: 0    বাকি গ্রাহক: 0                             |
|                                                              |
|  ## সকল গ্রাহক                                                |
|                                                              |
|  | নাম | ফোন | ঠিকানা | বাকি | অর্ডার |                   |
|  |------|-----|--------|------|-------|                       |
|  | ...  | ... | ...    | ...  | ...   |                       |
|                                                              |
|  Search [_______________]                                    |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary action (নতুন, top-right) →
  summary tiles (মোট গ্রাহক, বাকি গ্রাহক) → h2 list → search →
  table with risk chip on each row.
- **States**:
  - empty: "এখনো কোনো গ্রাহক নেই — [+ নতুন গ্রাহক]"
  - loading: skeleton rows
  - success: populated list, search filters as typed
  - error: inline banner
  - partial: 1 customer, 5 customers, 100 customers (table
    pagination)
- **Accessibility**: h1; h2; table caption; search field labelled
  with `aria-label`; sortable column headers carry
  `aria-sort` attribute.
- **Role gate**: Manager, Sales Staff, Accountant, Inventory Staff
  see every column; the absence-asserted harness runs the
  test-target role (no production role named "Viewer") to prove
  the no-money-figure invariant per `accessibility-checklist §3
  R-3 / R-8`.
- **Story coverage**: US1.6 (customer create), US1.7 (customer
  search + detail).

## S4 — Products (US1.8, US1.9)

```
+--------------------------------------------------------------+
| পণ্য                                              [+ নতুন]   |
+--------------------------------------------------------------+
|  মোট পণ্য: 0    কম মজুদ: 0                                  |
|                                                              |
|  ## সকল পণ্য                                                  |
|                                                              |
|  | SKU | নাম | ক্যাটাগরি | ক্রয়মূল্য | বিক্রয়মূল্য | মজুদ | |
|  |-----|-----|----------|-----------|-------------|------| |
|  | ... | ... | ...      | ...       | ...         | ...  | |
|                                                              |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary action → summary tiles → h2 list →
  table.
- **Role gate**: ক্রয়মূল্য (cost) hidden from Sales Staff; বিক্রয়মূল্য
  (price) hidden from Inventory Staff; the role × capability matrix
  in `component-inventory §5` is the source of truth.
- **States**: empty, loading, success, error, partial. Low-stock
  variants are surfaced on the dedicated S4-low screen (US1.9.3).
- **Low-stock link**: the "কম মজুদ" summary tile on S4 routes to
  S4-low; per-row low-stock indicators on S4 also deep-link to
  S4-low with the parent product context.

## S4-low — Low-Stock List (US1.9.3)

```
+--------------------------------------------------------------+
| ← S4 / পণ্য                                                  |
| কম মজুদ                                       [সেটিংস]      |
+--------------------------------------------------------------+
|  ## কম মজুদের পণ্যসমূহ                                        |
|                                                              |
|  | পণ্য      | ভ্যারিয়েন্ট | মজুদ | সর্বনিম্ন | সরবরাহকারী    |   |
|  |-----------|------------|------|----------|-------------|   |
|  | T-শার্ট  | L / কালো   | ১    | ৫        | ABC ট্রেডার্স ▾ |   |
|  | T-শার্ট  | M / সাদা   | ২    | ৫        | ABC ট্রেডার্স ▾ |   |
|  | চা পাতা  | ১ কেজি      | ৩    | ১০       | —           |   |
|                                                              |
|  | [পণ্যে যান]   [সরবরাহকারী → রিস্টক]                       |
+--------------------------------------------------------------+
```

- **Purpose (US1.9.3)**: dedicated low-stock screen lists every
  variant whose current stock is below its minimum, with a link
  to the parent product (S4) and a one-tap CTA to the suggested
  supplier (routes to S5-adjust restock with the variant
  pre-filled).
- **Composition**: h1 → h2 list → per-row table → per-row
  `[পণ্যে যান]` and `[সরবরাহকারী → রিস্টক]` actions. The
  product row carries `<a href="...">` to S4; the supplier CTA
  routes to S5-adjust with the variant pre-filled.
- **Sort order**: by delta from minimum ascending (most urgent
  first).
- **Empty state**: "সব পণ্য মজুদ আছে" with a link back to S4.
- **Role gate**: Manager, Owner, Inventory Staff, Accountant
  (per US1.9.3 — sales staff do not restock; their role ×
  capability matrix says so). Sales Staff sees the role-locked
  empty state.
- **States**: empty (all stocked), loading, success, error,
  partial (filter active on a single product).
- **Accessibility**: h1; h2; table caption; each row's
  `[পণ্যে যান]` and `[সরবরাহকারী → রিস্টক]` are labelled
  buttons; the product link carries an `aria-label` that
  includes the variant name; sort order is announced.
- **Story coverage**: US1.9.3.
- **Accessibility**: h1; h2; table caption; sortable column
  headers.
- **Story coverage**: US1.8 (product create), US1.9 (variant review
  + low-stock).

## S5 — Inventory (US1.9, US2.7, US2.8, US2.9)

```
+--------------------------------------------------------------+
| মজুদ                                              [+ লেনদেন] |
+--------------------------------------------------------------+
|  মোট SKU: 0    কম মজুদ: 0    ক্ষতিগ্রস্ত: 0                  |
|                                                              |
|  ## লেনদেন ইতিহাস                                                |
|                                                              |
|  | তারিখ | পণ্য | প্রকার | পরিমাণ | নোট |                   |
|  |-------|------|--------|-------|-----|                       |
|  | ...   | ...  | ...    | ...   | ... |                       |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary action (লেনদেন) → summary tiles
  → h2 transaction list.
- **Transactions**: auto-transactions (order shipped, returned
  physical-received, restock) are read-only; manual transactions
  (count correction, stock-in, damaged stock) open the S5-adjust
  modal.
- **States**: empty, loading, success, error, partial.
- **Accessibility**: h1; h2; date column carries accessible name;
  per-transaction expandable detail with `aria-expanded`.
- **Story coverage**: US1.9.3 (low-stock list), US2.7 (restock),
  US2.8 (physical-received), US2.9 (stock adjustment).

## S6 — Orders (US1.18)

```
+--------------------------------------------------------------+
| অর্ডার                                            [+ নতুন]   |
+--------------------------------------------------------------+
|  মোট অর্ডার: 0    ডেলিভারি: 0    বাকি: 0    রিটার্ন: 0        |
|                                                              |
|  ## অর্ডার তালিকা                                              |
|                                                              |
|  | অর্ডার# | গ্রাহক | তারিখ | মোট | স্ট্যাটাস |               |
|  |---------|--------|-------|-----|----------|               |
|  | ...     | ...    | ...   | ... | ...      |               |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary action → summary tiles → h2 list
  → table. The summary tile counts (ডেলিভারি, বাকি, রিটার্ন)
  use `App.countByStatus(status)` over the 9-value enum; the
  recognition-basis math (`EARNED_STATUSES`,
  `REALIZED_STATUSES`, `PIPELINE_STATUSES`) is the **money**
  invariant applied on S7h / S11 / S12 only (see
  `design-system-mapping §5`).
- **Role gate**: every column visible to Manager, Sales Staff,
  Accountant, Inventory Staff; the absence-asserted harness runs
  the test-target role (no production role named "Viewer") to
  prove the no-money-figure invariant per `accessibility-checklist
  §3 R-3 / R-8`.
- **States**: empty, loading, success, error, partial (filter
  active).
- **Accessibility**: h1; h2; table caption; status column carries
  accessible name per status (`new` → "নতুন", `confirmed` → "নিশ্চিত",
  etc.).
- **Story coverage**: US1.18.

## S7 — Order Detail / COD (US1.10–US1.17, US2.1, US2.2, US2.3)

The S7 family is the most complex. There are 6 input-mode variants
plus the order detail / COD view; each is its own mockup.

### S7a — Order create: paste-parse (US1.10)

```
+--------------------------------------------------------------+
| নতুন অর্ডার (paste-parse)                       [← ফিরে যান] |
+--------------------------------------------------------------+
|  গ্রাহক: [_____________________] (auto-filled from phone)     |
|  তারিখ:  [_____________________]                              |
|                                                              |
|  ## মেসেজ পেস্ট করুন                                            |
|  +-------------------------------------------+                |
|  |                                           |                |
|  | <paste your order message here>           |                |
|  |                                           |                |
|  +-------------------------------------------+                |
|                                                              |
|  [   পার্স করুন   ]                                          |
|                                                              |
|  ## পার্স করা আইটেম                                            |
|  | পণ্য | ভ্যারিয়েন্ট | পরিমাণ | দাম | ছাড় | মোট |            |
|  | ...  | ...         | ...    | ... | ...  | ... |            |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Segment-isolation rule** (the most regression-prone code path,
  per `team-practices §"Critical regression-prone path coverage"`):
  the parse button triggers `parseMessage` which applies
  *"an item's details come from the item's own words"* verbatim.
  Tests restate the rule inline (CC-AC-STATUS-BUCKET).
- **Composition**: h1 → customer/date row → h2 paste area →
  parse action → h2 parsed items → save. Per-line variant matrix
  picker is an inline popover.
- **Accessibility**: h1; h2 sections; paste textarea labelled;
  parse button focusable; segment-isolation failure is asserted in
  jsdom, not from a screenshot (NFR2.2).
- **Story coverage**: US1.10.

### S7b — Order create: manual (US1.11)

```
+--------------------------------------------------------------+
| নতুন অর্ডার (manual)                          [← ফিরে যান] |
+--------------------------------------------------------------+
|  গ্রাহক: [_______________]                                   |
|  তারিখ:  [_______________]                                   |
|                                                              |
|  ## আইটেম                                                    |
|  +---------------------------------------------+              |
|  | পণ্য [___] ভ্যারিয়েন্ট [___] পরিমাণ [__]   |              |
|  | ছাড় [__]                                  |              |
|  |                                  [অপসারণ] |              |
|  +---------------------------------------------+              |
|  | পণ্য [___] ভ্যারিয়েন্ট [___] পরিমাণ [__]   |              |
|  | ছাড় [__]                                  |              |
|  +---------------------------------------------+              |
|  [ + আইটেম যোগ করুন ]                                       |
|                                                              |
|  অর্ডার-ছাড়: [_______]    ডেলিভারি চার্জ: [_______]          |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Composition**: per-line form rows; each row carries product,
  variant, qty, discount. Per-order discount and delivery charge
  are the only global fields. Save records the order with
  `source: "manual"`.
- **Accessibility**: each row is a labelled group; "+" is the only
  primary action until save.
- **Story coverage**: US1.11.

### S7c — Order create: repeat (US1.12)

```
+--------------------------------------------------------------+
| নতুন অর্ডার (repeat)                          [← ফিরে যান] |
+--------------------------------------------------------------+
|  আগের অর্ডার থেকে: #ORD-1234 (গ্রাহক: C-08)                  |
|  তারিখ:  [_______________]                                   |
|                                                              |
|  ## আইটেম (আগের অর্ডার থেকে কপি)                                |
|  | পণ্য | ভ্যারিয়েন্ট | পরিমাণ | দাম | ছাড় | মোট |            |
|  | ...  | ...         | ...    | ... | ...  | ... |            |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Composition**: source-order reference is read-only; items are
  pre-filled and editable; date defaults to today.
- **Story coverage**: US1.12.

### S7d — Order create: quick-add (US1.13)

```
+--------------------------------------------------------------+
| নতুন অর্ডার (quick-add)                       [← ফিরে যান] |
+--------------------------------------------------------------+
|  গ্রাহক: [_______________]                                   |
|  পণ্য:   [_______________] ভ্যারিয়েন্ট: [_______________]   |
|  পরিমাণ: [_______________]                                   |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Composition**: a single-item form, 4 fields; primary action is
  the only save.
- **Story coverage**: US1.13.

### S7e — Order create: photo (US1.14) **[Deferred]**

```
+--------------------------------------------------------------+
| নতুন অর্ডার (photo)                           [← ফিরে যান] |
+--------------------------------------------------------------+
|  [Deferral notice]                                           |
|  ছবি থেকে অর্ডার ক্যাপচার phase 2 এ উপলব্ধ হবে।              |
|  OCR ভেন্ডর নির্বাচন Construction পর্যায়ে সম্পন্ন হবে।       |
|                                                              |
|  [   ফিরে যান   ]                                            |
+--------------------------------------------------------------+
```

- **Deferral marker**: photo capture ships in phase 2 per
  US1.14.D; OCR vendor resolution is a Construction-stage decision
  (A1). The placeholder explains the deferral in Bangla so the
  Owner understands why the surface is unavailable.
- **Story coverage**: US1.14.

### S7f — Order create: spreadsheet (US1.15) **[Deferred]**

```
+--------------------------------------------------------------+
| নতুন অর্ডার (spreadsheet)                      [← ফিরে যান] |
+--------------------------------------------------------------+
|  [Deferral notice]                                           |
|  স্প্রেডশিট থেকে অর্ডার ইম্পোর্ট phase 2 এ উপলব্ধ হবে।        |
|  নির্বাচিত ফরম্যাট (.xlsx / .csv) US1.15.1 এ চূড়ান্ত।         |
|                                                              |
|  [   ফিরে যান   ]                                            |
+--------------------------------------------------------------+
```

- **Deferral marker**: same Construction-stage resolution as US1.14.
- **Story coverage**: US1.15.

### S7g — Order create: voice (US1.16) **[Deferred]**

```
+--------------------------------------------------------------+
| নতুন অর্ডার (voice)                           [← ফিরে যান] |
+--------------------------------------------------------------+
|  [Deferral notice]                                           |
|  ভয়েস থেকে অর্ডার ক্যাপচার phase 2 এ উপলব্ধ হবে।              |
|  STT (Web Speech API vs free-tier cloud) নির্বাচন            |
|  Construction পর্যায়ে সম্পন্ন হবে।                            |
|                                                              |
|  [   ফিরে যান   ]                                            |
+--------------------------------------------------------------+
```

- **Deferral marker**: STT vendor deferred to Construction; the
  segment-isolation rule (US1.10.2) applies when the surface
  lands.
- **Story coverage**: US1.16.

### S7h — Order detail / COD (US1.17, US2.1, US2.3)

```
+--------------------------------------------------------------+
| অর্ডার #ORD-1234                              [← ফিরে যান]    |
+--------------------------------------------------------------+
|  গ্রাহক: C-08 (রহিম মিয়া)                                    |
|  তারিখ: ২০২৬-১০-১১                                          |
|  স্ট্যাটাস: [Confirmed ▾]                                    |
|                                                              |
|  ## আইটেম                                                    |
|  | পণ্য | পরিমাণ | দাম | ছাড় | মোট |                       |
|  | ...  | ...   | ... | ... | ... |                          |
|                                                              |
|  ## কনসাইনমেন্ট (শিপড হলে)                                     |
|  কুরিয়ার: [_______________]                                |
|  কনসাইনমেন্ট আইডি: [_______________]                        |
|  COD পরিমাণ: ৳[_______________]                              |
|  কুরিয়ার চার্জ: ৳[_______________]                          |
|  ডেলিভারি স্ট্যাটাস: [delivered ▾]                           |
|                                                              |
|  ## পেমেন্ট (delivered হলে)                                    |
|  পরিশোধিত: ৳[_______________]                                |
|  [   পার্শ্ব পেমেন্ট রেকর্ড করুন   ]                          |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Status lifecycle (US1.17)**: the nine-value enum (`new` /
  `confirmed` / `packed` / `shipped` / `delivered` / `settled` /
  `cancelled` / `returned` / `partial`) is partitioned into
  directly-selectable and derived-only sets; the discriminated
  string-literal union with `never`-asserted default catches any
  future addition at compile time. The select is exhaustive —
  there is no "other" option.
  - **Directly selectable on S7h**: `new`, `confirmed`, `packed`,
    `shipped`, `delivered`, `cancelled`, `returned`. These are
    the values the user picks on the order detail screen.
  - **Derived only** (never exposed in the S7h select):
    - `settled` — set by the S11 settlement-run disposition
      (US2.2.3 / US1.17.3). The S11 "matched" disposition moves
      the order to `settled` and flips the basis pill from
      `earned` to `realized`.
    - `partial` — a derived view surfaced on the order list
      (US2.3.2) when partial COD has been collected; not a
      status the user picks.
- **Status transitions**:
  - `[Confirmed] → [Shipped]` triggers an automatic inventory
    stock-out transaction for each order item.
  - `[Shipped] → [Delivered]` unlocks the COD field and the
    payment record.
  - `[Delivered] → [Settled]` is **derived** from S11 matched
    disposition (US2.2); the S7h select never offers `settled`
    as a destination.
  - `[*] → [Returned]` triggers US2.8 physical-received flow.
  - `[*] → [Cancelled]` writes off the inventory.
- **Consignment (US2.1)**: consignment fields appear only after
  the order moves to `shipped`; courier configuration is
  per-business and the Owner can add a new courier inline.
- **COD payment (US2.3)**: the "collect partial" action records a
  `Payment` ledger entry and reduces the derived due balance; the
  basis pill stays `earned` until the underlying order is
  courier-reconciled (US2.2).
- **Composition**: h1 → header row → status select → h2 items →
  h2 consignment (conditional) → h2 payment (conditional) → save.
- **Accessibility**: h1; h2; status select labelled; the basis
  pill (US2.10) is visible next to every money figure.
- **Story coverage**: US1.17, US2.1, US2.3.

## S8 — Expenses (US2.5)

```
+--------------------------------------------------------------+
| খরচ                                               [+ নতুন]  |
+--------------------------------------------------------------+
|  এই মাস: ৳0    এই বছর: ৳0                                   |
|                                                              |
|  ## সকল খরচ                                                   |
|                                                              |
|  | তারিখ | ক্যাটাগরি | পরিমাণ | নোট |                       |
|  |-------|----------|-------|-----|                          |
|  | ...   | ...      | ...   | ... |                          |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary → summary tiles → h2 list → table.
  Category list is editable per business (FR7.2).
- **Role gate**: every column visible to Owner, Manager,
  Accountant; Sales Staff and Inventory Staff see no money
  figures.
- **States**: empty, loading, success, error, partial.
- **Accessibility**: h1; h2; table caption.
- **Story coverage**: US2.5.

## S9 — Customer Dues (US2.4)

```
+--------------------------------------------------------------+
| বাকি                                              [নতুন]      |
+--------------------------------------------------------------+
|  মোট বাকি: ৳0    গ্রাহক সংখ্যা: 0                            |
|                                                              |
|  ## বাকি তালিকা                                                |
|                                                              |
|  | গ্রাহক | বকেয়া | পরিশোধিত | বাকি | সংগ্রহ |              |
|  |--------|-------|----------|------|-------|                  |
|  | ...    | ...   | ...      | ...  | ...   |                  |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary → summary tiles → h2 list →
  table. Dues are a **derived view** computed from `Orders` +
  `Payments`; the system does not store a `dues` table (US2.4.1).
- **Per-customer detail (US2.4.2)**: row click navigates to
  `বাকি / D-XX` which exposes due-by-customer and due-by-order
  breakdowns.
- **Daily card (US2.4.4)**: total outstanding dues surface on
  the daily card with a basis pill.
- **Role gate**: full money access for Owner, Manager,
  Accountant; Sales Staff and Inventory Staff see total count but
  not amounts.
- **States**: empty, loading, success, error, partial.
- **Accessibility**: h1; h2; amount columns right-aligned with
  accessible name.
- **Story coverage**: US2.4.

## S10 — Suppliers (US2.6)

```
+--------------------------------------------------------------+
| সরবরাহকারী                                       [+ নতুন]    |
+--------------------------------------------------------------+
|  মোট সরবরাহকারী: 0    বাকি: ৳0                              |
|                                                              |
|  ## সকল সরবরাহকারী                                             |
|                                                              |
|  | নাম | পণ্য | ক্রয় ইতিহাস | বকেয়া |                     |
|  |-----|------|-------------|-------|                        |
|  | ... | ...  | ...         | ...   |                        |
+--------------------------------------------------------------+
```

- **Composition**: h1 → primary → summary tiles → h2 list → table.
  "Record purchase" (US2.6.3) records both a supplier payment and
  the corresponding stock-in; it opens the S10-purchase modal.
- **States**: empty, loading, success, error, partial.
- **Accessibility**: h1; h2; table caption.
- **Story coverage**: US2.6.

## S11 — Settlement Run (US2.2)

```
+--------------------------------------------------------------+
| সেটেলমেন্ট রান                              [নতুন রান]        |
+--------------------------------------------------------------+
|  সময়কাল: [২০২৬-১০-০১] থেকে [২০২৬-১০-১১]                       |
|                                                              |
|  ## কনসাইনমেন্ট                                                |
|  | কনসাইনমেন্ট# | কুরিয়ার | COD | চার্জ | ভেরিয়েন্স | নিষ্পত্তি | |
|  |-------------|---------|-----|------|----------|---------|              |
|  | PT-1234     | Pathao  | ৳500| ৳60  | ৳0         | matched |            |
|  | SF-5678     | Steadfast|৳1200|৳100 | (−২০০)   | short   | dispute ▾ |            |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Disposition state machine**: every consignment row carries a
  disposition of `matched` / `short` / `unmatched` / `duplicate`;
  the variance disposition is `accept_partial` / `dispute` /
  `write_off`. A `matched` row moves the order to `settled` and
  flips the basis pill from `earned` to `realized`. A `write_off`
  requires a reason note and appends an audit row.
- **Status-bucket tests (CC-AC-STATUS-BUCKET)**: status-bucket
  math is restated inline; tests do not import the constants.
- **Bangla-rendered negative figures (CC-AC-I18N)**: variance
  figures that are short render as `(−২০০)` in Bangla digits with
  a Bangla minus (`−`) glyph; never as Latin `-৳200`. The
  `Money Element` interaction-spec props carry the
  `negative-format: 'paren-bangla' | 'bangla-minus'` option.
- **Composition**: h1 → period picker → h2 consignment list →
  per-row disposition picker → save.
- **Role gate**: Owner only; the disposition is the binding
  financial event.
- **States**: empty (no consignments in period), loading,
  success, error, partial (some rows dispositioned).
- **Accessibility**: h1; h2; the disposition picker is a labelled
  group; the write-off reason note is required (`aria-required`).
- **Story coverage**: US2.2.

## S12 — Daily Card (US3.1)

```
+--------------------------------------------------------------+
| আজকের কার্ড                                       [রিফ্রেশ] |
+--------------------------------------------------------------+
|  ## আজকের অর্ডার                                               |
|  মোট: ৳[X] (basis: earned)  (X of Y items) [কেন?]            |
|                                                              |
|  ## আজকের আয়                                                  |
|  মোট: ৳[X] (basis: realized)  (X of Y items) [কেন?]          |
|                                                              |
|  ## বকেয়া                                                    |
|  মোট: ৳[X] (basis: realized)  (X of Y items) [কেন?]          |
|                                                              |
|  ## আজকের খরচ                                                |
|  মোট: ৳[X] (basis: realized)  (X of Y items) [কেন?]          |
+--------------------------------------------------------------+
```

- **Basis pill + completeness control**: every figure carries
  the basis pill (`earned` / `realized`) and the completeness
  control (`have` of `of`) with a why-missing sheet (CC-AC-BASIS).
- **Composition**: h1 → 4 h2 sections (orders, realised, dues,
  expenses) → per-section money figure with basis pill and
  completeness button.
- **Role gate**: Owner only (US3.1 persona `[P-Owner]`). Manager
  and Accountant see the role-locked empty state
  (`App.ui.roleLock`); Sales Staff and Inventory Staff also see
  the role-locked empty state. The NFR6.6 absence-asserted test
  runs the test-target role (no production role named "Viewer")
  to prove the no-money-figure invariant per
  `accessibility-checklist §3 R-3 / R-8`.
- **States**: empty (no data), loading, success, error.
- **Accessibility**: h1; h2; basis pill carries
  `aria-label="earned"` / `"realized"`; completeness button is a
  labelled `aria-haspopup`.
- **Story coverage**: US3.1.

## S13 — Audit Trail (US3.2)

```
+--------------------------------------------------------------+
| অডিট ট্রেইল                                [CSV রপ্তানি]    |
+--------------------------------------------------------------+
|  তারিখ পরিসীমা: [________] থেকে [________]                   |
|  সত্তা: [সব ▾]                                                |
|                                                              |
|  ## অডিট ইতিহাস                                                |
|  | A-## | সময় | সত্তা | প্রকার | পূর্বে | পরে | অভিনেতা | |
|  |------|------|------|--------|------|-----|---------|              |
|  | A-84 | ...  | E-199| reverse| ৳500 | ৳0  | owner   |              |
|  | ...  | ...  | ...  | ...    | ...  | ... | ...     |              |
+--------------------------------------------------------------+
```

- **Append-only at the DB level**: the audit table is append-only;
  `UPDATE` / `DELETE` are revoked at the application role (FR12.1).
  A migration that re-grants them fails CI (CC-AC-AUDIT-
  IMmutability, US3.2.4).
- **Reversal pattern**: reversals are NEW rows that reference the
  row being reversed (`A-84 reverses E-199` pattern in the
  prototype `data.js`).
- **Composition**: h1 → CSV export (top-right) → filter row →
  h2 audit history → table.
- **Role gate**: Owner, Accountant only. Manager, Sales Staff,
  and Inventory Staff see the role-locked empty state
  (`App.ui.roleLock`); the absence-asserted test target role has
  no access. The Owner-only CSV export action (US3.2.3) is gated
  separately on `roles: ['owner']`.
- **States**: empty, loading, success, error, partial (date
  filter).
- **Accessibility**: h1; h2; table caption; date column
  accessible name.
- **Story coverage**: US3.2.

## S14 — Settings (US1.5, US3.4, US3.3)

```
+--------------------------------------------------------------+
| সেটিংস                                                       |
+--------------------------------------------------------------+
|  ## ব্যবসা                                                   |
|  নাম: [____________]  ঠিকানা: [____________]                  |
|  ফোন: [____________]  মুদ্রা: [BDT ▾]                        |
|                                                              |
|  ## AI অপ্ট-ইন                                                |
|  [ ] AI সহকারী ব্যবহার করুন                                    |
|                                                              |
|  ## ডিবাগ-অনলি ফ্লো                                            |
|  [ ] ফ্লো সারফেস দেখান                                          |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

- **Composition**: h1 → 3 h2 sections (business, AI opt-in,
  debug-only flows) → save.
- **Role gate**: Owner only.
- **States**: loading (save in flight), success, error.
- **Accessibility**: h1; h2; each toggle is a labelled group.
- **Story coverage**: US1.5 (settings), US3.4 (toggles),
  US3.3 (role-restricted surfaces — settings is a role gate
  boundary).

## Sources

- [wireframes] `aidlc/spaces/default/intents/261004-mvp/ideation/rough-mockups/wireframes.md` — 10 rough screens
- [user-flow] `aidlc/spaces/default/intents/261004-mvp/ideation/rough-mockups/user-flow.md` — happy path
- [stories] `aidlc/spaces/default/intents/261004-mvp/inception/user-stories/stories.md` — 39 stories
- [requirements] `aidlc/spaces/default/intents/261004-mvp/inception/requirements-analysis/requirements.md` — FR1–FR12, NFR1–NFR8
- [team-practices] `aidlc/spaces/default/intents/261004-mvp/inception/practices-discovery/team-practices.md`
- [component-inventory] `aidlc/spaces/default/codekb/SmartBiz/component-inventory.md` — 30 items
- [tokens] `prototype/css/tokens.css` — design tokens baseline
- [ux-guide] `.claude/knowledge/aidlc-design-agent/ux-guide.md`
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`
- [interaction-design-patterns] `.claude/knowledge/aidlc-design-agent/interaction-design-patterns.md`
- [component-spec-template] `.claude/knowledge/aidlc-design-agent/component-spec-template.md`

## Assumptions & Open Questions

- The 7 input-mode stories (US1.10–US1.16) each get their own
  mockup; the 3 deferred ones (US1.14 / US1.15 / US1.16) carry a
  labelled placeholder in the same family. Phase-2 Delivery
  Planning must produce the bolt order for these placeholders.
- The 5 design-system gaps (modal, toast, dialog, status-pill,
  basis-pill formalization) are named in
  `design-system-mapping.md §Gaps`; their typed signatures land
  in Functional Design.
- The role × capability matrix in
  `component-inventory §5` is the source of truth; this mockup
  set reflects it 1:1 and Functional Design must not deviate
  without an ADR.
