# Business Rules — u5-orders-catalog

> Source of truth for U5's decision logic. Groups: BR1 references and tenancy, BR2 the migration, BR3 names on
> the list, BR4 order screens, BR5 paste matching, BR6 phone suggestion, BR7 proof, BR8 carried fixes.
> Sources: ACs in `../../../inception/user-stories/stories.md`, contracts C3 and C8, decisions Q1–Q9.

```yaml
rules:
  # ---------------------------------------------------------------- BR1 references and tenancy
  - id: BR1.1
    statement: "An order's customer and every line's variant must exist in the session's business."
    category: authorization
    applies_to: "POST /api/orders, PATCH /api/orders/:id"
    trigger: "request"
    logic: "Inside the order's transaction and before its change-log row: IF customerId is not null AND getCustomer(business, customerId) is NotFound, OR any non-null variantId gives NotFound from getVariant THEN refuse and write nothing. A non-UUID id is NotFound. Both id fields stay free strings in the zod schemas (never .uuid(), which would answer 400); C8's isUuid check produces the 404 (review R-03)."
    violation: "404 not_found"
    source: [AC4.1.2, Q2]
  - id: BR1.2
    statement: "Orders read the catalog only through the C8 functions."
    category: constraint
    applies_to: "src/orders/**"
    trigger: "always"
    logic: "Orders import getCustomer, getVariant, customerNames, variantLabels from src/catalog/index.ts; no SQL in src/orders names a catalog table; the B2 stubs src/orders/customer.ts and variant.ts are deleted."
    violation: "lint / review failure"
    source: [AC4.1.3, C8]
  - id: BR1.3
    statement: "The catalog never overrides what the person confirmed on the order."
    category: policy
    applies_to: "order create and edit"
    trigger: "request"
    logic: "contact, description and unitPricePaise are stored as sent; ids only link."
    violation: "n/a"
    source: [Q2]

  # ---------------------------------------------------------------- BR2 the migration
  - id: BR2.1
    statement: "Migration 0023 turns customer_id and variant_id into same-business references."
    category: constraint
    applies_to: "src/db/migrations/0023_link_orders_to_catalog.sql"
    trigger: "migrate"
    logic: "One DO block per column, run only while information_schema.columns says the column's data_type is text: null every value with no same-business match, comparing on the text side (NOT EXISTS (SELECT 1 FROM customers c WHERE c.business_id = o.business_id AND c.id::text = o.customer_id)), so no cast of a non-UUID is attempted; then ALTER COLUMN … TYPE uuid USING customer_id::uuid (the index orders_business_customer_idx is rebuilt by Postgres). Constraints have fixed names and are added only when absent from pg_constraint: variants_business_id_id_key UNIQUE (business_id, id); orders_customer_fkey (business_id, customer_id) → customers (business_id, id); order_items_variant_fkey (business_id, variant_id) → variants (business_id, id). Every revision row of order_items is covered, so old revisions with a meaningless variant_id are nulled too. The nulling runs as the migration admin; app_role's grants are unchanged (order_items stays SELECT, INSERT). Applying the file twice changes nothing (review R-02)."
    violation: "migrate fails and the database is unchanged"
    source: [AC4.1.1, AC4.1.2, Q1]

  # ---------------------------------------------------------------- BR3 names on the list
  - id: BR3.1
    statement: "The order list shows the linked customer's and variants' current names."
    category: calculation
    applies_to: "GET /api/orders, toOrderSummary"
    trigger: "read"
    logic: "customerName = customerNames[customerId] ?? contact.name ?? null; itemLabels[i] = variantLabels[variantId] ?? description. A new async helper enrichSummaries(sql, ctx, orders) in src/orders/enrich-summaries.ts collects the page's distinct customer ids and variant ids, calls customerNames and variantLabels in chunks of at most 50 ids each, and returns the summaries; toOrderSummary stays a pure map used by it. GET /api/orders/:id also returns customerName and, per item, label (additive), computed the same way (review R-04)."
    violation: "n/a"
    source: [AC4.1.1, Q3]
  - id: BR3.2
    statement: "A customer's history lists the orders linked to that customer."
    category: calculation
    applies_to: "GET /api/orders?customerId, /customers/:id"
    trigger: "read"
    logic: "The existing customerId filter now matches the uuid column; the customer detail shows those orders with their status-bucket pills."
    violation: "n/a"
    source: [AC3.3.2]

  # ---------------------------------------------------------------- BR4 order screens
  - id: BR4.1
    statement: "Choosing a customer fills the contact fields, which stay editable."
    category: policy
    applies_to: "/orders/new customer picker"
    trigger: "pick"
    logic: "Search as on /customers (name, or ≥ 4 phone digits); picking sets customerId and fills name, phone, address; an Unlink action clears customerId only; a 'নতুন ক্রেতা' link opens /customers/new."
    violation: "n/a"
    source: [AC4.1.1, Q4]
  - id: BR4.2
    statement: "Choosing a product variant fills the line's description and price, which stay editable; a line may stay free text."
    category: policy
    applies_to: "/orders/new line picker"
    trigger: "pick"
    logic: "Search products by name or SKU, then pick a variant; set variantId, description = variant label, unitPricePaise = sellingPricePaise. Clearing the pick clears variantId only."
    violation: "n/a"
    source: [AC4.1.1, Q4]
  - id: BR4.3
    statement: "A repeated or edited order keeps its links, rechecked by the server."
    category: constraint
    applies_to: "/orders/new/repeat, order edit"
    trigger: "save"
    logic: "The past order's customerId and variantIds are sent; BR1.1 applies, so a link to something no longer valid is a 404 shown on the screen."
    violation: "404 not_found"
    source: [AC4.1.2, Q4]

  # ---------------------------------------------------------------- BR5 paste matching
  - id: BR5.1
    statement: "The paste screen matches against the business's own catalog."
    category: calculation
    applies_to: "GET /api/catalog/match-index; /orders/new/paste-parse"
    trigger: "screen open"
    logic: "The route (business.view) returns products ordered by name then id, each with its variants ordered by axis values, cut at 2 000 variants (whole products only) with truncated = true; U4 has no inactive products, so all are included. The screen passes it to the parser as its catalog and, when truncated, shows 'সব পণ্য মেলানো যায়নি — পণ্যের তালিকা খুব বড়' (review R-05)."
    violation: "n/a"
    source: [AC4.2.1, Q5]
  - id: BR5.2
    statement: "An item is linked to a product only when its own words match exactly one product."
    category: calculation
    applies_to: "parseMessage, reparseItem"
    trigger: "parse"
    logic: "Each product has exactly two match keys, never split into tokens (so 'Cotton Kurti' and 'Cotton Saree' are not both matched by 'Cotton'): (1) its whole name, trimmed, NFC-normalised, Latin letters upper-cased, matched as a phrase inside the item's own segment — a Latin name must start and end on a word boundary, a Bangla name may be a substring; names shorter than 2 characters are not keys; (2) its SKU, upper-cased, matched as one whole token where tokens are runs of [A-Z0-9-]. The segment text gets the same normalisation. One product matches → linked; several → unlinked and incomplete; none → unlinked. Only the item's own segment is read. A new mutant links the first of several matching products instead of leaving the item unlinked (review R-01)."
    violation: "n/a"
    source: [AC4.2.1, AC4.2.3]
  - id: BR5.3
    statement: "A linked item's variant comes from its own size and colour only."
    category: calculation
    applies_to: "paste result"
    trigger: "parse"
    logic: "Each axis of the linked product gets a kind: size when its name (trimmed, case-folded) is one of সাইজ, সাইজের, মাপ, size, or every value normalises to a parser size; colour when its name is one of রং, রঙ, কালার, colour, color, or every value normalises to a parser colour; otherwise other. Values normalise onto the parser's vocabulary: a size value is upper-cased with Bangla digits made ASCII ('m' → 'M'); a colour value maps to its canonical Bangla name by the parser's COLOURS table (Bangla prefix or English alias, case-insensitive: 'Red' → 'লাল'). Candidates start as all variants; for a size axis, IF the item has a size THEN keep variants whose normalised value equals it, ELSE IF the axis has more than one value THEN unresolved; the same for a colour axis; an other axis with more than one value is unresolved. A detail the item has but the product has no axis for (a colour on a size-only product) is ignored for the pick and stays visible in the item's text. Exactly one candidate left → that variant; zero, several or unresolved → variant unpicked and the line asks the person to choose. A product with no axes has exactly one variant, always picked."
    violation: "n/a"
    source: [AC4.2.2, Q5]

  # ---------------------------------------------------------------- BR6 phone suggestion
  - id: BR6.1
    statement: "A pasted phone that belongs to one customer pre-selects that customer, visibly and undoably."
    category: policy
    applies_to: "/orders/new/paste-parse"
    trigger: "after parse"
    logic: "Normalise the contact phone (U4 phone rule); search customers by it; exactly one → pre-select with 'এই নম্বরের ক্রেতা: <name>' and Unlink; several → show the choice; none → offer 'নতুন ক্রেতা হিসেবে যোগ করুন'."
    violation: "n/a"
    source: [Q6]

  # ---------------------------------------------------------------- BR7 proof
  - id: BR7.1
    statement: "The scripted check takes an order for the catalog customer and variant."
    category: policy
    applies_to: "tests/e2e/wiring-check.ts"
    trigger: "bun run gate"
    logic: "As Sales Staff: create an order with the check's customer and low variant; the order list shows the customer's name and the variant label; the customer's history contains the order."
    violation: "the gate fails"
    source: [AC5.2b.1, AC3.3.2, Q9]

  # ---------------------------------------------------------------- BR8 carried fixes
  - id: BR8.1
    statement: "Changing a product's cost updates its updated time; the money field refuses amounts over the server cap."
    category: validation
    applies_to: "setCost; the browser money parser"
    trigger: "save"
    logic: "setCost sets updated_at with the cost; parseTaka refuses more than 1 000 000 000 paise with the field message 'সর্বোচ্চ ৳১,০০,০০,০০০'."
    violation: "field error"
    source: [Q8]
```

## Rules summary

| Group | Rules | In one line |
|-------|-------|-------------|
| References | BR1.1–BR1.3 | Same-business ids only, checked through C8 in the order's transaction; the catalog never overrides the order |
| Migration | BR2.1 | 0023 nulls meaningless TEXT ids, makes both columns uuid, adds composite keys |
| Names | BR3.1–BR3.2 | List shows current customer and variant names; customer history works |
| Screens | BR4.1–BR4.3 | Customer and variant pickers fill editable fields; repeat keeps links |
| Paste | BR5.1–BR5.3 | Own-words-only, exactly-one-product linking; variant from own size and colour |
| Phone | BR6.1 | A known phone pre-selects its customer, undoably |
| Proof | BR7.1 | The gate's check takes the catalog order |
| Fixes | BR8.1 | Cost timestamp; money cap in the browser |
