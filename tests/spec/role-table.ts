/**
 * tests/spec/role-table.ts — the role table, written out inline (contract C5; BR3.1; S11;
 * AC5.1.1; review F-07, D-02, D-04).
 *
 * One row per API route of the server route table and one row per screen route of the
 * client route map, each naming the roles allowed or `public`. The server walk
 * (tests/integration/server-gate-absence.test.ts), the client walk
 * (tests/unit/three-layer-gate-absence.test.ts), the no-secret walk and the real-browser
 * check (scripts/browser-check.ts) all read it, and each first compares it with the
 * registered table in both directions, so a route added without a row fails (BR3.2).
 *
 * It RESTATES the stories; it never imports `src/auth`, so the code is never tested against
 * itself (BR3.1). Sources:
 *   - US5.1's table: read orders → every role; create, edit, move orders and link
 *     consignments → Owner, Manager, Sales Staff; view the audit trail → Owner, Manager,
 *     Accountant; edit business settings → Owner;
 *   - US1.3: `GET /api/session` → any signed-in role;
 *   - US1.7 (F-07): every role that can sign in may open its own settings; the daily card is
 *     the business view, so every role;
 *   - C5 public_routes (U1's five) and AC5.1.4's public screens;
 *   - U3 (BR10.1, Q12; C6): the staff list, invitations and reset links → Owner and Manager
 *     (AC1.5.6: Sales Staff and Accountants are refused); accepting an invitation, browser
 *     recovery and the reset → public (C5 public_routes); the `/staff` screen → Owner and
 *     Manager, with the navigation label "কর্মী"; the `link` allow-list is the two staff POST
 *     routes (C5 link_allow_list).
 *   - U4 (C7; US5.1; BR1.1–BR1.4, BR13.1, BR13.2): every catalog read and screen → every
 *     role; customers and notes → Owner, Manager, Sales Staff; products, stock and suppliers
 *     → Owner and Manager; purchase cost → Owner, Manager, Accountant; the navigation gains
 *     ক্রেতা, পণ্য, কম মজুদ and সরবরাহকারী for every role.
 * Paths use `:name` on both sides (C5's `{userId}` is written `:userId`).
 *
 * Screen rows also carry what the walks assert: `feature` (the Bangla name the lock and
 * not-available screens show), `heading` (the Bangla text of the screen's heading element
 * on a deployment whose business exists; `landsOn` when the route only redirects), and
 * `nav` (the route has a navigation link). The app's default language is Bangla (NFR9.5).
 */
export type Role = "owner" | "manager" | "sales_staff" | "accountant";
export type Allowed = ReadonlyArray<Role> | "public";
export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

export const ROLES: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];

export interface ApiRow {
  readonly surface: "api";
  readonly method: ApiMethod;
  readonly path: string;
  readonly allowed: Allowed;
  readonly source: string;
}

export interface ScreenRow {
  readonly surface: "screen";
  readonly path: string;
  readonly allowed: Allowed;
  /** The feature's name in Bangla, as the lock and not-available screens show it. */
  readonly feature: string;
  /** The heading text (Bangla) once the route has rendered. */
  readonly heading: string;
  /** The element holding the heading: every screen uses `screen-title`; `/lock` its own. */
  readonly headingTestId: "screen-title" | "lock-title";
  /** A public route that only redirects: where a person with no session lands. */
  readonly landsOn?: string;
  /** True when the Shell offers a navigation link to this route. */
  readonly nav: boolean;
  readonly source: string;
}

export type RoleTableRow = ApiRow | ScreenRow;

const EVERY: ReadonlyArray<Role> = ["owner", "manager", "sales_staff", "accountant"];
const ORDER_WRITERS: ReadonlyArray<Role> = ["owner", "manager", "sales_staff"];
const AUDIT_READERS: ReadonlyArray<Role> = ["owner", "manager", "accountant"];
const BUSINESS_EDITORS: ReadonlyArray<Role> = ["owner"];
/** U3 (AC1.5.1, AC1.5.6, AC1.6.4; Q12): who manages staff. */
const STAFF_MANAGERS: ReadonlyArray<Role> = ["owner", "manager"];
/** U4 (US5.1 rows; US3.1, AC3.1.5): who records customers and their notes. */
const CUSTOMER_WRITERS: ReadonlyArray<Role> = ["owner", "manager", "sales_staff"];
/** U4 (US5.1; AC3.4.4, AC3.5.1, US3.6): who records products, stock and suppliers. */
const CATALOG_MANAGERS: ReadonlyArray<Role> = ["owner", "manager"];
/** U4 (US3.7; AC3.7.1, AC3.7.3): who changes a product's purchase cost. */
const COST_WRITERS: ReadonlyArray<Role> = ["owner", "manager", "accountant"];

/** The order number of the recorded order fixture; the detail screen's heading. */
export const FIXTURE_ORDER_NO = "ORD-1001";
/** U4: the recorded customer's and product's names; their detail screens' headings. */
export const FIXTURE_CUSTOMER_NAME = "রিনা আক্তার";
export const FIXTURE_PRODUCT_NAME = "সুতির কুর্তি";

export const API_ROWS: ReadonlyArray<ApiRow> = [
  { surface: "api", method: "GET", path: "/api/health", allowed: "public", source: "C5" },
  { surface: "api", method: "GET", path: "/api/setup", allowed: "public", source: "C5" },
  { surface: "api", method: "POST", path: "/api/auth/sign-up", allowed: "public", source: "C5" },
  { surface: "api", method: "POST", path: "/api/auth/sign-in", allowed: "public", source: "C5" },
  { surface: "api", method: "POST", path: "/api/auth/sign-out", allowed: "public", source: "C5" },
  { surface: "api", method: "GET", path: "/api/session", allowed: EVERY, source: "US1.3" },
  { surface: "api", method: "GET", path: "/api/orders", allowed: EVERY, source: "US5.1 read" },
  {
    surface: "api",
    method: "POST",
    path: "/api/orders",
    allowed: ORDER_WRITERS,
    source: "US5.1 create",
  },
  { surface: "api", method: "GET", path: "/api/orders/:id", allowed: EVERY, source: "US5.1 read" },
  {
    surface: "api",
    method: "PATCH",
    path: "/api/orders/:id",
    allowed: ORDER_WRITERS,
    source: "US5.1 edit",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/orders/:id/status",
    allowed: ORDER_WRITERS,
    source: "US5.1 move (US2.1a)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/orders/:id/consignment",
    allowed: ORDER_WRITERS,
    source: "US5.1 link consignments (US2.1a)",
  },
  {
    surface: "api",
    method: "GET",
    path: "/api/audit",
    allowed: AUDIT_READERS,
    source: "US5.1 audit trail (C4)",
  },
  {
    surface: "api",
    method: "GET",
    path: "/api/staff",
    allowed: STAFF_MANAGERS,
    source: "US1.5 staff list (C6, AC1.5.6)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/staff/invitations",
    allowed: STAFF_MANAGERS,
    source: "US1.5 invite (C6, AC1.5.1, AC1.5.6)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/staff/:userId/reset-links",
    allowed: STAFF_MANAGERS,
    source: "US1.6 staff reset link (C6, AC1.6.4)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/invitations/accept",
    allowed: "public",
    source: "C5 public_routes (US1.5 accept)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/auth/recover",
    allowed: "public",
    source: "C5 public_routes (US1.6 recover)",
  },
  {
    surface: "api",
    method: "POST",
    path: "/api/auth/reset",
    allowed: "public",
    source: "C5 public_routes (US1.6 reset)",
  },
  // U4 (C7; US5.1; BR1.1–BR1.4): everyone reads the catalog; customers and notes are written
  // by the order writers; products, stock and suppliers by Owner and Manager; cost by Owner,
  // Manager and the Accountant.
  ...(
    [
      ["GET", "/api/customers", EVERY, "US3.3 find customers"],
      ["POST", "/api/customers", CUSTOMER_WRITERS, "US3.1 record a customer (AC3.1.5)"],
      ["GET", "/api/customers/:id", EVERY, "US3.3 open a customer"],
      ["PATCH", "/api/customers/:id", CUSTOMER_WRITERS, "US3.1 edit a customer (D10)"],
      ["POST", "/api/customers/:id/notes", CUSTOMER_WRITERS, "US3.2 notes"],
      ["GET", "/api/products", EVERY, "US3.4 products list"],
      ["POST", "/api/products", CATALOG_MANAGERS, "US3.4 record a product (AC3.4.4)"],
      ["GET", "/api/products/:id", EVERY, "US3.4 open a product"],
      ["PATCH", "/api/products/:id", CATALOG_MANAGERS, "US3.4 edit a product (D5)"],
      ["PATCH", "/api/products/:id/cost", COST_WRITERS, "US3.7 purchase cost (AC3.7.1, AC3.7.3)"],
      ["PATCH", "/api/variants/:id/stock", CATALOG_MANAGERS, "US3.5 set stock (AC3.5.1)"],
      ["GET", "/api/low-stock", EVERY, "US3.5 low stock (AC3.5.3)"],
      // U5 (C7 amendment E3; NFR1.17): the paste screen's match index is a catalog read.
      ["GET", "/api/catalog/match-index", EVERY, "US4.2 paste matching (AC4.2.1)"],
      ["GET", "/api/suppliers", EVERY, "US3.6 suppliers"],
      ["POST", "/api/suppliers", CATALOG_MANAGERS, "US3.6 record a supplier (AC3.6.1)"],
      ["PATCH", "/api/suppliers/:id", CATALOG_MANAGERS, "US3.6 edit a supplier"],
    ] as const
  ).map(([method, path, allowed, source]): ApiRow => ({
    surface: "api",
    method,
    path,
    allowed,
    source,
  })),
];

/**
 * C5 `link_allow_list`: the only responses that may carry a raw token, in field `link` — the
 * two staff routes that create an invitation or a reset link, each returning it once (U3).
 */
export const LINK_ALLOW_LIST: ReadonlyArray<string> = [
  "POST /api/staff/invitations",
  "POST /api/staff/:userId/reset-links",
];

const screen = (
  path: string,
  allowed: Allowed,
  feature: string,
  source: string,
  extra: Partial<Pick<ScreenRow, "heading" | "headingTestId" | "landsOn" | "nav">> = {},
): ScreenRow => ({
  surface: "screen",
  path,
  allowed,
  feature,
  heading: extra.heading ?? feature,
  headingTestId: extra.headingTestId ?? "screen-title",
  nav: extra.nav ?? false,
  source,
  ...(extra.landsOn !== undefined ? { landsOn: extra.landsOn } : {}),
});

export const SCREEN_ROWS: ReadonlyArray<ScreenRow> = [
  // `/` only redirects (F-02): signed out it opens sign-in (the business exists).
  screen("/", "public", "হোম", "F-02", { heading: "সাইন ইন", landsOn: "/sign-in" }),
  screen("/sign-in", "public", "সাইন ইন", "AC5.1.4"),
  // Once the business exists, sign-up sends a signed-out person on to sign-in (U1 W3).
  screen("/sign-up", "public", "সাইন আপ", "AC5.1.4", {
    heading: "সাইন ইন",
    landsOn: "/sign-in",
  }),
  screen("/accept-invite", "public", "আমন্ত্রণ গ্রহণ", "AC5.1.4, US1.5 accept (U3)"),
  screen("/reset", "public", "নতুন পাসওয়ার্ড", "AC5.1.4, US1.6 reset (U3)"),
  screen("/recover", "public", "পাসওয়ার্ড পুনরুদ্ধার", "AC5.1.4, US1.6 recover (U3)"),
  screen("/lock", "public", "অ্যাক্সেস সীমাবদ্ধ", "BR4.1", { headingTestId: "lock-title" }),
  screen("/not-found", "public", "পাওয়া যায়নি", "AC1.7.2"),
  screen("/orders", EVERY, "অর্ডার", "US5.1 read", { nav: true }),
  screen("/orders/:id", EVERY, "অর্ডার", "US5.1 read", { heading: FIXTURE_ORDER_NO }),
  screen("/orders/new", ORDER_WRITERS, "নতুন অর্ডার", "US5.1 create"),
  screen("/orders/new/paste-parse", ORDER_WRITERS, "মেসেজ থেকে অর্ডার", "US5.1 create"),
  screen("/orders/new/repeat", ORDER_WRITERS, "আগের অর্ডার আবার", "US5.1 create"),
  screen("/orders/:id/transition", ORDER_WRITERS, "অর্ডারের অবস্থা বদল", "US5.1 move", {
    heading: FIXTURE_ORDER_NO,
  }),
  // U4 (BR13.1, BR13.2; Q14; AC5.1.4): the catalog screens. Every role reads; the customer
  // new/edit screens are the customer writers', the product new/edit screens Owner and
  // Manager's. A detail screen's heading is the recorded record's name (tests/spec/fixtures.ts).
  screen("/customers", EVERY, "ক্রেতা", "US3.3 customers", { nav: true }),
  screen("/customers/new", CUSTOMER_WRITERS, "নতুন ক্রেতা", "US3.1 record a customer (AC3.1.5)"),
  screen("/customers/:id", EVERY, "ক্রেতা", "US3.3 a customer", { heading: FIXTURE_CUSTOMER_NAME }),
  screen("/customers/:id/edit", CUSTOMER_WRITERS, "ক্রেতা সম্পাদনা", "US3.1 edit a customer"),
  screen("/products", EVERY, "পণ্য", "US3.4 products", { nav: true }),
  screen("/products/new", CATALOG_MANAGERS, "নতুন পণ্য", "US3.4 record a product (AC3.4.4)"),
  screen("/products/:id", EVERY, "পণ্য", "US3.4 a product (US3.7 cost)", {
    heading: FIXTURE_PRODUCT_NAME,
  }),
  screen("/products/:id/edit", CATALOG_MANAGERS, "পণ্য সম্পাদনা", "US3.4 edit a product"),
  screen("/low-stock", EVERY, "কম মজুদ", "US3.5 low stock (AC3.5.3)", { nav: true }),
  screen("/suppliers", EVERY, "সরবরাহকারী", "US3.6 suppliers", { nav: true }),
  screen(
    "/daily-card",
    BUSINESS_EDITORS,
    "দৈনিক কার্ড",
    "US3.1 daily card: Owner only (mockups §17.1)",
    {
      nav: true,
    },
  ),
  screen("/audit-trail", AUDIT_READERS, "অডিট ট্রেইল", "US5.1 audit trail", { nav: true }),
  screen("/staff", STAFF_MANAGERS, "কর্মী", "US1.5, US1.6 staff screen (AC1.5.6, Q12)", {
    nav: true,
  }),
  screen("/business", BUSINESS_EDITORS, "ব্যবসা", "US5.1 business settings", { nav: true }),
  screen("/settings", EVERY, "সেটিংস", "US1.7 (F-07): own settings", { nav: true }),
];

export const ROLE_TABLE: ReadonlyArray<RoleTableRow> = [...API_ROWS, ...SCREEN_ROWS];

export const apiKey = (row: Pick<ApiRow, "method" | "path">): string => `${row.method} ${row.path}`;

export const isAllowed = (allowed: Allowed, role: Role): boolean =>
  allowed === "public" || allowed.includes(role);

/** Missing and extra entries between a registered table and the rows, both ways (BR3.2). */
export const diffKeys = (
  registered: ReadonlyArray<string>,
  rows: ReadonlyArray<string>,
): {
  readonly missingRow: ReadonlyArray<string>;
  readonly notRegistered: ReadonlyArray<string>;
} => ({
  missingRow: registered.filter((k) => !rows.includes(k)).sort(),
  notRegistered: rows.filter((k) => !registered.includes(k)).sort(),
});

/** Prints one walk's count line (O12): `walk <name>: <rows> rows × <roles> roles = <checks> checks in <ms> ms`. */
export const reportWalk = (
  name: string,
  rows: number,
  roles: number,
  checks: number,
  ms: number,
): void => {
  process.stdout.write(
    `walk ${name}: ${rows} rows × ${roles} roles = ${checks} checks in ${Math.round(ms)} ms\n`,
  );
};
