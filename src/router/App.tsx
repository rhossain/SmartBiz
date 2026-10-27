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
 */
import * as React from "react";
import { hasCapability } from "../auth/capability.js";
import type { GateSession } from "../auth/three-layer-gate.js";
import type { SessionResponse } from "../auth/schemas.js";
import type { AuthApi } from "../client/auth-api.js";
import type { ApiFailure, ApiFailureKind, HttpClient } from "../client/http.js";
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
  needsSignIn,
  rememberRoute,
  returnRoute,
  sessionEnded,
  signedIn,
  signedOut,
  useSession,
  type SessionStore,
} from "../client/session-store.js";
import type { Locale, OrderStatus } from "../data/enums.js";
import { now } from "../data/clock.js";
import { err, ok } from "../data/result.js";
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
import type { Order } from "../orders/types.js";
import { ErrorBanner, RequestState } from "../pres/RequestState.js";
import { Shell } from "../pres/Shell.js";
import { dispatchPath } from "./dispatch.js";
import { matchRoute, navigate } from "./hash-router.js";
import type { AuthRouteState } from "./screens/render-auth-route.js";

export interface AppDeps {
  readonly http: HttpClient;
  readonly auth: AuthApi;
  readonly orders: OrdersApi;
  readonly sessions: SessionStore;
  readonly ordersStore: OrdersStore;
  readonly draft: OrderDraftStore;
}

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

  // Entering an order route loads what it shows (BR8.3).
  React.useEffect(() => {
    setActionError(null);
    if (!signedInSession || routePath === null) return;
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
  }, [routePath, routeId, signedInSession, ordersStore, orders]);

  /** A refusal from a write: 403 opens the lock screen; infrastructure failures get the banner. */
  const routeFailure = (f: ApiFailure): void => {
    if (f.kind === "forbidden") navigate("/lock");
    else if (isInfraFailure(f.kind) || f.kind === "payload_too_large") setActionError(f);
  };

  const onSave: SaveOrder = async (input) => {
    const r = await orders.create(input);
    if (r.ok) {
      placeSaved(ordersStore, r.value);
      navigate("/orders");
      return ok(r.value);
    }
    if (r.kind === "forbidden") navigate("/lock");
    return err({ kind: r.kind, fields: r.fields });
  };

  const onTransition = (to: OrderStatus): void => {
    const current = ordersStore.get().current;
    if (!current) return;
    void (async () => {
      const r = await orders.transition(current.id, to);
      if (r.ok) replaceOrder(ordersStore, r.value);
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

  const role = signedInSession?.user.role ?? null;
  const canMutate = role !== null && ORDER_MUTATE_CAPABILITIES.some((c) => hasCapability(role, c));

  const authState: AuthRouteState = {
    kind: "auth",
    notice: session.notice,
    signIn: auth.signIn,
    signUp: auth.signUp,
    onSignedIn,
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
  };

  const routeState = routePath?.startsWith("/orders") ? ordersState : authState;
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
    navigate(redirectTo);
  }, [redirectTo, path, sessions]);

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
      onSignOut={onSignOut}
      signingOut={signingOut}
    >
      {actionError ? (
        <ErrorBanner
          kind={actionError.kind}
          locale={locale}
          correlationId={actionError.correlationId}
          onRetry={() => setActionError(null)}
        />
      ) : null}
      {content}
    </Shell>
  );
};
