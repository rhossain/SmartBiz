# Functional Design — Questions (u4-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Each answer states the option chosen and why, so later stages never treat
> it as the Owner's own wording. Inputs: U4 in `../../../inception/units-generation/unit-of-work.md`,
> stories US3.1–US3.7 and US5.2b, the US5.1 role table, contracts C1, C7, C8, C9, mockups §6–§12 and §15
> (and the §16 visual language), the refined-mockups review R-04, and the current code
> (`src/auth/capability.ts`, `src/orders/order-capability.ts`, `src/orders/customer.ts`,
> `src/orders/variant.ts`, `src/money/low-variants.ts`, `src/audit/audit-service.ts`,
> `src/db/declared-grants.ts`, `src/server/routes.ts`).

## Q1. Which capability guards each catalog route (contract review R-03)

A. Reuse the existing capabilities, no new ones. Reads (every `GET`): `business.view` (all four roles).
Customers and notes, create and edit: any of `money.mutate.price`, `money.mutate.full` (Owner, Manager,
Sales Staff — the same set that mutates orders). Products, variants, stock and suppliers: `money.mutate.full`
(Owner, Manager). Purchase cost: any of `money.mutate.cost`, `money.mutate.full` (Owner, Manager, Accountant)
B. Add new `catalog.*` capabilities to the matrix
X. Other (please specify)

[Answer]: A. The four sets match the US5.1 table row for row, so the matrix in `capability.ts` stays as
reviewed and the role walks pick the routes up from the route table without a matrix change.

## Q2. Who sees purchase cost (refined-mockups R-04)

A. Purchase cost is returned only to a role holding `money.mutate.cost` or `money.mutate.full` (Owner, Manager,
Accountant). For Sales Staff the server leaves the `purchaseCostPaise` key out of every product response (list
and detail), and a server test asserts the key is absent; the screens hide the "ক্রয়" figure for them
B. Show cost to all four roles
X. Other (please specify)

[Answer]: A. Cost reveals the margin, which a salesperson does not need to sell; the mockups already draw it
this way, and making it a server rule with a test closes R-04 instead of leaving a screen-only rule.

## Q3. Phone normalisation (AC3.1.2)

A. One pure function used by the server and the browser: convert Bangla digits to ASCII; remove spaces,
hyphens, dots and brackets; turn a leading `+880` or `880` into `0`; the result must be exactly `01[3-9]`
followed by 8 digits, else `invalid_input` on the `phone` field (Bangla message on the screen). Stored as
ASCII `01XXXXXXXXX`; shown with Bangla digits in the Bangla locale. Suppliers use the same rule
B. Store what was typed
X. Other (please specify)

[Answer]: A. One stored shape makes duplicate detection and phone search exact.

## Q4. Duplicate customer phone (AC3.1.3)

A. Never a refusal. Create and edit return `duplicatePhoneOf`: the id and name of the oldest other customer in
the business with the same phone, or null. The new-customer screen also asks on blur (a phone search with the
11 digits) so the warning shows before saving; it links to that customer
B. Refuse duplicates
X. Other (please specify)

[Answer]: A. Families share one phone in Bangladesh; the story makes it a warning.

## Q5. Customer search (AC3.3.1)

A. `q` is trimmed and Bangla digits become ASCII. If `q` with spaces and hyphens removed is all digits and has
at least 4, a customer matches when its phone contains those digits (a leading `880`/`+880` becomes `0`
first) or its name contains `q`; otherwise only the name is matched (case-insensitive, `%` and `_` are
literal). Results are newest first with the C1 keyset cursor, at most 50 a page. No `q` lists everyone
B. Prefix-only phone search
X. Other (please specify)

[Answer]: A. People remember the last four digits as often as the first four; "contains" covers both.

## Q6. Notes and revisions (AC3.2.1, AC3.2.2)

A. A note is 1–2 000 characters after trimming. `revisesNoteId`, when given, must be a note of the same
customer (else 404) that no other note revises yet (else 409 `conflict`), so each note's history is one
straight line. The detail shows the latest version of each note, newest first, with its earlier versions under
it labelled "আগের নোট". The new-customer form's optional note is saved as the first note in the same
transaction
B. Let a note be revised twice into a branch
X. Other (please specify)

[Answer]: A. A straight line is what "revise" means to a person and keeps "the latest version" unambiguous.

## Q7. Editing a customer

A. `PATCH /api/customers/:id` takes the same fields as create, every one optional (at least one sent): an
omitted field is left unchanged, `address: null` clears it, and the risk default 0 applies only on create
(added after the architecture review, F-01). The audit row lists which fields changed by name and, for risk level only, the old and new
value; it never holds a name, phone or address. Customers cannot be deleted in this intent
B. Allow deleting customers
X. Other (please specify)

[Answer]: A. Orders and notes point at customers, and the audit trail is insert-only; deleting is a later,
separate decision.

## Q8. A product's fields

A. Name 1–120 characters; SKU 1–40 characters of letters, digits, `-`, `_` or `.`, unique per business
ignoring case (409 `conflict`) and fixed after creation; optional category (≤ 60 characters, FR6.1 — added to
C7 as an optional field, an additive change); selling price whole paise 0–1 000 000 000; purchase cost whole
paise in the same range or null meaning "not recorded" (never a fake ৳0); optional default supplier of the
same business (404 otherwise)
B. No category, as the contract draft has it
X. Other (please specify)

[Answer]: A. FR6.1 names category; null cost keeps the recognition-basis rule that a missing figure is
never shown as zero.

## Q9. Axes and variants (AC3.4.1, AC3.4.3)

A. 0, 1 or 2 axes. An axis has a name (1–30 characters, distinct ignoring case) and 1–12 values (each 1–30
characters without `-`, distinct within the axis ignoring case; at most 144 variants, so the request fits the
64 KiB body limit — tightened after the architecture review, F-08). The request's variants must be exactly the cross product
of the axis values, each combination once, in any order (400 otherwise); with no axes there is exactly one
variant with no values. Each variant has stock and minimum stock, whole numbers 0–1 000 000, and a SKU suffix
made of its values joined by `-` (the full SKU is `<product SKU>-<suffix>`, or the product SKU alone with no
axes). Axes and variants are fixed after creation in this intent
B. Let the server generate the variants and ignore the request's list
X. Other (please specify)

[Answer]: A. The screen previews the variants with their stock, so the server checks the same list it was
shown rather than inventing one; editing axes later is a separate decision.

## Q10. Setting stock (AC3.5.1, AC3.5.2)

A. `PATCH /api/variants/:id/stock` with `stock`, `minimumStock` or both (absolute values, not deltas). The
row is locked for the write; the audit row holds the old and new value of each changed field. A variant is
low when stock is strictly below its minimum. The product screen saves each changed row with its own request
and reports any row that failed
B. Deltas (+3 / −1)
X. Other (please specify)

[Answer]: A. The Manager counts the shelf and types the count; absolute values are what that is, and a
retried request cannot double-count.

## Q11. The low-stock screen (AC3.5.3, AC3.5.4)

A. `GET /api/low-stock` lists every variant of the business with stock below its minimum, with its product,
values, stock, minimum and the product's default supplier (or null), ordered by product name then values, at
most 200 rows with `truncated: true` beyond that (contract review R-08). The MoneyEngine `lowVariants` stub
is deleted; the query lives in the catalog
B. Keep `lowVariants` in MoneyEngine
X. Other (please specify)

[Answer]: A. The unit plan moves it; stock is not money.

## Q12. Suppliers (US3.6)

A. Name 1–120 characters and a phone by the Q3 rule, both required; editable by Owner and Manager; not
deletable. The list shows every supplier (at most 200, `truncated`) with how many products name it as default.
The audit row holds neither name nor phone
B. Phone optional
X. Other (please specify)

[Answer]: A. The low-stock screen's whole point for a supplier is the call link.

## Q13. Customer order history before U5 (AC3.3.2, units review R-05)

A. U4 builds the history section: it loads `GET /api/orders?customerId=<id>` and shows each order's number,
status and status-bucket pill. Until U5 links orders to customers no order carries a customer id, so the
section shows its empty state; AC3.3.2's order rows are verified in U5. Payments and dues show
"এখনো চালু হয়নি", never ৳০
B. Hide the section until U5
X. Other (please specify)

[Answer]: A. Exactly what the units review decided.

## Q14. Screens and navigation

A. Routes `/customers`, `/customers/new`, `/customers/:id`, `/customers/:id/edit`, `/products`,
`/products/new`, `/products/:id`, `/products/:id/edit`, `/low-stock`, `/suppliers`, all readable by every
signed-in role; the new and edit routes need the write capability (lock screen otherwise). The navigation
gains ক্রেতা, পণ্য, কম মজুদ and সরবরাহকারী for every role (mockups §15). The screens use the §16 visual
language (white cards, stat tiles, back link on every detail and form screen)
B. Edit inline on the detail screens
X. Other (please specify)

[Answer]: A. Matches the mockups, AC5.1.4's route list and the back-link fix the Owner asked for.

## Q15. Tenancy in the database

A. Every catalog table carries `business_id`. Child rows reference their parent by the pair (business, id),
so a note cannot point at another business's customer, a variant at another business's product, or a product
at another business's supplier, even through a bug. Every read filters by the session's business, so a
foreign id and a missing id are the same 404
B. Rely on the application filter only
X. Other (please specify)

[Answer]: A. Defence in depth for the one rule that must never break in a shared database.

## Q16. Demo data

A. Extend `bun run seed:demo` with suppliers, products with sizes and colours (some below minimum), and
customers with notes and risk levels, so every catalog screen has something to show
B. Leave the demo without a catalog
X. Other (please specify)

[Answer]: A. The Owner asked for dummy data on every screen before the demo; the catalog screens are new
screens.
