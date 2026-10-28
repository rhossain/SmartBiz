# SmartBiz BD

Order capture and money tracking for a small Bangladeshi online shop: a bun API server, a
React + Vite client and Postgres 18, all running on one machine at no cost. The walking
skeleton (intent `app-wiring`, Unit U1) wires sign-up, sign-in and the order screens to the
real API and database.

## Prerequisites

- **bun 1.4.3** (package manager, test runner and HTTP server).
- **Docker Desktop** running, with the image
  `postgres:18.6@sha256:4ef4dbc939d61acea57712655ddb4b4ab27419c913f94cca0cd57cb3ea3c2280`
  on the machine (nothing pulls a new image).
- **FileVault on.** The database volume and the `backups/` dumps hold the shop's orders and
  its 5-year audit trail; full-disk encryption is what protects them at rest on a laptop.

## First run

```bash
bun install
cp .env.example .env                  # DATABASE_URL for the smartbiz_app login
cp .env.migrate.example .env.migrate  # admin URL and both passwords; never loaded by the server
docker compose --env-file .env.migrate up -d   # the database, on 127.0.0.1 only
bun run start                         # build if needed → migrate → serve on http://127.0.0.1:3000
```

Open `http://127.0.0.1:3000`. With no business yet the app shows sign-up; the first person to
sign up is the Owner. `bun run start` rebuilds `dist/` whenever `dist/BUILD_SHA` differs from
`git rev-parse HEAD` or the tree has uncommitted changes, runs the migrations with the admin
URL, then serves, appending its JSON log lines to `logs/smartbiz-<date>.log`
(`bun run logs:summary` summarises them). Ctrl-C shuts down gracefully within 5 s.

The server listens on `127.0.0.1` only; reaching it from other devices is a separate, later
decision.

## Everyday commands

| Command | What it does |
|---------|--------------|
| `bun run test` | unit + integration suites (in-memory SQL stub that fails closed) |
| `bun run check:coverage` | 80 % line floor over every `src` file |
| `bun run gate` | the full local gate run — the merge evidence (see below) |
| `bun run smoke` | post-merge check of the running server (build SHA, health, sign-in, orders, staff list, products, low stock, sign-out) |
| `bun run seed:demo` | fill an EMPTY local deployment with demo data, catalog included (accounts in `.env.demo`) |
| `bun run seed:demo:catalog` | add the demo catalog to an EXISTING demo business (needs `.env.demo`; safe to run again) |
| `bun run migrate` | apply migrations with `.env.migrate` (idempotent) |
| `bun run logs:summary` | requests, statuses and p95 per route from today's log |
| `bun run reset-password <email>` | print a 30-minute password-reset link for any active user (see below) |

## Staff, invitations and lost passwords

No email is sent, ever. On **কর্মী** (`/staff`) the Owner invites a Manager, Sales Staff member
or Accountant, and a Manager invites Sales Staff or Accountants; the app shows the invitation
link **once** — copy it and hand it to the person yourself. It works for 7 days and only once;
inviting the same email again replaces it. The same screen creates a 30-minute reset link for
a staff member who forgot their password (never for the Owner, never for yourself; a Manager
only for Sales Staff and Accountants). A new reset link closes the person's older ones, and
completing a reset signs that person out everywhere.

Links point at `http://127.0.0.1:<PORT>`, so **they work on this computer only** until reaching
the server from other devices is decided.

The Owner's own way back in is the terminal on this machine:

```bash
bun run reset-password owner@example.com
```

It reads `DATABASE_URL` and `PORT` from `.env` (the app login, never the admin URL — it refuses
to run when `MIGRATE_DATABASE_URL` is set), prints exactly one line, the link, and exits 0. An
unknown or inactive email prints `no active account for that email` and exits 1 without writing
anything. `/recover` in the browser only tells people to ask the Owner or this terminal for a
link; it looks nothing up.

## The catalog (customers, products, stock, suppliers)

The navigation has **ক্রেতা** (customers), **পণ্য** (products), **কম মজুদ** (low stock) and
**সরবরাহকারী** (suppliers) for everyone. Who may change what:

| | Owner | Manager | Sales Staff | Accountant |
|---|---|---|---|---|
| read customers, products, low stock, suppliers | ✓ | ✓ | ✓ | ✓ |
| record and edit customers, add notes | ✓ | ✓ | ✓ | — |
| record and edit products, set stock, record suppliers | ✓ | ✓ | — | — |
| see and change a product's purchase cost | ✓ | ✓ | — | ✓ |

- **Phones** are stored as `01XXXXXXXXX` whatever is typed (Bangla digits, `+880`, spaces or
  dashes) and shown in Bangla digits. A phone another customer already has is saved with a
  warning that links to that customer — families share a number.
- **Notes** are never edited or deleted: "সংশোধন" adds a new note over the earlier one, which
  stays underneath as "আগের নোট". A note can be revised once.
- **Products** have a code (SKU) that is unique ignoring case and fixed after creation, and up
  to two variations (such as size and colour) of up to 12 values each; every combination is a
  variant with its own code, stock and minimum. A variant is low when its stock is **below** its
  minimum; **কম মজুদ** lists them with the supplier's call link.
- **Purchase cost** never reaches Sales Staff — the server leaves it out of every answer. A cost
  that was never recorded shows "দেওয়া হয়নি", never ৳০.
- **Payments and dues** on a customer say "এখনো চালু হয়নি" until that work is built. A
  customer's order history fills in once orders link to customers (the next unit, U5).
- Every catalog change is in the audit trail (**অডিট ট্রেইল**) without any name, phone, address
  or note text; nothing in the catalog is ever deleted.

To try the catalog on the demo business you already have, start the app and run
`bun run seed:demo:catalog`: it signs in with the accounts in `.env.demo`, adds four suppliers,
six products and six customers, and skips whatever is already there.

## The gate (before every merge to `main`)

```bash
bun run gate          # every merge
bun run gate --large  # every Bolt merge: the 10 000-order and 20 000-row audit benchmarks,
                      # and the browser check must say "browser: ok"
```

It needs Docker and ≥ 2 GiB free. It starts one throwaway `postgres:18.6` container with random
passwords, runs install, lint, type-check, format, tests, the timed role walks (step 5b),
coverage, the named invariant tests, build, bundle check, mutants, `bun audit` and the
dependency list, secret scan, `tests/realdb`, the wiring check, the real-browser check (step
14b) and the benchmark in that order, stops at the first failure, always removes the container
(Ctrl-C is passed on to the running step first), and prints one line for the squash commit
body. `.github/workflows/ci.yml` lists the same gates; hosted Actions stay disabled (zero
spend).

### The real-browser check (step 14b)

`bun scripts/browser-check.ts` drives the Google Chrome already installed on this machine,
headless, over the DevTools protocol (no extra dependency). It creates its own throwaway
database, starts the server on the built `dist/`, signs up a throwaway Owner, times 5 cold
loads of the first page (median ≤ 2 s) and opens every screen the Owner can reach at 360 px
wide, failing if any of them scrolls sideways. Chrome is found at `CHROME_PATH`, by default
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; set it in your shell (see
`.env.example`) if Chrome lives elsewhere. When no Chrome exists there, the gate line says
`browser: not run (no Chrome)` — never a pass — and `bun run gate --large`, the Bolt merge run,
fails on it.

## Backup and restore

```bash
mkdir -p backups
docker compose --env-file .env.migrate exec -T smartbiz-db \
  pg_dump -U postgres -Fc smartbiz > backups/smartbiz-$(date +%Y%m%d-%H%M).dump
pg_restore --list backups/<file>.dump > /dev/null && echo "dump ok"    # verify it
ls -t backups/*.dump | tail -n +11 | xargs rm -f                       # keep the 10 newest
```

Take and verify a dump before every merge that adds a migration; never delete the pre-merge
dump of the current Bolt.

Restore (stop the server first):

```bash
docker compose --env-file .env.migrate exec -T smartbiz-db dropdb -U postgres smartbiz
docker compose --env-file .env.migrate exec -T smartbiz-db createdb -U postgres -O postgres smartbiz
docker compose --env-file .env.migrate exec -T smartbiz-db pg_restore -U postgres -d smartbiz < backups/<pre-merge>.dump
```

Migration 0017's two unique indexes stay after a code revert; older code does not mind them.
If they must ever be dropped, drop them and delete their ledger row in the same admin session,
so a later `bun run migrate` creates them again (U3 I-01):

```bash
docker compose --env-file .env.migrate exec -T smartbiz-db psql -U postgres -d smartbiz -c \
  "DROP INDEX IF EXISTS invitations_accept_token_hash_idx, password_resets_token_hash_idx; DELETE FROM _migrations WHERE id = '0017_unique_token_hashes.sql';"
```

## Merging Bolt 1 (`app-wiring`: U1, U2, U3)

1. Take and verify the `pg_dump` of the live database (Backup and restore, above).
2. `bun run gate --large` — green, with `browser: ok` in the result line.
3. Squash-merge `app-wiring` into `main`, with the gate's result line in the commit body.
4. `bun run migrate` — applies 0011–0017 to the live database.
5. `bun run start`, then `bun run smoke` (it now also checks the staff list).

## Rollback

- **Code defect, schema fine:** `git revert <squash commit>` on `main`, push, `bun run start`
  (it rebuilds because `BUILD_SHA` no longer matches HEAD), then `bun run smoke`.
- **A migration broke the live database:** restore the pre-merge dump (above), check out the
  previous `main` commit, `bun run start`.
- **The whole of Bolt 1:** stop the server, restore the pre-merge dump, `git revert` the squash
  commit, `bun run start`. A code revert alone leaves migrations 0011–0017 applied; they are
  additive or guarded, and older code works with them.
- **The catalog (Bolt 2, migrations 0018–0022):** the five catalog tables are additive and older
  code never reads them, so `git revert` of the squash commit runs fine with them still
  applied. **But** once anyone has changed the catalog, the audit trail holds the nine catalog
  actions (`customer.create`, `product.cost.set`, …), and older code has no label for them: the
  audit trail would show their raw names. The clean rollback of Bolt 2 is therefore the
  pre-merge dump: stop the server, restore the dump, `git revert`, `bun run start`. Dropping
  the tables by hand is not part of a rollback (their ledger rows would have to go in the same
  admin session).
- **A leaked invitation or reset link:** invite the same email again (the old link stops
  working), or create a new reset link for the person (it closes the old one); otherwise a reset
  link dies after 30 minutes.
- Migration 0012 replaces the session store: everyone signs in again once. That is expected.

## Layout

```
src/
  server/   bun HTTP entry, request pipeline, route table, handlers, cookies, headers
  client/   browser HTTP client, auth, orders, staff, audit and catalog APIs, stores
  auth/     sign-up, sign-in, sign-out, sessions, attempt limiter, hash gate, role gate,
            invitations, reset links, one-time tokens, delegation matrix
  orders/   order domain functions, paste parser, status machine, order screens
  catalog/  customers and notes, suppliers, products and variants, stock and cost, low stock,
            the read functions orders use (index.ts), shared rules, catalog screens
  router/   the App, typed route map, hash router, three-layer gate dispatch
  pres/     Shell and presentation primitives
  db/       pool, migrations, declared grants
  data/ i18n/ money/ observability/ audit/
scripts/    gate, build, start, smoke, mutants, coverage, bundle, secret scan, log summary
tests/      unit/ integration/ realdb/ e2e/ perf/
```

Trunk is `main`; each Bolt is one short-lived branch named by its slug, squash-merged after a
green gate run.
