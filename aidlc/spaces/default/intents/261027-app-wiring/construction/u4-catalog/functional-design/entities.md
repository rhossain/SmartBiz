# Entities — u4-catalog

> Source of truth for the data U4 adds. Technology-agnostic: logical types only. Owner of every entity
> below is CatalogComponent (`../../../inception/domain-design/components.md`). Decisions:
> `functional-design-questions.md` Q1–Q16. Money is whole paise; every timestamp is UTC on the app clock.

```yaml
entities:
  - name: Customer
    owner: CatalogComponent
    description: A person the business sells to.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: name, type: text, required: true, min: 1, max: 120, note: "trimmed; PII — never in an audit payload or log" }
      - { name: phone, type: text, required: true, constraints: "matches 01[3-9] + 8 digits after normalisation (BR2.1)", note: "PII; not unique (BR3.3)" }
      - { name: address, type: text, required: false, max: 300, note: "PII; null when not given" }
      - { name: riskLevel, type: integer, required: true, min: 0, max: 3, default: 0 }
      - { name: createdBy, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    constraints:
      - "(businessId, id) is unique, so child rows can reference the pair (Q15)."
      - "Searched by phone within a business; an index supports equality and contains-digits search."
    relationships:
      - { to: Business, cardinality: "n Customers belong to 1 Business" }
      - { to: CustomerNote, cardinality: "1 Customer has 0..n CustomerNotes" }

  - name: CustomerNote
    owner: CatalogComponent
    description: An append-only note about a customer; a revision is a new note.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: customerId, type: uuid, required: true, references: "Customer (businessId, id)" }
      - { name: text, type: text, required: true, min: 1, max: 2000, note: "trimmed; never in an audit payload" }
      - { name: revisesNoteId, type: uuid, required: false, references: "CustomerNote (businessId, customerId, id): the same customer's note", unique: true, note: "unique: a note is revised at most once (BR4.3)" }
      - { name: createdBy, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
    constraints:
      - "Never updated or deleted: the application role holds only SELECT and INSERT (BR12.2)."
      - "(businessId, customerId, id) is unique, so the revision reference can include the customer and the database refuses a cross-customer revision."
    relationships:
      - { to: Customer, cardinality: "n Notes belong to 1 Customer" }
      - { to: CustomerNote, cardinality: "0..1 later Note revises 1 earlier Note" }

  - name: Supplier
    owner: CatalogComponent
    description: A business the shop restocks from.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: name, type: text, required: true, min: 1, max: 120, note: "never in an audit payload" }
      - { name: phone, type: text, required: true, constraints: "BR2.1 shape", note: "never in an audit payload" }
      - { name: createdBy, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    constraints:
      - "(businessId, id) is unique."
    relationships:
      - { to: Business, cardinality: "n Suppliers belong to 1 Business" }
      - { to: Product, cardinality: "1 Supplier is the default of 0..n Products" }

  - name: Product
    owner: CatalogComponent
    description: Something the shop sells, with up to two axes of variation.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: name, type: text, required: true, min: 1, max: 120 }
      - { name: sku, type: text, required: true, min: 1, max: 40, constraints: "letters, digits, '-', '_', '.'; unique per business ignoring case; fixed after creation" }
      - { name: category, type: text, required: false, max: 60 }
      - { name: sellingPricePaise, type: integer, required: true, min: 0, max: 1000000000 }
      - { name: purchaseCostPaise, type: integer, required: false, min: 0, max: 1000000000, note: "null = not recorded, never shown as ৳0; returned only to cost-reading roles (BR9.2)" }
      - { name: defaultSupplierId, type: uuid, required: false, references: "Supplier (businessId, id)" }
      - { name: axes, type: "list of {name, values[]}", required: true, constraints: "0..2 axes, 1..12 values each, no '-' in a value; BR6.3", note: "fixed after creation" }
      - { name: createdBy, type: uuid, required: true, references: User.id }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    constraints:
      - "(businessId, lower(sku)) is unique (BR6.2)."
      - "(businessId, id) is unique."
    relationships:
      - { to: Business, cardinality: "n Products belong to 1 Business" }
      - { to: Variant, cardinality: "1 Product has 1..144 Variants" }
      - { to: Supplier, cardinality: "n Products have 0..1 default Supplier" }

  - name: Variant
    owner: CatalogComponent
    description: One combination of a product's axis values, with its own stock.
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: businessId, type: uuid, required: true, references: Business.id }
      - { name: productId, type: uuid, required: true, references: "Product (businessId, id)" }
      - { name: axisValues, type: "list of text", required: true, constraints: "one value per product axis, in axis order; empty when the product has no axes" }
      - { name: skuSuffix, type: text, required: true, note: "axis values joined by '-'; empty string with no axes" }
      - { name: stock, type: integer, required: true, min: 0, max: 1000000 }
      - { name: minimumStock, type: integer, required: true, min: 0, max: 1000000 }
      - { name: createdAt, type: timestamp, required: true }
      - { name: updatedAt, type: timestamp, required: true }
    constraints:
      - "(productId, axisValues) is unique: each combination once (BR6.4)."
      - "Low = stock < minimumStock (BR7.2); an index supports the low-stock query per business."
    relationships:
      - { to: Product, cardinality: "n Variants belong to 1 Product" }

  - name: CatalogAuditEntry
    owner: AuditService
    description: "The audit_log row each catalog write adds first (shape owned by AuditService; listed for the payload rules)."
    attributes:
      - { name: action, type: enum, allowed: [customer.create, customer.update, customer.note.add, supplier.create, supplier.update, product.create, product.update, product.cost.set, variant.stock.set], required: true }
      - { name: subjectKind, type: enum, allowed: [customer, supplier, product, variant], required: true, note: "a note's subject is its customer" }
      - { name: subjectId, type: uuid, required: true }
      - { name: payload, type: object, required: true, constraints: "no name, phone, address or note text (BR10.2)" }
```

## Summary

| Entity | What it is | Key rules |
|--------|------------|-----------|
| Customer | A buyer: name, phone, address, risk 0–3 | phone normalised; duplicates warned, not refused |
| CustomerNote | Append-only note; a revision is a new row | revised at most once; never updated or deleted |
| Supplier | Who the shop restocks from | name + phone required; not deletable |
| Product | Name, fixed SKU, optional category, price, optional cost, default supplier, 0–2 axes | SKU unique per business ignoring case; cost null = not recorded |
| Variant | One axis-value combination with stock and minimum | low when stock < minimum |
| CatalogAuditEntry | The audit row each write adds first | no PII or note text in the payload |

Every table carries the business id, and children reference parents by (business, id), so the database
itself refuses a cross-business link (Q15).
