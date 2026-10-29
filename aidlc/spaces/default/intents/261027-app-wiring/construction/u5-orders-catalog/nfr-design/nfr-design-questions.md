# NFR Design — Questions (u5-orders-catalog)

> Answered by the assistant on the Owner's standing instruction. Summary confirmation is off. Inputs: U5's
> NFR requirements (NFR1.16–NFR10.5) with review follow-ups R-01..R-03, U5's functional design, C3, C7, C8,
> C9, and the shipped code (`src/orders/create-order.ts`, `update-order.ts`, `list-orders.ts`,
> `parse-message*.ts`, `src/catalog/index.ts`). Pattern ids continue U4's (P25+, S34+, SC11+, R21+, O13+).

## Q1. Where the C8 checks sit in the order write

A. In `createOrder` and `updateOrder`, inside `sql.begin`: one `getCustomer` call when a customer id is
present; for lines, the distinct variant ids (an order may have up to 200 lines, `MAX_ORDER_ITEMS`) are
checked in chunks of at most 50 through C8's `variantLabels`, and any id missing from the returned map is
`not_found` — at most 4 queries for 200 lines instead of one per line (review R-01). Non-UUID ids are caught by
the UUID check before any SQL. In `createOrder` the checks run before `nextOrderNumber`, so a refused order
never burns an `ORD-####`; in `updateOrder` after the locked `selectOrder` and `isEditable`, so the error
order is: order not found, not editable, then link not found (review R-02)
B. Check before the transaction
X. Other (please specify)

[Answer]: A. Inside the transaction the check and the write see the same database state.
