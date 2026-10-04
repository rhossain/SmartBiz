# User Flow

## Scope

Happy-path user flow and core entry points for the SmartBiz BD MVP slice, traced end-to-end through the 9-table-stakes modules. [Q2] This file complements `wireframes.md` (which defines screen-level structure) by defining the sequence of screens, decisions, and state transitions the day-one user follows. [intent-capture:Q2]

The flow is mobile-first responsive, but the diagram is desktop-shaped for readability; on mobile the sidebar collapses to a top hamburger and the order rows stack vertically. [Q5] [wireframes.md]

## Personas

| Persona | Role | Surface | Goal |
|---|---|---|---|
| Owner | Business owner / single-decider | Mobile-first responsive web | Run the business end-to-end without leaving the app |
| Staff | 1–2 employees | Mobile-first responsive web | Record orders, COD, expenses as they happen |

[Q1] [intent-capture:Q2] [scope-md §5.1]

## Primary Entry Points

| Entry | Screen | Use case |
|---|---|---|
| Sidebar (desktop) / hamburger / bottom-tab (mobile) module list | Module landing (one per module) | Daily jump to a specific module |
| Top-right user menu | User profile, sign-out, business switch | Account management |
| First-run onboarding | S2 Business Setup → S4 Products + S3 Customers | New business cold-start |
| Re-entry after session timeout | S1 Login → last-visited module | Returning user |

[Q1] [wireframes.md#Navigation Surface]

## Happy Path (Owner)

The end-to-end happy path follows Q2's answer: "Owner login → Add product → Add customer → Create order → Mark delivered → Record COD payment → Check dues → Done". [Q2]

```
+-------------------+
| S1 Login          |
| (email + password)|
+---------+---------+
          |
          v
+-------------------+
| S2 Business Setup |  (first-run only; skipped on subsequent visits)
| (name, address,   |
|  phone, employees)|
+---------+---------+
          |
          v
+-------------------+
| S4 Products       |  ← foundation: at least one product must exist
| [+ নতুন পণ্য]    |
+---------+---------+
          |  add product (SKU, name, category, prices)
          v
+-------------------+
| S3 Customers      |  ← foundation: at least one customer must exist
| [+ নতুন গ্রাহক]  |
+---------+---------+
          |  add customer (name, phone, address)
          v
+-------------------+
| S6 Orders         |  ← operations: compose order from products + customer
| [+ নতুন অর্ডার]  |
+---------+---------+
          |  create order (pick customer, add items, totals)
          v
+-------------------+
| S7 Order Detail / |
| COD               |  ← key screen: order + delivery + COD in one place
| (customer, items, |
|  courier, COD,    |
|  tracking #)      |
+---------+---------+
          |  mark status = "Confirmed" → "Shipped"
          v
+-------------------+
| S5 Inventory      |  ← automatic on ship: stock-out transaction
| (transaction log) |  (and manual stock-in for new stock)
+---------+---------+
          |  (back to S7) mark "Delivered"
          v
+-------------------+
| S7 Order Detail / |
| COD               |  ← record COD payment (full or partial)
| COD amount: ৳X    |
+---------+---------+
          |  if partial: due balance persisted
          v
+-------------------+
| S9 Customer Dues  |  ← operations: see outstanding balance
| (per-customer due |
|  + collection)    |
+---------+---------+
          |  record collection → due balance reduces
          v
+-------------------+
| Done              |  ← owner closes the day; S8 Expenses can be
|                   |     recorded in parallel at any time
+-------------------+
```

[Q2] [wireframes.md]

## Side Flows (Optional, Recorded as They Happen)

These run in parallel with the happy path and are not gated on it:

```
+--------------------------------------------------------------+
| S8 Expenses  ← owner records rent, utilities, supplier        |
|               payments at any time; never blocks the order     |
|               loop                                            |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| S10 Suppliers ← owner adds supplier profile + purchase       |
|                 history; not on the order-creation path       |
+--------------------------------------------------------------+
```

[scope-md §5.7] [scope-md §5.9]

## Screen Transitions

| From | Trigger | To | Notes |
|---|---|---|---|
| S1 Login | Submit valid credentials (first-run) | S2 Business Setup | Owner-only flow |
| S1 Login | Submit valid credentials (returning) | Module landing (last visited, defaults to S6 Orders) | Resume where owner left off |
| S2 Business Setup | Save + invite employees | S4 Products | First-run onboarding continues with product add |
| S3 Customers | [+ নতুন গ্রাহক] | Customer create form (modal or sheet) | Inline create; returns to list with the new customer selected |
| S4 Products | [+ নতুন পণ্য] | Product create form | Inline create; returns to list |
| S5 Inventory | [+ লেনদেন] | Stock-in / stock-out form | Manual transaction; auto-transactions (from S7 ship) are read-only |
| S6 Orders | [+ নতুন অর্ডার] | Order create flow (S7 composer) | New order lands in S7 detail |
| S6 Orders | Row click | S7 Order Detail / COD | Existing order |
| S7 Order Detail / COD | Save | S7 Order Detail / COD (refreshed) | Status transitions persist |
| S7 Order Detail / COD | Mark "Delivered" + record COD | S7 Order Detail / COD (refreshed) | If partial COD, due balance created |
| S9 Customer Dues | [সংগ্রহ] on a row | Collection form | Due balance reduces after save |
| Any module | Sidebar / bottom-tab change | Target module landing | Consistent nav |
| Any module | User menu → Sign out | S1 Login | Session ends |

[Q3] [wireframes.md]

## Status Transitions (S7 Order Detail / COD)

```
   [Confirmed] ──► [Shipped] ──► [Delivered] ──► [COD reconciled]
       │              │              │
       └──────────────┴──────────────┴────► [Returned]
                                       └──► [Cancelled]
```

Rules:

- `[Approved] → [Shipped]`: triggers an S5 inventory stock-out transaction for each order item.
- `[Shipped] → [Delivered]`: allows recording a COD payment (৳ [Bangladesh Taka] amount) and courier settlement.
- `[Delivered] → [COD reconciled]`: requires the COD amount to equal the order total (or have a residual due documented).
- `[*] → [Returned]` or `[*] → [Cancelled]`: triggers an S5 inventory stock-in adjustment (returned) or marks inventory as written off (cancelled), depending on the cancellation reason.

[scope-md §5.5] [scope-md §5.6] [wireframes.md#S7]

## Empty, Loading, Error, and Partial States

Wireframes must represent all five states for every screen, not just the happy path with perfect data. [wireframing-guide]

| Screen | Empty | Loading | Success | Error | Partial |
|---|---|---|---|---|---|
| S1 Login | n/a (always shows form) | Inline spinner on submit | Redirect to S2 or module landing | Inline form error (e.g. "ভুল ইমেইল বা পাসওয়ার্ড") | n/a |
| S2 Business Setup | Empty form fields | Inline spinner on save | Redirect to S4 | Inline field validation + form-level error |
| S3 Customers | "এখনো কোনো গ্রাহক নেই — [+ নতুন গ্রাহক]" | Skeleton rows | Populated list | Inline error banner; retry |
| S4 Products | "এখনো কোনো পণ্য নেই — [+ নতুন পণ্য]" | Skeleton rows | Populated list | Inline error banner; retry |
| S5 Inventory | "কোনো লেনদেন নেই" | Skeleton rows | Transaction list | Inline error banner; retry |
| S6 Orders | "এখনো কোনো অর্ডার নেই — [+ নতুন অর্ডার]" | Skeleton rows | Populated list | Inline error banner; retry |
| S7 Order Detail / COD | n/a (form opens with values) | Inline spinner on save | Saved form values | Inline field + form errors |
| S8 Expenses | "এখনো কোনো খরচ নেই" | Skeleton rows | Populated list | Inline error banner; retry |
| S9 Customer Dues | "কোনো বাকি নেই" | Skeleton rows | Populated list | Inline error banner; retry |
| S10 Suppliers | "এখনো কোনো সরবরাহকারী নেই" | Skeleton rows | Populated list | Inline error banner; retry |

[wireframing-guide#Screen State Design] [Q3]

## Keyboard / Accessibility Flows (WCAG 2.1 AA)

For every screen, the keyboard entry field is the first focusable element (keyboard lands at the top of the form region). [Q6] [wireframes.md]

| Screen | First focus | Tab order | Skip-link |
|---|---|---|---|
| S1 Login | Email field | Email → Password → Submit | Skip to main |
| S2 Business Setup | Business name field | Name → Address → Phone → Add employee → Save | Skip to main |
| S3, S4, S5, S6, S8, S9, S10 (list screens) | Search field (if present) or first header link | Search → New-action → table headers (sortable) → row actions | Skip to main + skip to h5/section |
| S7 Order Detail / COD | Customer field | Customer → Date → Items → COD/courier/status → Save | Skip to main + skip to items |

[Q6] [accessibility-wcag] [wireframes.md#Wireframe Conventions]

## Information Architecture Outline

```
SmartBiz BD
├── (Public)
│   └── S1 Login / Register
├── (Authenticated)
│   ├── App bar: Logo + User menu
│   ├── Sidebar / Bottom-nav (modules)
│   │   ├── অর্ডার    → S6 Orders
│   │   ├── গ্রাহক    → S3 Customers
│   │   ├── পণ্য     → S4 Products
│   │   ├── মজুদ     → S5 Inventory
│   │   ├── কোড    → (none; lives inside S7 Order Detail)
│   │   ├── খরচ     → S8 Expenses
│   │   ├── বাকি    → S9 Customer Dues
│   │   ├── সরবরাহকারী → S10 Suppliers
│   │   └── প্রতিষ্ঠান → S2 Business Setup (settings)
│   └── Page content (one of S3 / S4 / S5 / S6 / S7 / S8 / S9 / S10)
```

Module names are in Bangla per Q1. [Q1] Note that **কোড (COD)** is intentionally folded into S7 Order Detail / COD rather than exposed as a top-level module, because COD information is always keyed off an order and rarely useful in isolation. [scope-md §5.6]

[Q1] [Q3] [wireframes.md]

## Out of Scope for this User Flow

- Dashboard (5.10) — phase 2; no KPI tiles in this flow. [scope-document]
- Reports (5.11) — phase 2; no export actions in this flow. [scope-document]
- AI Insights (5.12) — phase 2; no Bangla-first AI prompt surface in this flow. [scope-document]
- Refined mockups (a later Inception stage) — this is the rough pass. [scope-document]

## Sources

- [Q1] Question 1 answer — sidebar with module list.
- [Q2] Question 2 answer — Login → Add product → Add customer → Create order → Mark delivered → Record COD payment → Check dues.
- [Q3] Question 3 answer — page header → primary action → summary → list/table.
- [Q5] Question 5 answer — mobile-first responsive.
- [Q6] Question 6 answer — WCAG 2.1 AA.
- [intent-capture] `<record>/ideation/intent-capture/intent-statement.md`.
- [intent-capture:Q2] Day-one user: owner + 1–2 staff.
- [scope-document] `<record>/ideation/scope-document.md` — 9-table-stakes MVP slice.
- [intent-backlog] `<record>/ideation/scope-definition/intent-backlog.md` — proto-Unit sequence.
- [scope-md] `docs/scope.md` §5.1–§5.9.
- [wireframes.md] `<record>/ideation/rough-mockups/wireframes.md`.
- [wireframing-guide] `.claude/knowledge/aidlc-design-agent/wireframing-guide.md` — five screen states.
- [accessibility-wcag] `.claude/knowledge/aidlc-design-agent/accessibility-wcag.md`.

## Assumptions & Open Questions

The first-run flow assumes the owner (single-decider) signs up and configures the business before any staff account is created. Staff invitation lives on S2 Business Setup, not on a separate screen. If the pilot surfaces a need for staff self-signup, this flow is amended at the next iteration. [intent-capture:stakeholder-map] [scope-md §5.1]