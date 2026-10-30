# Screenshots — App Wiring, redesign as built (2026-10-30)

Real screenshots of the running app after the premium redesign: the visual companion to
`../mockups.md` §18 (redesign), which supersedes the look recorded in §16 and §17. The 2026-10-28
set (ink top bar, single-column phone tables) is replaced; it stays in git history.

- **Data:** a throwaway database seeded through the app's own API with the demo catalog
  (`seedDemoCatalog` from `scripts/seed-demo.ts`) and ten orders across every status. The business
  is রহিম ফ্যাশন হাউস; the signed-in Owner is the throwaway browser-check account
  (`owner@browser.test`), so no demo password is involved.
- **Capture:** headless Google Chrome over the DevTools protocol, at 2× pixel density, with
  reduced motion; the viewport is grown to the page height so the fixed sidebar and the phone tab
  bar are drawn where a person sees them.
- **Desktop:** 1440 px wide. **Phone:** 390 px wide. Bangla (`-bn`).
- Every capture was checked for sideways scroll: `scrollWidth` equals the window width on all 38.
- Very long pages (audit trail, full orders list on a phone) are cut at 4 000 px.

| # | Screen | Route | Mockup | Desktop | Phone |
|---|--------|-------|--------|---------|-------|
| 00 | Sign-in (signed out) | `/sign-in` | §18.2 | [bn](desktop/00-sign-in-bn.png) | [bn](phone/00-sign-in-bn.png) |
| 01 | Orders list | `/orders` | §18.3 | [bn](desktop/01-orders-list-bn.png) | [bn](phone/01-orders-list-bn.png) |
| 02 | Order detail | `/orders/:id` | §18.4 | [bn](desktop/02-order-detail-bn.png) | [bn](phone/02-order-detail-bn.png) |
| 03 | New order | `/orders/new` | §16.4, §18.6 | [bn](desktop/03-new-order-bn.png) | [bn](phone/03-new-order-bn.png) |
| 04 | Order from a message (after "পড়ুন") | `/orders/new/paste-parse` | §16.5, §18.6 | [bn](desktop/04-order-from-message-bn.png) | [bn](phone/04-order-from-message-bn.png) |
| 05 | Repeat a past order | `/orders/new/repeat` | §16.7 | [bn](desktop/05-repeat-order-bn.png) | [bn](phone/05-repeat-order-bn.png) |
| 06 | Daily card | `/daily-card` | §18.5 | [bn](desktop/06-daily-card-bn.png) | [bn](phone/06-daily-card-bn.png) |
| 07 | Staff and invitations | `/staff` | §5, §18.3 | [bn](desktop/07-staff-bn.png) | [bn](phone/07-staff-bn.png) |
| 08 | Audit trail | `/audit-trail` | §18.3 | [bn](desktop/08-audit-trail-bn.png) | [bn](phone/08-audit-trail-bn.png) |
| 09 | Customers | `/customers` | §6, §18.3 | [bn](desktop/09-customers-bn.png) | [bn](phone/09-customers-bn.png) |
| 10 | Customer detail | `/customers/:id` | §8 | [bn](desktop/10-customer-detail-bn.png) | [bn](phone/10-customer-detail-bn.png) |
| 11 | Products | `/products` | §9, §18.3 | [bn](desktop/11-products-bn.png) | [bn](phone/11-products-bn.png) |
| 12 | Product detail (photo, variants) | `/products/:id` | §11, §18.7 | [bn](desktop/12-product-detail-bn.png) | [bn](phone/12-product-detail-bn.png) |
| 13 | Low stock | `/low-stock` | §12, §18.3 | [bn](desktop/13-low-stock-bn.png) | [bn](phone/13-low-stock-bn.png) |
| 14 | Suppliers | `/suppliers` | §12, §18.3 | [bn](desktop/14-suppliers-bn.png) | [bn](phone/14-suppliers-bn.png) |
| 15 | Insights (Owner) | `/insights` | §18.7 | [bn](desktop/15-insights-bn.png) | [bn](phone/15-insights-bn.png) |
| 16 | Business | `/business` | §17.2, §18.7 | [bn](desktop/16-business-bn.png) | [bn](phone/16-business-bn.png) |
| 17 | Settings | `/settings` | §17.3, §18.7 | [bn](desktop/17-settings-bn.png) | [bn](phone/17-settings-bn.png) |
| 18 | Invoice and delivery slip | `/orders/:id/print` | §18.7 | [bn](desktop/18-invoice-and-slip-bn.png) | [bn](phone/18-invoice-and-slip-bn.png) |
| 19 | Phone menu drawer | any (menu open) | §18.1 | — | [bn](phone/19-menu-drawer-bn.png) |

Not in this set: the staff-role views (shorter menu, locked daily card). Their behaviour is
unchanged by the redesign (§15, §18.1 tab-bar table); only the look follows §18.

To refresh after a UI change: build the client, start a throwaway server on a migrated empty
database, seed it through the API as above, and re-run the capture. Never capture against the live
demo database with the `.env.demo` accounts.
