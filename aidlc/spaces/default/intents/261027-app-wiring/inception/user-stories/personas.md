# Personas — App Wiring (B6)

Priority ranking: 1. Owner (primary), 2. Sales Staff, 3. Manager, 4. Accountant. For now only the Owner
is a real user; the other three are exercised by tests and are the target of the role-gate stories
(intent Q2; stories Q1).

| Persona | Role | Goals | Pain points today | Context | Capabilities that matter here |
|---------|------|-------|-------------------|---------|-------------------------------|
| **Rahima, the Owner** | `owner` | Sign in and run the shop from one app; set up the catalog; take and track orders; invite staff later | Nothing is usable: no server, no real sign-in, screens not mounted | Runs the SME; Bangla-first; one laptop at the shop | All, including `business.edit`, `staff.invite`, `money.mutate.*`, `audit.view` |
| **Karim, Sales Staff** | `sales_staff` | Record customers and take orders quickly from Messenger messages | Cannot reach the order screens; no real customer list | Phone or shop laptop; busy, interrupted work | `business.view`, `money.mutate.price` |
| **Nadia, the Manager** | `manager` | Keep products, prices and stock right; handle orders when the Owner is away | No catalog to manage | Runs day-to-day operations | `business.view`, `staff.invite`, `audit.view`, `money.mutate.full` |
| **Tanvir, the Accountant** | `accountant` | Check orders and purchase costs without changing sales | No way to view anything | Part-time, read-mostly | `business.view`, `audit.view`, `money.mutate.cost` |

## Relationships

- The Owner invites the others (FR2.6).
- Sales Staff create customers and orders, and the Manager maintains products and stock that those orders
  reference.
- The Accountant reads everything their role allows and edits only purchase cost (stories Q2).
