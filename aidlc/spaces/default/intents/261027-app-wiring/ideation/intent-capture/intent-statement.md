# Intent Statement — App Wiring (B6)

## Problem Statement

The Owner has not yet defined the business problem in their own words [Q1].

The request as described: make the order screens built in B2 reachable in the running SmartBiz app [desc].
That means four things [desc]:
- a free, locally runnable server that owns the database connection and offers the order operations
  behind the existing role gate;
- a typed client layer that the screens call;
- real sign-in and sessions, replacing the hard-coded `owner@example.com`;
- the router mounted, so every existing screen renders.

The boundary is wider than the original request: it also takes in the B3 catalog, so orders can use
real customers and product variants [Q8][Q9].

## Target Customer

The Owner, for now [Q2]. Staff (Manager, Sales Staff, Accountant) come later and are not the target of
this piece of work [Q2].

## Success Metrics

- On this machine, the Owner signs in and opens the orders screen [Q3].
- The Owner creates an order and sees it in the list, and each role sees only what the role gate
  allows [Q3].
- Every existing foundation (U1) screen renders in the running app: settings, staff, audit trail [Q3].
- A scripted end-to-end check proves this in local CI, without a browser [Q3].
- Everything runs on this machine at zero spend, on a Docker Postgres, with no paid hosting or CI [desc].

## Initiative Trigger

Not identified by the Owner [Q4].

## Initial Scope Signal

| Signal | Value | Source |
|--------|-------|--------|
| Workflow-selected scope | `feature` (workflow-selected) | [scope] |
| User-confirmed product boundary | Wider than `feature`: app wiring plus the B3 catalog (customers, products, variants, suppliers, inventory) | [Q8][Q9] |
| Explicitly not included | B4 money and B5 operate stay in their own later Bolts | [Q9] |

## Assumptions & Open Questions

- [assumption] Problem statement: the Owner left it undefined [Q1]. The working framing is the request
  as described above [desc], and it should be confirmed or replaced.
- [assumption] Trigger: not identified [Q4]. Planning proceeds without a stated urgency or deadline.
