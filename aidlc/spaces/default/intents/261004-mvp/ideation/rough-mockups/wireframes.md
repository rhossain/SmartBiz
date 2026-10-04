# Wireframes

## Scope

Low-fidelity wireframes for the 9-table-stakes SmartBiz BD MVP slice, mobile-first responsive. [scope-document] [intent-backlog] [Q5] The 3 differentiators (Dashboard, Reports, AI insights) are excluded — they ship in phase 2. [scope-document]

## Navigation Surface

Sidebar with module list on the left (desktop), collapsed to a top hamburger menu on mobile. Module names in Bangla. [Q1]

```
Desktop layout (≥768px width):

+--------------------------------------------------------------+
| [Logo: SmartBiz BD]               [User menu ▾]              |
+----------+---------------------------------------------------+
|          |                                                   |
| অর্ডার    |   <page content here>                            |
| গ্রাহক    |                                                   |
| পণ্য     |                                                   |
| মজুদ     |                                                   |
| কোড    |                                                   |
| খরচ     |                                                   |
| বাকি    |                                                   |
| সরবরাহকারী|                                                  |
| প্রতিষ্ঠান|                                                  |
|          |                                                   |
+----------+---------------------------------------------------+
```

```
Mobile layout (<768px):

+----------------------------+
| ☰  SmartBiz BD        [👤] |
+----------------------------+
|                            |
|  <page content>            |
|                            |
|                            |
+----------------------------+
|  অর্ডার (active)           |  <- bottom tab nav on smallest viewports
+----------------------------+
```

[Q1] [Q5]

## Information Hierarchy

Page header (h1) → primary action (top-right) → summary numbers → list/table (h2 sections). [Q3]

```
[ Page Title (h1) — Bangla ]    [+ নতুন অর্ডার (primary action)]

[ নম্বর (count) ]   [ হিসাব (₹ value) ]   [ বাকি (count) ]

## h2 — section title

| column1 | column2 | column3 | actions |
|---------|---------|---------|---------|
| ...     | ...     | ...     | ⋮       |
| ...     | ...     | ...     | ⋮       |

## h2 — section title
...
```

[Q3]

## Screen List (9 table-stakes modules)

Each screen follows the canonical information hierarchy. [Q3] The user-flow.md file traces the happy path through these screens. [user-flow.md]

### S1. Login / Register (Auth)

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

Accessibility: h1 title; primary button at the top of the main region; keyboard entry at the email field. [Q6]

### S2. Business Setup (Auth — owner profile, business profile, employee invitation)

```
+--------------------------------------------------------------+
| প্রতিষ্ঠান সেটআপ                                              |
+--------------------------------------------------------------+
|                                                              |
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

Accessibility: h1 page title; h2 section; primary action at top; table has caption. [Q6]

### S3. Customers (Customer Management)

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

Accessibility: h1 page title; h2 section; table caption; search field labelled. [Q6]

### S4. Products (Product Management)

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

Accessibility: h1 page title; h2 section; table caption; sortable column headers. [Q6]

### S5. Inventory (Inventory Management)

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

Accessibility: h1; h2; table caption; date column has accessible name. [Q6]

### S6. Orders (Order Management)

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

Accessibility: h1; h2; table caption; status column has accessible name (e.g. "Pending", "Delivered"). [Q6]

### S7. Order Detail / COD (Order + COD)

```
+--------------------------------------------------------------+
| অর্ডার #1234                                [← ফিরে যান]    |
+--------------------------------------------------------------+
|                                                              |
|  গ্রাহক: [_______________]                                   |
|  তারিখ: [_______________]                                   |
|                                                              |
|  ## আইটেম                                                    |
|  | পণ্য | পরিমাণ | দাম | ছাড় | মোট |                       |
|  |------|-------|-----|-----|-----|                          |
|  | ...  | ...   | ... | ... | ... |                          |
|                                                              |
|  ## COD ও ডেলিভারি                                             |
|  কুরিয়ার: [_______________]                                |
|  ট্র্যাকিং #: [_______________]                              |
|  COD পরিমাণ: [_______________]                               |
|  স্ট্যাটাস: [Confirmed ▾]                                    |
|                                                              |
|  [   সংরক্ষণ করুন   ]                                        |
+--------------------------------------------------------------+
```

Accessibility: h1; h2 sections; form labels associated with inputs; primary action at bottom. [Q6]

### S8. Expenses (Expense Management)

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

Accessibility: h1; h2; table caption. [Q6]

### S9. Customer Dues (Customer Due Management)

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

Accessibility: h1; h2; table caption; amount columns right-aligned with accessible name. [Q6]

### S10. Suppliers (Supplier Management)

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

Accessibility: h1; h2; table caption. [Q6]

## Wireframe Conventions

- All page titles are h1. Section titles use h2.
- All Bangla text uses bn-BD locale conventions.
- Currency is displayed in ৳ (BDT) symbol.
- Primary action button is at top-right (desktop) or above the section content (mobile).
- Tables have visible captions (for screen-reader accessibility) and explicit column headers.
- Forms label inputs explicitly; required fields are marked.
- Keyboard entry points are at the top of every form (first input is the focusable landing field).
- Landmark regions: `<header>` for app bar, `<nav>` for sidebar/bottom-nav, `<main>` for page content, `<footer>` for non-essential info (rarely used here).

[Q6] [Q3]

## Out of Scope for these Wireframes

- Dashboard (5.10) — phase-2
- Reports (5.11) — phase-2
- AI Insights (5.12) — phase-2
- Refined mockups (next stage in Inception) — this is the rough pass

[scope-document]

## Sources

- [Q1] Question 1 answer — sidebar with module list.
- [Q2] Question 2 answer — Login → Add product → Add customer → Create order → Mark delivered → Record COD payment → Check dues.
- [Q3] Question 3 answer — page header → primary action → summary → list/table.
- [Q4] Question 4 answer — clean slate, Bangla-first.
- [Q5] Question 5 answer — mobile-first responsive.
- [Q6] Question 6 answer — WCAG 2.1 AA.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [scope-document] `<record>/ideation/scope-document.md` — 9-table-stakes MVP slice.
- [intent-backlog] `<record>/ideation/intent-backlog.md` — proto-Unit sequence.
- [scope-md] `docs/scope.md` §5.1–§5.9.

## Assumptions & Open Questions

Wireframes here are low-fidelity. Refined mockups (a later Inception stage) will turn these into higher-fidelity designs. Bangla copy is illustrative; final copy needs translation review.