# Functional Design — Questions (u5-orders-catalog)

> Answered by the assistant on the Owner's standing instruction ("decide the right options for me").
> Summary confirmation is off. Inputs: U5 in `../../../inception/units-generation/unit-of-work.md`, stories
> US4.1 and US4.2 plus the order steps U4 deferred (AC3.3.2's order rows, AC5.2b.1's order), contracts C3
> (amended by U5) and C8, U4's shipped catalog (`src/catalog/index.ts` C8 functions, migrations 0019, 0022),
> and the current order code (`src/orders/create-order.ts`, `update-order.ts`, `list-orders.ts`,
> `order-summary.ts`, `input-modes.ts`, `parse-message.ts`, `parse-message-segments.ts`, the B2 stubs
> `customer.ts` and `variant.ts`, migrations 0008, 0009).

## Q1. Turning the TEXT ids into real references (AC4.1.1, AC4.1.2)

A. Migration `0023_link_orders_to_catalog.sql`: add `UNIQUE (business_id, id)` to `variants`; set to NULL any
`orders.customer_id` or `order_items.variant_id` that is not a UUID of a customer / variant of the same
business (B2 only ever stored free text or nothing there, so no real link is lost); change both columns to
`uuid`; add composite foreign keys `orders (business_id, customer_id) → customers (business_id, id)` and
`order_items (business_id, variant_id) → variants (business_id, id)`. Every step is guarded so the file is
safe to apply twice
B. Keep TEXT columns and check in the application only
X. Other (please specify)

[Answer]: A. The same defence in depth U4 chose (Q15 there): the database itself refuses a cross-business link.

## Q2. Creating and editing an order with catalog ids (AC4.1.2, AC4.1.3)

A. Inside the order's transaction, before the change-log row, a non-null `customerId` is checked with
`getCustomer` and every non-null `variantId` with `getVariant` (C8, scoped to the session's business); a
missing, foreign or non-UUID id answers 404 `not_found` and nothing is written. The order keeps its own
`contact` and each line its own `description` and `unitPricePaise` exactly as sent: the catalog fills the
screen, never overrides what the person confirmed. The B2 stubs `src/orders/customer.ts` and `variant.ts`
are deleted and orders import the C8 functions
B. The server copies name, phone and price from the catalog
X. Other (please specify)

[Answer]: A. The order is a record of what was agreed at the time; a later price change must not rewrite it.

## Q3. Names on the order list (AC4.1.1)

A. `customerName` = the linked customer's current name (via `customerNames`), else `contact.name`, else
null. Each `itemLabels` entry = the linked variant's label "product · value · value" (via `variantLabels`),
else the line's description. Ids are de-duplicated and looked up in chunks of 50 (C8); a page needs at most
two lookups per kind
B. Store the names on the order
X. Other (please specify)

[Answer]: A. A renamed customer shows the new name everywhere, and the free-text fallback keeps old orders
readable.

## Q4. Picking a customer and products on the order screens (US4.1)

A. The new-order screen gains a customer picker (search as on `/customers`; choosing fills the contact fields,
which stay editable; "নতুন ক্রেতা" opens `/customers/new`) and, per line, a product picker (search by name or
SKU, then choose the variant; choosing fills the description with the variant label and the unit price with
the selling price, both editable). A line may stay free text (no variant). The repeat screen keeps the past
order's ids, rechecked by the server. The edit flow keeps them as well
B. Catalog picks are mandatory
X. Other (please specify)

[Answer]: A. Linking is the point of U5, but forcing it would block a sale of something not yet in the
catalog.

## Q5. Matching a pasted message to the catalog (AC4.2.1–AC4.2.3)

A. A new read route `GET /api/catalog/match-index` (`business.view`) returns every product's id, name, SKU,
axis names and variants (id, axis values), at most 2 000 variants with `truncated`. The paste screen loads it
once and passes it to the parser as its `catalog`. An item is linked to a product only when its OWN words
match exactly one product (name or SKU, the parser's existing whole-word / Bangla-substring rule); words
matching several products leave it unlinked (incomplete, for the person to pick). The variant is then the
product's one variant whose axis values equal the item's own size and colour (case-insensitive; a product
with no axes has exactly one); none or several matching leaves the variant unpicked. Segment isolation is
unchanged: details come only from the item's own segment
B. Fuzzy matching on similar names
X. Other (please specify)

[Answer]: A. Exact, own-words-only matching is predictable and keeps the segment-isolation invariant intact;
fuzzy matching would guess.

## Q6. A pasted phone that belongs to a known customer

A. After parsing, the paste screen normalises the contact phone (U4's rule) and, when exactly one customer
has it, pre-selects that customer with a visible "এই নম্বরের ক্রেতা: <name>" and an unlink action; several
customers with that phone show the choice; none leaves the order unlinked with "নতুন ক্রেতা হিসেবে যোগ করুন"
B. Never link from a paste
X. Other (please specify)

[Answer]: A. Repeat buyers write from the same number; linking them is what makes the customer history
useful. It is a suggestion the person sees and can undo.

## Q7. Does an order change stock?

A. No, not in this intent. No story asks for it, and reserving or deducting stock needs rules for
cancellations, returns and partial deliveries that belong with the follow-up insights work. The screens do
not claim otherwise
B. Deduct on create
X. Other (please specify)

[Answer]: A. Out of scope, named so nobody assumes it.

## Q8. Small fixes carried from U4's code review

A. `setCost` also sets `products.updated_at` (review R-01); the browser's money parser refuses amounts over
৳১,০০,০০,০০০ (1 000 000 000 paise) with a field message instead of letting the server answer a generic 400
(review R-02)
B. Leave them
X. Other (please specify)

[Answer]: A. Both are one-line corrections in code U5 touches anyway.

## Q9. Proving it (AC5.2b.1, AC3.3.2)

A. The wiring check finishes AC5.2b.1: as Sales Staff it creates an order for the check's customer and
low variant, then sees the customer's name and the variant label on the order list and the order on the
customer's history. A realdb test proves a foreign customer or variant id is a 404 and that the composite
keys refuse a cross-business link. A new mutant drops the business filter from the order-create variant check
B. Unit tests only
X. Other (please specify)

[Answer]: A. Closes the two order steps U4 deferred and adds the tenancy mutant the team's rules call for.
