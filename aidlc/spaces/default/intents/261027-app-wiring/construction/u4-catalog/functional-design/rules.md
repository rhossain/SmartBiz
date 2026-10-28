# Business Rules — u4-catalog

> Source of truth for U4's decision logic. Groups: BR1 access, BR2 phones, BR3 customers, BR4 notes,
> BR5 search and customer detail, BR6 products and variants, BR7 stock and low stock, BR8 suppliers,
> BR9 purchase cost, BR10 audit, BR11 tenancy and errors, BR12 schema and grants, BR13 screens, BR14 read
> functions for orders, BR15 the scripted check. Sources: ACs in
> `../../../inception/user-stories/stories.md`, requirements FR5–FR7, contracts C1, C7, C8, C9, decisions
> Q1–Q16 in `functional-design-questions.md`.

```yaml
rules:
  # ---------------------------------------------------------------- BR1 access
  - id: BR1.1
    statement: "Every signed-in role reads customers, products, suppliers and low stock."
    category: authorization
    applies_to: "every GET under /api/customers, /api/products, /api/suppliers, /api/low-stock; the read screens"
    trigger: "request or route open"
    logic: "IF the role holds business.view THEN allow (all four roles do)."
    violation: "401 without a session"
    source: [US5.1, Q1]
  - id: BR1.2
    statement: "Owner, Manager and Sales Staff create and edit customers and notes; the Accountant cannot."
    category: authorization
    applies_to: "POST /api/customers, PATCH /api/customers/:id, POST /api/customers/:id/notes, /customers/new, /customers/:id/edit"
    trigger: "request or route open"
    logic: "IF the role holds none of money.mutate.price, money.mutate.full THEN 403; the screens hide the new, edit and add-note actions."
    violation: "403 forbidden; lock screen"
    source: [AC3.1.5, US5.1, Q1]
  - id: BR1.3
    statement: "Only the Owner and the Manager create or edit products, variants' stock and suppliers."
    category: authorization
    applies_to: "POST /api/products, PATCH /api/products/:id, PATCH /api/variants/:id/stock, POST /api/suppliers, PATCH /api/suppliers/:id, /products/new, /products/:id/edit"
    trigger: "request or route open"
    logic: "IF the role lacks money.mutate.full THEN 403; the screens show stock and supplier fields read-only."
    violation: "403 forbidden; lock screen"
    source: [AC3.4.4, AC3.5.1, AC3.7.2, US5.1, Q1]
  - id: BR1.4
    statement: "Owner, Manager and Accountant change a product's purchase cost; Sales Staff cannot."
    category: authorization
    applies_to: "PATCH /api/products/:id/cost"
    trigger: "request"
    logic: "IF the role holds neither money.mutate.cost nor money.mutate.full THEN 403."
    violation: "403 forbidden"
    source: [AC3.7.1, AC3.7.3, Q1]

  # ---------------------------------------------------------------- BR2 phones
  - id: BR2.1
    statement: "A phone is stored as 01XXXXXXXXX after normalisation, or refused."
    category: validation
    applies_to: "customer and supplier phone on create and edit"
    trigger: "request (server) and field blur (screen)"
    logic: "Convert Bangla digits to ASCII; remove spaces, '-', '.', '(' and ')'; IF it starts with '+880' or '880' THEN replace that with '0'; IF the result is not '01', one of 3–9, then 8 digits THEN refuse."
    violation: "400 invalid_input on field phone; screen: সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু, ১১ সংখ্যা)"
    source: [AC3.1.2, AC3.6.1, Q3]
  - id: BR2.2
    statement: "Phones are shown in the reader's digits."
    category: policy
    applies_to: "every screen showing a phone"
    trigger: "render"
    logic: "IF the locale is bn THEN render the stored digits as Bangla digits; the tel: link always uses the stored ASCII form."
    violation: "n/a"
    source: [AC3.3.4, AC3.6.2, Q3]

  # ---------------------------------------------------------------- BR3 customers
  - id: BR3.1
    statement: "A customer needs a name and a valid phone; address and risk level are optional. An edit changes only the fields it sends."
    category: validation
    applies_to: "POST /api/customers, PATCH /api/customers/:id"
    trigger: "request"
    logic: "Create: IF name is empty after trimming or longer than 120, OR phone is missing, OR address longer than 300, OR an unknown key is sent THEN refuse; risk level defaults to 0 and address to null. Edit: every field is optional but at least one is sent; an omitted field is left unchanged; address null clears it; name and phone, when sent, follow the create rules; the 0 default never applies on edit."
    violation: "400 invalid_input with fields"
    source: [AC3.1.1, FR5.1, Q7]
  - id: BR3.2
    statement: "Risk level is a whole number 0–3, shown as a chip with its text label."
    category: validation
    applies_to: "riskLevel on create and edit; the RiskChip"
    trigger: "request; render"
    logic: "IF riskLevel is not an integer in 0..3 THEN refuse. Labels 0 কোনো ঝুঁকি নেই, 1 কম, 2 মাঝারি, 3 বেশি (en: No risk, Low, Medium, High); colour is secondary, never the only signal."
    violation: "400 invalid_input on field riskLevel"
    source: [AC3.1.4]
  - id: BR3.3
    statement: "A phone already used by another customer is a warning, not a refusal."
    category: policy
    applies_to: "POST /api/customers, PATCH /api/customers/:id; the new and edit screens"
    trigger: "save; phone field blur"
    logic: "After saving, IF another customer of the business (not this one) has the same stored phone THEN return duplicatePhoneOf = {id, name} of the oldest such customer, else null. The screen saves, opens the customer and shows 'এই নম্বরে আগে থেকেই আছেন: <name> →' linking to that customer. There is no pre-save check (one source of truth: the server's answer)."
    violation: "n/a (never blocks)"
    source: [AC3.1.3, Q4]
  - id: BR3.4
    statement: "A new customer may carry a first note, saved in the same transaction."
    category: constraint
    applies_to: "POST /api/customers with note"
    trigger: "request"
    logic: "IF note is present THEN validate it by BR4.1 and insert it after the customer, with its own audit row, in the same transaction."
    violation: "400 invalid_input on field note"
    source: [AC3.1.1, Q6]
  - id: BR3.5
    statement: "Customers are never deleted in this intent."
    category: constraint
    applies_to: "customers"
    trigger: "always"
    logic: "No delete endpoint; the application role holds no DELETE on customers."
    violation: "n/a"
    source: [Q7]

  # ---------------------------------------------------------------- BR4 notes
  - id: BR4.1
    statement: "A note is 1–2 000 characters after trimming."
    category: validation
    applies_to: "POST /api/customers/:id/notes; the first note on create"
    trigger: "request"
    logic: "IF text is empty after trimming or longer than 2 000 THEN refuse."
    violation: "400 invalid_input on field text"
    source: [FR5.2, Q6]
  - id: BR4.2
    statement: "A revision is a new note referencing the prior one; the prior row never changes."
    category: constraint
    applies_to: "POST /api/customers/:id/notes with revisesNoteId"
    trigger: "request"
    logic: "Insert a new note with revisesNoteId = the prior note's id; no UPDATE is issued; IF revisesNoteId is not a note of this customer in this business THEN 404. The database reference is (business, customer, revisesNoteId), so it also refuses a revision of another customer's note."
    violation: "404 not_found"
    source: [AC3.2.1, Q6]
  - id: BR4.3
    statement: "A note is revised at most once, so each history is one straight line."
    category: constraint
    applies_to: "POST /api/customers/:id/notes with revisesNoteId"
    trigger: "request"
    logic: "IF another note already revises revisesNoteId THEN refuse; the database's unique constraint on revisesNoteId decides a race."
    violation: "409 conflict; screen: এই নোট আগেই সংশোধন হয়েছে — পাতাটি আবার খুলুন"
    source: [AC3.2.1, Q6]
  - id: BR4.4
    statement: "Notes show newest first, each with its earlier versions beneath it."
    category: policy
    applies_to: "GET /api/customers/:id; customer detail"
    trigger: "read"
    logic: "Return the newest 200 notes with revisesNoteId and notesTruncated = true beyond that; the screen shows each note no other note revises, newest first, and under it the chain it revises, labelled আগের নোট. With no notes: এখনো কোনো নোট নেই."
    violation: "n/a"
    source: [AC3.2.2, Q6]

  # ---------------------------------------------------------------- BR5 search and customer detail
  - id: BR5.1
    statement: "Search matches the name, and the phone when the query has at least 4 digits."
    category: calculation
    applies_to: "GET /api/customers?q"
    trigger: "request"
    logic: "Trim q and convert Bangla digits. Let d = q without spaces, '-' and one leading '+'. IF d is all digits AND has ≥ 4 digits THEN match phone contains d (after a leading 880 in d becomes 0) OR name contains q; ELSE match name contains q, case-insensitive, with % and _ literal. Newest first, keyset cursor (C1), limit 1–50; total = the number of customers matching q (shown as the count tile)."
    violation: "400 invalid_input for an undecodable cursor"
    source: [AC3.3.1, Q5]
  - id: BR5.2
    statement: "Fewer than 4 digits searches names only, and the screen says so."
    category: policy
    applies_to: "customer list search box"
    trigger: "typing (300 ms after the last key)"
    logic: "IF the query is 1–3 digits THEN show the hint নম্বর দিয়ে খুঁজতে কমপক্ষে ৪টি সংখ্যা লিখুন."
    violation: "n/a"
    source: [AC3.3.1]
  - id: BR5.3
    statement: "Every customer row and the detail show the risk chip."
    category: policy
    applies_to: "customer list, customer detail"
    trigger: "render"
    logic: "Render RiskChip(riskLevel) by BR3.2 on each row and on the profile."
    violation: "n/a"
    source: [AC3.3.1, FR5.3]
  - id: BR5.4
    statement: "The customer detail shows the profile, notes and order history with status-bucket labels."
    category: policy
    applies_to: "/customers/:id"
    trigger: "open"
    logic: "Load the customer (with notes) and GET /api/orders?customerId=<id>; each order row shows its number, status and the BasisPill of its status bucket (earned, realized, pipeline, no sale). With no orders, show এখনো অর্ডার নেই."
    violation: "n/a"
    source: [AC3.3.2, FR5.4, Q13]
  - id: BR5.5
    statement: "Payments and dues are not available yet, never ৳০."
    category: policy
    applies_to: "customer detail, লেনদেন ও বাকি section"
    trigger: "render"
    logic: "Show NotAvailable with এখনো চালু হয়নি; no data-money element and no digit in that section."
    violation: "n/a"
    source: [AC3.3.3, FR5.4]
  - id: BR5.6
    statement: "Figures and dates use Bangla digits in the Bangla locale."
    category: policy
    applies_to: "every catalog screen"
    trigger: "render"
    logic: "Counts, money, stock, phones and dates go through the I18n digit and date formatters."
    violation: "n/a"
    source: [AC3.3.4]

  # ---------------------------------------------------------------- BR6 products and variants
  - id: BR6.1
    statement: "A product needs a name, a SKU and a selling price; category, cost and supplier are optional."
    category: validation
    applies_to: "POST /api/products, PATCH /api/products/:id"
    trigger: "request"
    logic: "IF name is not 1–120 characters, OR sku is not 1–40 of letters, digits, '-', '_', '.', OR category longer than 60, OR a price or cost is not an integer 0..1 000 000 000, OR an unknown key is sent THEN refuse. Negative cost or price is refused here."
    violation: "400 invalid_input with fields"
    source: [AC3.4.3, FR6.1, FR6.2, Q8]
  - id: BR6.2
    statement: "A SKU is unique per business, ignoring case."
    category: constraint
    applies_to: "POST /api/products"
    trigger: "request"
    logic: "IF another product of the business has the same SKU ignoring case THEN refuse; the database's unique index on (business, lower(sku)) decides a race and its violation alone is translated to conflict."
    violation: "409 conflict; screen: এই কোড আগেই ব্যবহার হয়েছে"
    source: [AC3.4.2, FR6.2]
  - id: BR6.3
    statement: "At most two axes, each named and with 1–20 distinct values."
    category: validation
    applies_to: "POST /api/products axes"
    trigger: "request"
    logic: "IF more than 2 axes, OR an axis name is not 1–30 characters, OR two axis names are equal ignoring case, OR an axis has no values or more than 12, OR a value is not 1–30 characters or contains '-', OR two values of one axis are equal ignoring case THEN refuse. At most 12 × 12 = 144 variants, so the request stays well under the 64 KiB body limit (about 220 bytes a variant)."
    violation: "400 invalid_input; the screen disables the third-axis button instead of erroring"
    source: [AC3.4.3, FR6.2, Q9]
  - id: BR6.4
    statement: "The variants are exactly the cross product of the axis values."
    category: validation
    applies_to: "POST /api/products variants"
    trigger: "request"
    logic: "IF the set of variants' axisValues is not every combination of the axes' values exactly once (with no axes: exactly one variant with no values), OR a variant's stock or minimum is not an integer 0..1 000 000 THEN refuse."
    violation: "400 invalid_input on field variants"
    source: [AC3.4.1, Q9]
  - id: BR6.5
    statement: "Each variant gets its own SKU suffix; the full SKU is the product SKU plus the suffix."
    category: calculation
    applies_to: "variant creation; every variant label"
    trigger: "create"
    logic: "suffix = axis values joined by '-'; fullSku = sku when suffix is empty, else sku + '-' + suffix. Because a value cannot contain '-', different combinations give different suffixes; the suffix is a display and lookup label and keeps the values' own characters (Bangla included)."
    violation: "n/a"
    source: [AC3.4.1, FR6.1]
  - id: BR6.6
    statement: "Creating a product creates all its variants in one transaction, audit row first."
    category: constraint
    applies_to: "POST /api/products"
    trigger: "request"
    logic: "In one transaction: write the product.create audit row, insert the product, insert every variant; any failure rolls back all of it."
    violation: "nothing is stored"
    source: [AC3.4.1, FR6.7]
  - id: BR6.7
    statement: "SKU, axes and variants are fixed after creation; name, category, price and default supplier are editable."
    category: constraint
    applies_to: "PATCH /api/products/:id"
    trigger: "request"
    logic: "The edit schema accepts only name, category, sellingPricePaise and defaultSupplierId (at least one); sku, axes, variants or cost in the body are unknown keys and refused."
    violation: "400 invalid_input"
    source: [AC3.7.2, Q8, Q9]
  - id: BR6.8
    statement: "A product list row shows its variant count, total stock, low count and price, and cost only to cost readers."
    category: calculation
    applies_to: "GET /api/products, /products"
    trigger: "read"
    logic: "variantCount, totalStock = sum of stock, lowCount = variants with stock < minimum; q matches name or SKU (contains, case-insensitive); newest first, keyset cursor, limit 1–50; total = products matching q."
    violation: "n/a"
    source: [FR6.4, Q8]

  # ---------------------------------------------------------------- BR7 stock and low stock
  - id: BR7.1
    statement: "Stock and minimum stock are set as absolute whole numbers ≥ 0."
    category: validation
    applies_to: "PATCH /api/variants/:id/stock"
    trigger: "request"
    logic: "IF neither stock nor minimumStock is sent, OR either is not an integer 0..1 000 000 THEN refuse; lock the variant row, write variant.stock.set with the old and new value of each changed field, then update."
    violation: "400 invalid_input"
    source: [AC3.5.1, FR6.3, Q10]
  - id: BR7.2
    statement: "A variant is low when its stock is below its minimum; at the minimum it is not low."
    category: calculation
    applies_to: "product detail, product list lowCount, /api/low-stock"
    trigger: "read"
    logic: "low = stock < minimumStock. A low variant shows LowStockMark with the text কম মজুদ."
    violation: "n/a"
    source: [AC3.5.2]
  - id: BR7.3
    statement: "The low-stock list shows every low variant with its product and default supplier."
    category: calculation
    applies_to: "GET /api/low-stock, /low-stock"
    trigger: "read"
    logic: "Every variant of the business with stock < minimum, with product id and name, axis values, stock, minimum and the product's default supplier {id, name, phone} or null; ordered by product name then values; at most 200 with truncated = true beyond that. Each row links to its product, and to its supplier's call link when there is one."
    violation: "n/a"
    source: [AC3.5.3, FR6.5, Q11]
  - id: BR7.4
    statement: "A low variant without a supplier says so and offers to set one."
    category: policy
    applies_to: "/low-stock, product detail"
    trigger: "render"
    logic: "IF supplier is null THEN show সরবরাহকারী দেওয়া নেই and a link to the product's edit screen (Owner and Manager) or to the product (others)."
    violation: "n/a"
    source: [AC3.5.4, FR6.4]
  - id: BR7.5
    statement: "With nothing low, the low-stock screen says all is well."
    category: policy
    applies_to: "/low-stock"
    trigger: "render with zero rows"
    logic: "Show সব ধরনের মজুদ ঠিক আছে, a positive empty state with no action."
    violation: "n/a"
    source: [AC3.5.3]

  # ---------------------------------------------------------------- BR8 suppliers
  - id: BR8.1
    statement: "A supplier needs a name and a valid phone."
    category: validation
    applies_to: "POST /api/suppliers, PATCH /api/suppliers/:id"
    trigger: "request"
    logic: "IF name is not 1–120 characters OR phone fails BR2.1 OR an unknown key is sent THEN refuse."
    violation: "400 invalid_input with fields"
    source: [AC3.6.1, FR6.6, Q12]
  - id: BR8.2
    statement: "A product's default supplier must belong to the same business."
    category: constraint
    applies_to: "defaultSupplierId on product create and edit"
    trigger: "request"
    logic: "IF defaultSupplierId is not null and is not a supplier of the session's business THEN refuse."
    violation: "404 not_found"
    source: [AC3.6.3, Q15]
  - id: BR8.3
    statement: "Wherever a supplier shows, its name comes with a tel: call link."
    category: policy
    applies_to: "product detail, /low-stock, /suppliers"
    trigger: "render"
    logic: "Render the name and a link tel:<stored phone> labelled কল করুন."
    violation: "n/a"
    source: [AC3.6.2, FR6.6]
  - id: BR8.4
    statement: "The supplier list shows every supplier with its default-product count."
    category: calculation
    applies_to: "GET /api/suppliers, /suppliers"
    trigger: "read"
    logic: "Every supplier of the business by name, each with productCount = products naming it as default; at most 200 with truncated; suppliers are never deleted."
    violation: "n/a"
    source: [AC3.6.1, Q12]

  # ---------------------------------------------------------------- BR9 purchase cost
  - id: BR9.1
    statement: "The cost endpoint changes only the purchase cost."
    category: constraint
    applies_to: "PATCH /api/products/:id/cost"
    trigger: "request"
    logic: "Body is exactly {purchaseCostPaise: integer 0..1 000 000 000}; lock the product row; write product.cost.set with the old cost (or null) and the new cost; update only that column."
    violation: "400 invalid_input; 404 for a foreign or missing product"
    source: [AC3.7.1]
  - id: BR9.2
    statement: "Purchase cost is returned only to roles that may change it."
    category: authorization
    applies_to: "GET /api/products, GET /api/products/:id, and every product write response"
    trigger: "response"
    logic: "IF the role holds money.mutate.cost or money.mutate.full THEN include purchaseCostPaise (an integer or null) ELSE leave the key out of the body entirely."
    violation: "n/a (asserted by a server test over every product response)"
    source: [Q2]
  - id: BR9.3
    statement: "For the Accountant the product screen has exactly one editable thing: the cost."
    category: policy
    applies_to: "/products/:id for the Accountant"
    trigger: "render"
    logic: "Show ক্রয়মূল্য with a বদলান action; price, supplier, stock and minimum are read-only; no edit link."
    violation: "n/a"
    source: [AC3.7.2]
  - id: BR9.4
    statement: "A cost that was never recorded shows as not recorded, never ৳০."
    category: policy
    applies_to: "product list and detail for cost readers"
    trigger: "render"
    logic: "IF purchaseCostPaise is null THEN show দেওয়া হয়নি instead of an amount."
    violation: "n/a"
    source: [Q8]

  # ---------------------------------------------------------------- BR10 audit
  - id: BR10.1
    statement: "Every catalog write adds one audit row before its data change, in the same transaction; a write that changes nothing adds none."
    category: constraint
    applies_to: "every POST and PATCH in C7"
    trigger: "request"
    logic: "Inside the write's transaction: the locking read of the existing row (edits only) may come first; then insert the audit row (actor, business, action, subject, payload); then insert or update the data row(s); IF any step fails THEN all roll back. IF an edit's values equal the stored ones THEN answer 200 with the unchanged entity and write no audit row and no update."
    violation: "nothing is stored"
    source: [AC3.1.1, AC3.4.1, AC3.5.1, AC3.6.1, AC3.7.1, FR5.5, FR6.7]
  - id: BR10.2
    statement: "Catalog audit payloads hold no name, phone, address or note text."
    category: constraint
    applies_to: "catalog audit rows"
    trigger: "audit insert"
    logic: "Subject is the entity written (customer, supplier, product, variant); a note's subject is its customer. customer.create {riskLevel, hasAddress}; customer.update {changed: field names, riskLevel?: {before, after}}; customer.note.add {noteId, revisesNoteId}; supplier.create {}; supplier.update {changed}; product.create {sku, variantCount, axisCount, sellingPricePaise, purchaseCostPaise (integer or null)}; product.update {changed, sellingPricePaise?: {before, after}, defaultSupplierId?: {before, after}}; product.cost.set {before, after}; variant.stock.set {productId, stock?: {before, after}, minimumStock?: {before, after}}."
    violation: "a test fails if any payload contains a stored name, phone, address or note text"
    source: [AC3.1.1, AC3.6.1, AC3.7.1, AC3.5.1, FR5.5]

  # ---------------------------------------------------------------- BR11 tenancy and errors
  - id: BR11.1
    statement: "Every catalog read and write is scoped to the session's business."
    category: authorization
    applies_to: "every catalog query"
    trigger: "always"
    logic: "The business id comes from the session row, never from the request; every query filters on it."
    violation: "n/a"
    source: [AC3.3.5, AC3.6.3, FR7.3]
  - id: BR11.2
    statement: "A foreign, missing or non-UUID id answers 404, the same as missing."
    category: authorization
    applies_to: "every :id route and every id in a body"
    trigger: "request"
    logic: "Path and body ids are plain strings in the zod schemas (never z.uuid(), which would answer 400); the domain function checks the UUID shape before any SQL. IF the id is not a UUID OR no row of the session's business has it THEN 404 not_found; the screen shows the not-found state."
    violation: "404 not_found"
    source: [AC3.3.5, AC3.6.3]
  - id: BR11.3
    statement: "Children reference parents by (business, id) in the database."
    category: constraint
    applies_to: "customer_notes→customers, customer_notes→customer_notes (revision), variants→products, products→suppliers"
    trigger: "insert or update"
    logic: "Each reference includes the business id, so a cross-business link is refused by the database even if the application filter were wrong."
    violation: "the write fails"
    source: [Q15]

  # ---------------------------------------------------------------- BR12 schema and grants
  - id: BR12.1
    statement: "The catalog tables arrive by numbered migrations with exact grants."
    category: constraint
    applies_to: "migrations 0018–0022"
    trigger: "migrate"
    logic: "0018 suppliers, 0019 customers, 0020 customer_notes, 0021 products, 0022 variants; each opens with a comment naming CatalogComponent and U4 and grants app_role exactly its declared set; the declared grant list gains the five rows in the same commit."
    violation: "the realdb grant gate fails"
    source: [AC5.2b.2, C9]
  - id: BR12.2
    statement: "app_role holds no UPDATE or DELETE on customer_notes, and no DELETE on any catalog table."
    category: constraint
    applies_to: "grants"
    trigger: "migrate; the realdb gate"
    logic: "customers, products, variants, suppliers: SELECT, INSERT, UPDATE. customer_notes: SELECT, INSERT. The realdb gate compares pg_catalog with the declared set exactly."
    violation: "the realdb grant gate fails"
    source: [AC3.2.3, AC5.2b.2]

  # ---------------------------------------------------------------- BR13 screens
  - id: BR13.1
    statement: "The catalog screens are routes every role can open, with writes behind the write capability."
    category: authorization
    applies_to: "/customers, /customers/new, /customers/:id, /customers/:id/edit, /products, /products/new, /products/:id, /products/:id/edit, /low-stock, /suppliers"
    trigger: "route open"
    logic: "Read routes need business.view; /customers/new and /customers/:id/edit need BR1.2's set; /products/new and /products/:id/edit need money.mutate.full; otherwise the lock screen names what is missing."
    violation: "lock screen"
    source: [AC3.1.5, AC3.4.4, US5.1, Q14]
  - id: BR13.2
    statement: "The navigation shows ক্রেতা, পণ্য, কম মজুদ and সরবরাহকারী to every role."
    category: policy
    applies_to: "Shell navigation"
    trigger: "render"
    logic: "Add the four links for every role; the add actions on the list screens show only for roles that may use them."
    violation: "n/a"
    source: [AC3.1.5, Q14]
  - id: BR13.3
    statement: "Every catalog screen uses the shared states and a back link."
    category: policy
    applies_to: "every catalog screen"
    trigger: "render"
    logic: "Loading, error with retry, empty and not-found come from ApiState; every detail and form screen has the back link to its list; saving shows the success toast and goes to the detail."
    violation: "n/a"
    source: [AC3.3.5, Q14]

  # ---------------------------------------------------------------- BR14 read functions for orders (C8)
  - id: BR14.1
    statement: "getCustomer and getVariant read the catalog for the caller's business and return NotFound otherwise."
    category: constraint
    applies_to: "src/catalog/index.ts exports used by U5"
    trigger: "call inside an order write"
    logic: "One query filtered by business and id; a missing, foreign or non-UUID id → NotFound; no writes, no audit rows; infrastructure errors are thrown. NotFound moves to the shared src/data/not-found.ts, so catalog never imports from orders (no cycle with U5). VariantRef.label and sellingPricePaise come from the joined product."
    violation: "NotFound value"
    source: [C8, Q15]
  - id: BR14.2
    statement: "customerNames and variantLabels resolve up to 50 ids in one query each."
    category: calculation
    applies_to: "src/catalog/index.ts exports used by U5"
    trigger: "call"
    logic: "IF more than 50 ids THEN throw (a programming error); ELSE one query with the id list; label = product name · value · value; ids not found are left out of the map. Callers dedupe and chunk by 50 (a U5 requirement: one order page can name more than 50 variants)."
    violation: "thrown error for > 50 ids"
    source: [C8]

  # ---------------------------------------------------------------- BR15 the scripted check
  - id: BR15.1
    statement: "The one-command check also proves the catalog end to end."
    category: policy
    applies_to: "tests/e2e/wiring-check.ts"
    trigger: "bun run gate"
    logic: "After the Bolt 1 steps, as the Manager: create a supplier, a product with two axes and that supplier as default, set one variant's stock below its minimum, see it on GET /api/low-stock; as Sales Staff: create a customer with a Bangla-digit phone. The order for that customer and variant is added by U5 (US4.1)."
    violation: "the gate fails"
    source: [AC5.2b.1]
```

## Rules summary

| Group | Rules | In one line |
|-------|-------|-------------|
| Access | BR1.1–BR1.4 | Everyone reads; Owner/Manager/Sales write customers; Owner/Manager write products, stock, suppliers; cost also the Accountant |
| Phones | BR2.1–BR2.2 | Normalise to `01XXXXXXXXX` or refuse; show in the reader's digits |
| Customers | BR3.1–BR3.5 | Name + phone required; risk 0–3 chip; duplicate phone warns; never deleted |
| Notes | BR4.1–BR4.4 | Append-only; a revision is a new row; one straight history per note |
| Search, detail | BR5.1–BR5.6 | Name, or phone with ≥ 4 digits; history with bucket pills; dues "not available yet"; Bangla digits |
| Products | BR6.1–BR6.8 | SKU unique ignoring case and fixed; ≤ 2 axes; variants = full cross product; one transaction |
| Stock | BR7.1–BR7.5 | Absolute values, audited old→new; low = stock < minimum; low-stock list with supplier |
| Suppliers | BR8.1–BR8.4 | Name + phone; same-business only; tel: link everywhere |
| Cost | BR9.1–BR9.4 | Own endpoint; returned only to cost readers; null = not recorded |
| Audit | BR10.1–BR10.2 | Audit row first, same transaction; no PII or note text |
| Tenancy | BR11.1–BR11.3 | Business from the session; foreign = missing = 404; database refuses cross-business links |
| Schema | BR12.1–BR12.2 | Migrations 0018–0022; exact grants; notes insert-only |
| Screens | BR13.1–BR13.3 | Ten routes, nav for all roles, shared states, back links |
| Orders read | BR14.1–BR14.2 | C8 functions for U5 |
| Check | BR15.1 | The gate's scripted check covers the catalog |
