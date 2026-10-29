# Frontend Components — u5-orders-catalog

> Changes to the existing order screens (`src/orders/screens/`) and one new shared picker. Screens keep the
> ESLint boundary: they receive catalog search and match-index loaders as props from the router.

| Component | Where | Change |
|-----------|-------|--------|
| `CatalogPicker` (new, `src/pres/`) | shared | a search box with a result list; props: `search(q)`, `renderItem`, `onPick`, `placeholder`; keyboard: arrows and Enter; `data-testid` on input and each result |
| `ManualOrder` | `/orders/new` | customer picker above the contact fields (BR4.1); a product-variant picker per line (BR4.2); a linked line shows the label with "বদলান" and "সরান"; a 404 from save shows under the field it concerns |
| `RepeatFromPast` | `/orders/new/repeat` | carries the past order's ids (BR4.3) |
| `PasteParse` | `/orders/new/paste-parse` | loads the match index once (and shows the truncated notice when set); each parsed item shows its linked product and variant, or "পণ্য বেছে নিন" / "ধরন বেছে নিন" when unlinked (BR5.2, BR5.3); the phone suggestion banner (BR6.1) |
| `OrdersList` | `/orders` | unchanged code; it shows the catalog names the list now returns (BR3.1) |
| `OrderDetail` | `/orders/:id` | shows the detail's new `customerName` and per-item `label` (E5) instead of the contact name and description |
| `CustomerDetail` | `/customers/:id` | unchanged code; its history now lists linked orders (BR3.2) |

Copy (bn / en): "ক্রেতা বেছে নিন / Choose a customer", "পণ্য বেছে নিন / Choose a product", "ধরন বেছে নিন / Choose a
variant", "এই নম্বরের ক্রেতা: <name> / Customer with this number: <name>", "সরান / Unlink", "নতুন ক্রেতা হিসেবে যোগ
করুন / Add as a new customer".
