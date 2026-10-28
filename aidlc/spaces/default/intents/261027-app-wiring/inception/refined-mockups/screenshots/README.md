# Screenshots — App Wiring, as built (2026-10-28)

Real screenshots of the running app, the visual companion to `../mockups.md` §16 (visual refresh)
and §17.1 (Daily card). They show the demo business (রহিম ফ্যাশন হাউস) seeded by
`bun run seed:demo`, plus a few quick-add test orders made on 28 October.

- **Capture:** headless Google Chrome over the DevTools protocol against `http://127.0.0.1:3000`,
  full page, at 2× pixel density, with reduced motion so nothing is caught mid-animation.
- **Desktop:** 1440 px wide, Bangla (`-bn`) and English (`-en`).
- **Phone:** 390 px wide, Bangla.
- **Very long pages** (the full orders list on a phone) are cut at 6 000 px.

Business, Settings (§17.2, §17.3) are designed but not built, so they have no screenshots yet.

| # | Screen | Route | Signed in as | Mockup | Desktop | Phone |
|---|--------|-------|--------------|--------|---------|-------|
| 00 | Sign-in | `/sign-in` | — | §2, §16.6 | [bn](desktop/00-sign-in-bn.png) | [bn](phone/00-sign-in-bn.png) |
| 01 | Orders list | `/orders` | Owner | §16.2 | [bn](desktop/01-orders-list-bn.png) · [en](desktop/01-orders-list-en.png) | [bn](phone/01-orders-list-bn.png) |
| 02 | Order detail | `/orders/:id` | Owner | §16.3 | [bn](desktop/02-order-detail-bn.png) · [en](desktop/02-order-detail-en.png) | [bn](phone/02-order-detail-bn.png) |
| 03 | New order | `/orders/new` | Owner | §16.4 | [bn](desktop/03-new-order-bn.png) · [en](desktop/03-new-order-en.png) | [bn](phone/03-new-order-bn.png) |
| 04 | Order from a message (after "পড়ুন") | `/orders/new/paste-parse` | Owner | §16.5 | [bn](desktop/04-order-from-message-bn.png) · [en](desktop/04-order-from-message-en.png) | [bn](phone/04-order-from-message-bn.png) |
| 05 | Repeat a past order | `/orders/new/repeat` | Owner | §16.7 | [bn](desktop/05-repeat-order-bn.png) · [en](desktop/05-repeat-order-en.png) | [bn](phone/05-repeat-order-bn.png) |
| 06 | Daily card | `/daily-card` | Owner | §17.1 | [bn](desktop/06-daily-card-bn.png) · [en](desktop/06-daily-card-en.png) | [bn](phone/06-daily-card-bn.png) |
| 07 | Staff and invitations | `/staff` | Owner | §5, §16.7 | [bn](desktop/07-staff-bn.png) · [en](desktop/07-staff-en.png) | [bn](phone/07-staff-bn.png) |
| 08 | Audit trail | `/audit-trail` | Owner | §16.2 table style | [bn](desktop/08-audit-trail-bn.png) · [en](desktop/08-audit-trail-en.png) | [bn](phone/08-audit-trail-bn.png) |
| 20 | Orders list, shorter menu | `/orders` | Sales staff | §15 | [bn](desktop/20-sales-staff-orders-bn.png) | [bn](phone/20-sales-staff-orders-bn.png) |
| 21 | Daily card locked for a non-Owner | `/daily-card` | Sales staff | §14 (403), §17.1 | [bn](desktop/21-sales-staff-daily-card-locked-bn.png) | [bn](phone/21-sales-staff-daily-card-locked-bn.png) |

To refresh after a UI change: start the app, make sure the demo data is loaded, then re-run the
capture (it signs in with the accounts in `.env.demo` and overwrites these files).
