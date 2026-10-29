/**
 * src/router/App.tsx — the app: session, routing and the order screens on the real API
 * (W3, W4, W7, W9; US1.2, US1.3, US1.4, US2.1b; BR8.1–BR8.6).
 *
 * On load it asks `GET /api/session`. Signed in → the Shell shows the email and role (BR8.6)
 * and `/`, `/sign-in` and `/sign-up` go on to the orders list. Not signed in → it asks
 * `GET /api/setup`: no business yet → `#/sign-up`, otherwise `#/sign-in`, remembering the
 * gated route the person was opening (W3, W9). A server that cannot be reached at load shows
 * the banner with retry instead of a screen.
 *
 * Every navigation runs the three-layer gate (`dispatchPath`): a missing session goes to
 * sign-in, a role without the capability to the lock screen, an unknown hash to not-found.
 * The client gate is advisory — the server checks every call (NFR1.1) — so the API's own
 * answers are routed too: any 401 runs W9 through the HTTP client's hook, a 403 opens the
 * lock screen, and 503 / unreachable show the banner with retry; nothing is resent by itself
 * (BR8.4).
 *
 * Orders (W7, BR8.3, BR8.5): entering the list loads the first page; "load more" appends; a
 * created order is placed at the top of the loaded page and the list opens with "সংরক্ষণ
 * হয়েছে" — no reload. A refused order keeps the draft and every typed value; the field paths
 * go to the screen (BR8.2). Sign-out posts to the API, then clears every in-memory store and
 * opens sign-in, whatever the answer, because the server clears the cookie even when the
 * database is down (S3).
 *
 * U2 (S12; BR2.1, BR4.1, BR6.2; review F-01, F-05):
 *   - App builds the navigation: `NAV_ITEMS` lists `{ to, label }` only, and each item's
 *     access is looked up in the screen route map, so a link is shown exactly when its route
 *     would open for the role; the Shell receives the filtered list as a prop;
 *   - a role sent to the lock screen sees the name of the feature it tried to open and a link
 *     to the first screen it can open (its first navigation item);
 *   - the save toast "সংরক্ষণ হয়েছে" is hosted by the Shell, so it outlives the move to the
 *     list that follows a save;
 *   - `/audit-trail` gets the audit client (`deps.audit`, built over the same HTTP client
 *     when a caller does not pass one).
 *
 * U3 (BR9.1–BR9.5, BR10.1; review D-02):
 *   - the navigation gains "কর্মী" (`/staff`), shown exactly to the roles its route opens for
 *     (Owner, Manager), like every other item;
 *   - App builds the staff client (`deps.staff`, over the same HTTP client when not given) and
 *     passes it to the `/staff` container and to the three token containers, with what they
 *     cannot do themselves: after an accepted invitation, load the session the new cookie
 *     carries; after a reset, sign this tab out with the password-changed notice (every
 *     session of the person has ended on the server); and the router's `navigate`.
 *
 * U4 (BR13.1–BR13.3; BR3.3, BR5.4):
 *   - the navigation gains ক্রেতা, পণ্য, কম মজুদ and সরবরাহকারী for every role;
 *   - App builds the catalog client (`deps.catalog`, over the same HTTP client when not given)
 *     and the catalog route state: what the role may do (from the S26 capability constants),
 *     the route's id, a customer's order history read over the order list with each order's
 *     status bucket, and what happens after a save — the toast on the route the save went to
 *     and, for a customer, the duplicate-phone warning on its detail.
 *
 * U5 (BR4.1, BR4.2, BR5.1, BR6.1): App builds the order screens' catalog loaders over the same
 * catalog client — customer search, product search, a product's variants with their labels
 * and selling price, the match index, and the customers of one phone — and passes them in the
 * orders route state, so the screens stay free of the client (BR7.4).
 */
import * as React from "react";
import { hasCapability } from "../auth/capability.js";
import type { GateSession } from "../auth/three-layer-gate.js";
import type { SessionResponse } from "../auth/schemas.js";
import type { AuditRouteState } from "../audit/screens/AuditTrail.js";
import type { DailyRouteState } from "../daily-card/screens/DailyCard.js";
import { createAuditApi, type AuditApi } from "../client/audit-api.js";
import { createStaffApi, type StaffApi } from "../client/staff-api.js";
import { createCatalogApi, type CatalogApi } from "../client/catalog-api.js";
import {
  canManageCatalog,
  canReadCost,
  canWriteCost,
  canWriteCustomers,
} from "../catalog/catalog-capability.js";
import type { CatalogRouteState, DuplicateShown } from "../catalog/screens/render-catalog-route.js";
import type { HistoryOrder } from "../catalog/types.js";
import { bucketOf } from "../orders/status-bucket.js";
import type { AuthApi } from "../client/auth-api.js";
import type { ApiFailure, ApiFailureKind, ApiResult, HttpClient } from "../client/http.js";
import type { OrdersApi } from "../client/orders-api.js";
import {
  clearNotice,
  loadMore,
  loadPage,
  loadRecent,
  openOrder,
  placeSaved,
  replaceOrder,
  resetOrders,
  useOrders,
  type OrdersStore,
} from "../client/orders-store.js";
import {
  accountCreated,
  needsSignIn,
  passwordChanged,
  rememberRoute,
  returnRoute,
  sessionEnded,
  signedIn,
  signedOut,
  useSession,
  type SessionStore,
} from "../client/session-store.js";
import type { Locale, OrderStatus, Role } from "../data/enums.js";
import { now } from "../data/clock.js";
import { err, ok } from "../data/result.js";
import { lookup, type LKey } from "../i18n/L.js";
import { setLocale, useLocale } from "../i18n/useTranslations.js";
import { buildRepeatOrder } from "../orders/input-modes.js";
import { ORDER_MUTATE_CAPABILITIES } from "../orders/order-capability.js";
import {
  EMPTY_DRAFT,
  setPending,
  type OrderDraftStore,
  type SaveOrder,
} from "../orders/order-draft.js";
import type { OrdersRouteState } from "../orders/screens/render-orders-route.js";
import type { CustomerChoice, OrdersCatalog } from "../orders/screens/OrderLinks.js";
import { variantLabel } from "../catalog/index.js";
import type { Order } from "../orders/types.js";
import { ErrorBanner, RequestState } from "../pres/RequestState.js";
import { Shell, type NavItem } from "../pres/Shell.js";
import { Toast } from "../pres/Toast.js";
import { dispatchPath } from "./dispatch.js";
import { matchRoute, navigate } from "./hash-router.js";
import type { StaffRouteState } from "./render-staff-route.js";
import type { TokenRouteState } from "./render-token-routes.js";
import { routes } from "./routes.js";
import type { AuthRouteState } from "./screens/render-auth-route.js";
import type { Route, RoutePath } from "./types.js";

export interface AppDeps {
  readonly http: HttpClient;
  readonly auth: AuthApi;
  readonly orders: OrdersApi;
  readonly sessions: SessionStore;
  readonly ordersStore: OrdersStore;
  readonly draft: OrderDraftStore;
  /** The audit client (U2); built over `http` when not given. */
  readonly audit?: AuditApi;
  /** The staff client (U3); built over `http` when not given. */
  readonly staff?: StaffApi;
  /** The catalog client (U4); built over `http` when not given. */
  readonly catalog?: CatalogApi;
}

const CATALOG_PREFIXES = ["/customers", "/products", "/low-stock", "/suppliers"] as const;

const isCatalogPath = (path: string | null): boolean =>
  path !== null && CATALOG_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

/** A catalog save's toast and BR3.3 warning, shown on the route the save went to. */
interface CatalogNotice {
  readonly path: string;
  readonly message: string;
  readonly duplicateOf: DuplicateShown | null;
}

/** S12: the places in the header; each item's access is its route's, from the route map. */
export const NAV_ITEMS: ReadonlyArray<{ readonly to: RoutePath; readonly label: LKey }> = [
  { to: "/orders", label: "nav.orders" },
  // U4 (BR13.2; mockups §15): the four catalog places, for every role.
  { to: "/customers", label: "nav.customers" },
  { to: "/products", label: "nav.products" },
  { to: "/low-stock", label: "nav.low_stock" },
  { to: "/suppliers", label: "nav.suppliers" },
  { to: "/daily-card", label: "nav.daily_card" },
  { to: "/audit-trail", label: "nav.audit_trail" },
  { to: "/staff", label: "nav.staff" },
  { to: "/business", label: "nav.business" },
  { to: "/settings", label: "nav.settings" },
];

/** Whether `role` holds any one of the route's capabilities; public routes open for all. */
export const roleOpens = (route: Route, role: Role): boolean => {
  const required = route.requiredCapability;
  if (required === null) return true;
  const anyOf = typeof required === "string" ? [required] : required;
  return anyOf.some((c) => hasCapability(role, c));
};

/** BR2.1: exactly the navigation items whose routes the role can open, in NAV_ITEMS order. */
export const navFor = (role: Role): ReadonlyArray<NavItem> =>
  NAV_ITEMS.filter((item) => {
    const route = routes.get(item.to);
    return route !== undefined && roleOpens(route, role);
  });

/** BR4.1: the first screen the role can open (its first navigation item). */
export const homeFor = (role: Role): string => navFor(role)[0]?.to ?? "/";

const PUBLIC_ENTRY: ReadonlySet<string> = new Set(["/", "/sign-in", "/sign-up"]);

const rawHash = (): string => window.location.hash.replace(/^#/, "") || "/";

/** The current hash path, re-rendering on every `hashchange`. */
const useHashPath = (): string => {
  const [path, setPath] = React.useState(rawHash);
  React.useEffect(() => {
    const listener = (): void => setPath(rawHash());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return path;
};

/**
 * The client gate's session. Expiry is not known to the browser (the server keeps it and
 * answers 401 when it passes, W9), so the advisory gate treats a loaded session as current.
 */
const gateSessionOf = (s: SessionResponse | null): GateSession | null =>
  s === null
    ? null
    : {
        userId: s.user.id,
        businessId: s.businessId,
        role: s.user.role,
        expiresAt: Number.POSITIVE_INFINITY,
      };

const isInfraFailure = (kind: ApiFailureKind): boolean =>
  kind === "unreachable" || kind === "db_unavailable" || kind === "internal";

export const App = ({ deps }: { readonly deps: AppDeps }): React.ReactElement => {
  const { http, auth, orders, sessions, ordersStore, draft } = deps;
  const locale = useLocale();
  const session = useSession(sessions);
  const list = useOrders(ordersStore);
  const path = useHashPath();
  const [bootError, setBootError] = React.useState<ApiFailure | null>(null);
  const [actionError, setActionError] = React.useState<ApiFailure | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);
  const [boot, setBoot] = React.useState(0);
  // BR4.1: the feature a redirect to /lock was about, so the lock screen can name it.
  const [lockFeature, setLockFeature] = React.useState<LKey | null>(null);
  const audit = React.useMemo(() => deps.audit ?? createAuditApi(http), [deps.audit, http]);
  const staff = React.useMemo(() => deps.staff ?? createStaffApi(http), [deps.staff, http]);
  const catalog = React.useMemo(() => deps.catalog ?? createCatalogApi(http), [deps.catalog, http]);
  const [catalogNotice, setCatalogNotice] = React.useState<CatalogNotice | null>(null);
  // U5 (BR4.1, BR4.2, BR5.1, BR6.1): the order screens' catalog loaders, over the same
  // catalog client; a failed request is null, which the screens show as "search failed".
  const ordersCatalog = React.useMemo<OrdersCatalog>(() => {
    const customerChoices = async (
      q: string,
      limit: number,
    ): Promise<ReadonlyArray<CustomerChoice> | null> => {
      const r = await catalog.customers.list({ q, limit });
      return r.ok
        ? r.value.customers.map((c) => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
          }))
        : null;
    };
    return {
      searchCustomers: (q) => customerChoices(q, 10),
      customersByPhone: (phone) => customerChoices(phone, 50),
      searchProducts: async (q) => {
        const r = await catalog.products.list({ q, limit: 10 });
        return r.ok ? r.value.products.map((p) => ({ id: p.id, name: p.name, sku: p.sku })) : null;
      },
      productVariants: async (productId) => {
        const r = await catalog.products.get(productId);
        if (!r.ok) return null;
        const product = r.value;
        return product.variants.map((v) => ({
          productId: product.id,
          variantId: v.id,
          label: variantLabel(product.name, v.axisValues),
          sellingPricePaise: product.sellingPricePaise,
        }));
      },
      matchIndex: async () => {
        const r = await catalog.matchIndex();
        return r.ok ? r.value : null;
      },
    };
  }, [catalog]);
  // BR5.4: a customer's orders with their status bucket, read over C3's order list.
  const customerOrders = React.useCallback(
    async (customerId: string): Promise<ApiResult<ReadonlyArray<HistoryOrder>>> => {
      const r = await orders.list({ customerId });
      if (!r.ok) return r;
      return {
        ok: true,
        status: r.status,
        value: r.value.orders.map((o) => ({
          id: o.id,
          orderNo: o.orderNo,
          status: o.status,
          bucket: bucketOf(o.status),
        })),
      };
    },
    [orders],
  );

  // W9: a 401 while signed in remembers the route and opens sign-in with the notice.
  React.useEffect(() => {
    http.onUnauthenticated(() => {
      resetOrders(ordersStore);
      sessionEnded(sessions, rawHash(), navigate);
    });
    return () => http.onUnauthenticated(null);
  }, [http, sessions, ordersStore]);

  // Load: who is signed in, and (when nobody is) whether the business exists yet (W3).
  React.useEffect(() => {
    let live = true;
    const resolve = async (): Promise<void> => {
      setBootError(null);
      const r = await auth.session();
      if (!live) return;
      if (r.ok) {
        signedIn(sessions, r.value);
        return;
      }
      if (r.kind !== "unauthenticated") {
        setBootError(r);
        return;
      }
      needsSignIn(sessions, rawHash());
      const setup = await auth.setup();
      if (!live) return;
      // An unknown hash stays on not-found; anything else goes to the first-run form or sign-in.
      if (matchRoute(rawHash())?.path === "/not-found") return;
      if (setup.ok && !setup.value.businessExists) navigate("/sign-up");
      else if (PUBLIC_ENTRY.has(rawHash()) && rawHash() !== "/sign-in") navigate("/sign-in");
    };
    void resolve();
    return () => {
      live = false;
    };
  }, [auth, sessions, boot]);

  const match = matchRoute(path);
  const routePath = match?.path ?? null;
  const routeId = match?.params["id"] ?? null;
  const signedInSession = session.status === "signed_in" ? session.session : null;

  // Signed in on an entry route (load, sign-in, sign-up): go to the remembered route, else
  // the orders list (W9 step 2). This is the one place that navigates after signing in, so
  // the return route cannot be overtaken by a second navigation.
  React.useEffect(() => {
    if (signedInSession && PUBLIC_ENTRY.has(routePath ?? "")) navigate(returnRoute(sessions));
  }, [signedInSession, routePath, sessions]);

  // U2 (D-04, W1 step 5): a route the role may not open loads nothing — the client gate
  // refuses before any call, so no gated API request is sent while resolving it.
  const role = signedInSession?.user.role ?? null;
  const routeOpens =
    routePath !== null && role !== null && roleOpens(routes.get(routePath) as Route, role);

  // Entering an order route loads what it shows (BR8.3).
  React.useEffect(() => {
    setActionError(null);
    if (!signedInSession || routePath === null || !routeOpens) return;
    if (routePath !== "/orders") clearNotice(ordersStore);
    switch (routePath) {
      case "/orders":
        if (ordersStore.get().status === "idle") void loadPage(ordersStore, orders, {});
        break;
      case "/orders/:id":
      case "/orders/:id/transition":
        if (routeId !== null && ordersStore.get().current?.id !== routeId) {
          void openOrder(ordersStore, orders, routeId);
        }
        break;
      case "/orders/new/repeat":
        void loadRecent(ordersStore, orders);
        break;
      default:
        break;
    }
  }, [routePath, routeId, signedInSession, routeOpens, ordersStore, orders]);

  /** A 403 from a write opens the lock screen naming the current route's feature (BR4.1). */
  const lockHere = (): void => {
    setLockFeature(routePath === null ? null : (routes.get(routePath)?.feature ?? null));
    navigate("/lock");
  };

  /** A refusal from a write: 403 opens the lock screen; infrastructure failures get the banner. */
  const routeFailure = (f: ApiFailure): void => {
    if (f.kind === "forbidden") lockHere();
    else if (isInfraFailure(f.kind) || f.kind === "payload_too_large") setActionError(f);
  };

  const onSave: SaveOrder = async (input) => {
    const r = await orders.create(input);
    if (r.ok) {
      placeSaved(ordersStore, r.value);
      navigate("/orders");
      return ok(r.value);
    }
    if (r.kind === "forbidden") lockHere();
    return err({ kind: r.kind, fields: r.fields });
  };

  const onTransition = (to: OrderStatus): void => {
    const current = ordersStore.get().current;
    if (!current) return;
    void (async () => {
      const r = await orders.transition(current.id, to);
      if (r.ok) {
        setActionError(null);
        replaceOrder(ordersStore, r.value);
      } else if (r.kind === "insufficient_stock") setActionError(r);
      else routeFailure(r);
    })();
  };

  const onRepeat = (order: Order): void => {
    setPending(draft, buildRepeatOrder(order));
    navigate("/orders/new/repeat");
  };

  // The entry-route effect above then navigates to the return route.
  const onSignedIn = (s: SessionResponse): void => signedIn(sessions, s);

  const onSignOut = (): void => {
    setSigningOut(true);
    void (async () => {
      await auth.signOut();
      setSigningOut(false);
      signedOut(sessions);
      resetOrders(ordersStore);
      draft.set(EMPTY_DRAFT);
      navigate("/sign-in");
    })();
  };

  const canMutate = role !== null && ORDER_MUTATE_CAPABILITIES.some((c) => hasCapability(role, c));
  const nav = role === null ? [] : navFor(role);
  const homeTo = role === null ? null : homeFor(role);

  const authState: AuthRouteState = {
    kind: "auth",
    notice: session.notice,
    signIn: auth.signIn,
    signUp: auth.signUp,
    onSignedIn,
    lock: {
      feature: lockFeature === null ? null : lookup(lockFeature, locale),
      homeTo,
    },
  };

  const auditState: AuditRouteState = { kind: "audit", locale, load: audit.page, homeTo };

  // B5 (US3.1): the daily card reads today's orders through the same orders client.
  const dailyState: DailyRouteState = {
    kind: "daily",
    locale,
    load: orders.list,
    isOwner: role === "owner",
  };

  // U3 (BR9.1): the staff container loads its own list through the staff client.
  const staffState: StaffRouteState = { kind: "staff", locale, staff, homeTo };

  // U3 (BR9.5): what the token containers need from App after a success.
  const tokenState: TokenRouteState = {
    kind: "token",
    staff,
    onAccepted: async () => {
      const r = await auth.session();
      if (r.ok) signedIn(sessions, r.value);
    },
    onPasswordChanged: () => {
      resetOrders(ordersStore);
      draft.set(EMPTY_DRAFT);
      passwordChanged(sessions);
    },
    onAccountCreated: () => accountCreated(sessions),
    navigate,
  };

  const ordersState: OrdersRouteState = {
    kind: "orders",
    locale,
    canMutate,
    draft,
    page: { orders: list.rows, nextCursor: list.nextCursor },
    current: list.current,
    onOpen: (id) => navigate(`/orders/${id}`),
    onLoadMore: (cursor) => void loadMore(ordersStore, orders, cursor),
    onFilter: (f) => void loadPage(ordersStore, orders, f),
    onSave,
    onTransition,
    onRepeat,
    listLoading: list.status === "loading",
    listError: list.status === "error" ? list.error : null,
    onRetryList: () => void loadPage(ordersStore, orders),
    notice: list.notice,
    currentLoading: list.currentStatus === "loading",
    currentError: list.currentStatus === "error" ? list.currentError : null,
    onRetryCurrent: () => {
      if (routeId !== null) void openOrder(ordersStore, orders, routeId);
    },
    recent: list.recent,
    catalog: ordersCatalog,
  };

  // U4 (BR13.1–BR13.3): the catalog screens' state. What the role may do comes from the same
  // capability constants the server and the router use (S26); the screens never decide it.
  const noticeHere = catalogNotice !== null && catalogNotice.path === path ? catalogNotice : null;
  const catalogState: CatalogRouteState = {
    kind: "catalog",
    locale,
    api: catalog,
    customerOrders,
    id: routeId,
    can: {
      writeCustomers: role !== null && canWriteCustomers(role),
      manage: role !== null && canManageCatalog(role),
      readCost: role !== null && canReadCost(role),
      writeCost: role !== null && canWriteCost(role),
    },
    homeTo,
    navigate,
    onSaved: (to, message, duplicateOf = null) => {
      setCatalogNotice({ path: to, message, duplicateOf });
      navigate(to);
    },
    duplicateOf: noticeHere?.duplicateOf ?? null,
  };

  const TOKEN_ROUTES: ReadonlySet<string> = new Set(["/accept-invite", "/reset", "/recover"]);
  const routeState = routePath?.startsWith("/orders")
    ? ordersState
    : isCatalogPath(routePath)
      ? catalogState
      : routePath === "/audit-trail"
        ? auditState
        : routePath === "/daily-card"
          ? dailyState
          : routePath === "/staff"
            ? staffState
            : TOKEN_ROUTES.has(routePath ?? "")
              ? tokenState
              : authState;
  const outcome =
    session.status === "unknown"
      ? null
      : dispatchPath(path, gateSessionOf(signedInSession), now().getTime(), routeState);
  const redirectTo = outcome?.kind === "redirect" ? outcome.to : null;

  // Apply the gate's redirect after render (never during it).
  React.useEffect(() => {
    if (redirectTo === null) return;
    // Remember the gated route, so sign-in comes back to it (W9 step 2).
    if (redirectTo === "/sign-in") rememberRoute(sessions, path);
    // BR4.1: the lock screen names the feature of the route the role could not open.
    if (redirectTo === "/lock") {
      const locked = matchRoute(path);
      setLockFeature(locked === null ? null : (routes.get(locked.path)?.feature ?? null));
    }
    navigate(redirectTo);
  }, [redirectTo, path, sessions]);

  // BR6.2, F-05: the Shell hosts the save toast, so it survives the move to the list.
  const toast =
    list.notice === "saved" ? (
      <Toast message={lookup("common.saved", locale)} tone="success" />
    ) : noticeHere !== null ? (
      <Toast message={noticeHere.message} tone="success" />
    ) : null;

  let content: React.ReactNode;
  if (bootError) {
    content = (
      <ErrorBanner
        kind={bootError.kind}
        locale={locale}
        correlationId={bootError.correlationId}
        onRetry={() => setBoot((n) => n + 1)}
      />
    );
  } else if (outcome === null) {
    content = <RequestState phase="loading" locale={locale} />;
  } else if (outcome.kind === "render") {
    content = outcome.route.render(routeState) as React.ReactNode;
  } else {
    content = null;
  }

  return (
    <Shell
      locale={locale}
      onLocaleChange={(l: Locale) => setLocale(l)}
      user={
        signedInSession
          ? { email: signedInSession.user.email, role: signedInSession.user.role }
          : null
      }
      nav={nav}
      currentPath={path}
      toast={toast}
      onSignOut={onSignOut}
      signingOut={signingOut}
    >
      {actionError ? (
        <ErrorBanner
          kind={actionError.kind}
          locale={locale}
          correlationId={actionError.correlationId}
          fields={actionError.fields}
          onRetry={() => setActionError(null)}
        />
      ) : null}
      {content}
    </Shell>
  );
};
