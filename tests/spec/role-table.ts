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
 *   - C5 public_routes (U1's five) and AC5.1.4's public screens.
 * Paths use `:name` on both sides (C5's `{userId}` is written `:userId`). U3 and U4 append
 * their rows here.
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

/** The order number of the recorded order fixture; the detail screen's heading. */
export const FIXTURE_ORDER_NO = "ORD-1001";

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
];

/** C5 `link_allow_list`: the only responses that may carry a raw token in `link`. Empty in U2. */
export const LINK_ALLOW_LIST: ReadonlyArray<string> = [];

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
  screen("/accept-invite", "public", "আমন্ত্রণ গ্রহণ", "AC5.1.4 (not available until U3)"),
  screen("/reset", "public", "নতুন পাসওয়ার্ড", "AC5.1.4 (not available until U3)"),
  screen("/recover", "public", "পাসওয়ার্ড পুনরুদ্ধার", "AC5.1.4 (not available until U3)"),
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
  screen("/daily-card", EVERY, "দৈনিক কার্ড", "US1.7 (F-07); not available until B5", {
    nav: true,
  }),
  screen("/audit-trail", AUDIT_READERS, "অডিট ট্রেইল", "US5.1 audit trail", { nav: true }),
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
