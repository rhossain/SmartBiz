# Entities — u5-orders-catalog

> U5 adds no table. It turns two existing TEXT columns into real references to U4's catalog and adds one read
> view for paste matching. Owners follow `../../../inception/domain-design/components.md`. Decisions:
> `functional-design-questions.md` Q1–Q9.

```yaml
entities:
  - name: Order
    owner: OrdersComponent
    description: "Changed: customerId becomes a reference to a customer of the same business."
    attributes:
      - { name: customerId, type: uuid, required: false, references: "Customer (businessId, id)", note: "was TEXT; values that were not a same-business customer UUID are set to null by migration 0023 (Q1)" }
      - { name: contact, type: "{name, phone, address}", required: false, note: "unchanged; kept as the person confirmed it, never overwritten by the catalog (Q2)" }
    constraints:
      - "Composite foreign key (businessId, customerId) → Customer (businessId, id)."
    relationships:
      - { to: Customer, cardinality: "n Orders belong to 0..1 Customer" }

  - name: OrderItem
    owner: OrdersComponent
    description: "Changed: variantId becomes a reference to a variant of the same business."
    attributes:
      - { name: variantId, type: uuid, required: false, references: "Variant (businessId, id)", note: "was TEXT; non-matching values nulled by migration 0023" }
      - { name: description, type: text, required: true, note: "unchanged; the screen fills it with the variant label when one is picked" }
      - { name: unitPricePaise, type: integer, required: true, note: "unchanged; the screen fills it with the selling price, editable" }
    constraints:
      - "Composite foreign key (businessId, variantId) → Variant (businessId, id); needs UNIQUE (businessId, id) on variants, added by 0023."
    relationships:
      - { to: Variant, cardinality: "n OrderItems refer to 0..1 Variant" }

  - name: MatchIndexEntry
    owner: CatalogComponent
    description: "Read-only view for paste matching (GET /api/catalog/match-index)."
    attributes:
      - { name: productId, type: uuid, required: true }
      - { name: name, type: text, required: true }
      - { name: sku, type: text, required: true }
      - { name: axisNames, type: "list of text", required: true }
      - { name: variants, type: "list of {variantId, axisValues}", required: true }
    constraints:
      - "At most 2 000 variants in one response; truncated = true beyond."
```

## Summary

| Entity | Change |
|--------|--------|
| Order | `customerId` becomes a same-business customer reference; `contact` unchanged |
| OrderItem | `variantId` becomes a same-business variant reference; description and price unchanged |
| MatchIndexEntry | new read view for the paste screen; no storage |
