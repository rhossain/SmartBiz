# Frontend Components — u4-catalog

> The catalog screens (mockups §6–§12, drawn in the §16 visual language). Screens live in
> `src/catalog/screens/` and follow the ESLint boundary: they receive their load and save functions as
> props from the router and import only `import type` from the API client. Every screen uses `ApiState` for
> loading, error with retry, empty and not-found (BR13.3), and `Screen`'s back link on detail and form screens.

## New presentation primitives (`src/pres/`)

| Component | Props | Behaviour |
|-----------|-------|-----------|
| `RiskChip` | `level: 0..3`, `locale` | text label always (BR3.2); tone neutral / warning / warning / danger as a secondary cue; `data-risk` attribute for tests |
| `LowStockMark` | `locale` | the pill "কম মজুদ" / "Low stock" (BR7.2) |
| `SearchBox` | `value`, `onChange`, `placeholder`, `hint?` | debounced 300 ms; clears with ✕; `role="search"` |
| `PhoneText` | `phone`, `locale`, `call?` | stored digits shown in the locale's digits; `call` adds a `tel:` link (BR2.2, BR8.3) |

## Screens

| Route | Component | Loads | Writes | Notes |
|-------|-----------|-------|--------|-------|
| `/customers` | `CustomerList` | `customers.list({q, cursor})` | — | count tile from `total`, search with the 4-digit hint (BR5.2), rows with RiskChip and phone, "আরও দেখুন" for the next page; "+ নতুন" only with the customer-write set (BR1.2) |
| `/customers/new` | `CustomerForm` | — | `customers.create` | phone normalised on blur and shown back; risk radios; optional note; the duplicate warning shows on the detail after saving (BR3.3); route needs BR1.2's set |
| `/customers/:id/edit` | `CustomerForm` (edit) | `customers.get` | `customers.update` | same form without the note; sends only the changed fields (BR3.1); route needs BR1.2's set |
| `/customers/:id` | `CustomerDetail` | `customers.get`, `orders.list({customerId})` | `customers.addNote` | profile card (call link, নতুন অর্ডার → `/orders/new`), dues NotAvailable (BR5.5), notes with revise action and আগের নোট chain (BR4.4), order history with BasisPill (BR5.4) |
| `/products` | `ProductList` | `products.list({q, cursor})` | — | count tile from `total`; rows: name, SKU, variant count, total stock, low-count pill, price, cost for cost readers (BR6.8, BR9.2); "+ নতুন" only for Owner and Manager (BR1.3) |
| `/products/new` | `ProductForm` | `suppliers.list` | `products.create` | axes editor (third axis button disabled at 2), live variant preview with stock and minimum per row (BR6.4), SKU 409 under the field (BR6.2) |
| `/products/:id/edit` | `ProductForm` (edit) | `products.get`, `suppliers.list` | `products.update` | name, category, price, supplier only (BR6.7) |
| `/products/:id` | `ProductDetail` | `products.get` | `variants.setStock`, `products.setCost` | header with price, cost and supplier call link; variant table with stock and minimum inputs (Owner, Manager) and LowStockMark; "স্টক সংরক্ষণ" saves changed rows one by one and lists failures (W8); the Accountant gets only "ক্রয়মূল্য [বদলান]" (BR9.3) |
| `/low-stock` | `LowStock` | `catalog.lowStock` | — | rows with product link, stock / minimum, supplier call link or সরবরাহকারী দেওয়া নেই; its "বেছে নিন" link goes to the product's edit screen for Owner and Manager and to the product for others (BR7.4); positive empty state (BR7.5); truncated note |
| `/suppliers` | `Suppliers` | `suppliers.list` | `suppliers.create`, `suppliers.update` | list with call link and product count; the add form and each row's edit action only for Owner and Manager (BR1.3), the form opened when the list is empty |

## Empty states

| Where | Copy (bn / en) | Action |
|-------|----------------|--------|
| Customers, none | এখনো কোনো ক্রেতা নেই / No customers yet | প্রথম ক্রেতা যোগ করুন (hidden for the Accountant) |
| Customers, no match | এই নামে বা নম্বরে কেউ নেই / Nobody matches | খোঁজ মুছুন |
| Notes, none | এখনো কোনো নোট নেই / No notes yet | + নোট যোগ করুন (customer writers) |
| Order history, none | এখনো অর্ডার নেই — এই ক্রেতা যোগ হয়েছেন কিন্তু কিছু কেনেননি / No orders yet | — |
| Products, none | এখনো কোনো পণ্য নেই / No products yet | প্রথম পণ্য যোগ করুন (Owner, Manager) |
| Products, no match | এই নামে বা কোডে কোনো পণ্য নেই / No product matches | খোঁজ মুছুন |
| Low stock, none | সব ধরনের মজুদ ঠিক আছে / All stock is fine | — |
| Suppliers, none | এখনো কোনো সরবরাহকারী নেই / No suppliers yet | the add form, opened (Owner, Manager) |

## Form validation in the browser

The browser runs the same pure checks the server runs, imported from `src/catalog/rules/` (phone
normalisation, axis and variant checks), so most mistakes show before saving. The server stays the
authority: every 400 `fields` entry is mapped to its field's Bangla message.

## Routing and navigation

The router adds the ten routes with their capabilities (BR13.1) and the four navigation links for every role
(BR13.2). The role table in `tests/spec/role-table.ts` gains a row per route, so the client and server walks
cover them (AC5.1.4).
