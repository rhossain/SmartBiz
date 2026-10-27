/**
 * src/router/routes.ts — typed routes registry (RouterComponent; R1.2; U2 W1, BR1.1–BR1.5,
 * S12; functional-spec "Screen route map after U2").
 *
 * `Map<RoutePath, Route>` is the single source of truth for "every route has a gate" (R1.2):
 * each entry declares its access (null = public, or the capabilities any one of which opens
 * it, BR1.2) and its `feature` key. The client role walk (tests/unit/three-layer-gate-absence
 * .test.ts) compares this map with the role table both ways, and App builds the navigation
 * from it (S12), so a link's access is always its route's access (BR2.1).
 *
 * Order routes take their capabilities from src/orders/order-capability.ts, so the router
 * and the order functions cannot disagree: reads need `business.view`; every create, edit or
 * transition route needs `money.mutate.price` or `money.mutate.full`.
 *
 * U2: no route renders nothing (BR1.1):
 *   - `/` stays public and only redirects (F-02): signed in → the orders list, otherwise
 *     sign-in or first-run sign-up (App);
 *   - `/sign-in`, `/sign-up`, `/lock`, `/not-found` and the order screens are U1's;
 *   - `/audit-trail` is the audit trail screen (W4);
 *   - `/daily-card`, `/business`, `/settings` (B5) and `/accept-invite` (was `/accept`, Q2),
 *     `/reset`, `/recover` (U3) render the not-available screen naming their feature.
 * U3 adds `/staff`; U4 the catalog routes (AC5.1.4, units R-02).
 */
import { renderAuditTrail } from "../audit/screens/AuditTrail.js";
import { ORDER_MUTATE_CAPABILITIES, ORDER_READ_CAPABILITY } from "../orders/order-capability.js";
import { renderOrdersScreen } from "../orders/screens/render-orders-route.js";
import {
  renderLock,
  renderNotAvailable,
  renderNotFound,
  renderSignIn,
  renderSignUp,
} from "./screens/render-auth-route.js";
import type { Route, RoutePath } from "./types.js";

/** `/` redirects only (App); while the session is being resolved it shows nothing. */
const renderEntry = (): unknown => null;
const ordersList = (state: unknown): unknown => renderOrdersScreen("list", state);
const manualOrder = (state: unknown): unknown => renderOrdersScreen("manual", state);
const pasteParse = (state: unknown): unknown => renderOrdersScreen("paste-parse", state);
const repeatFromPast = (state: unknown): unknown => renderOrdersScreen("repeat", state);
const orderDetail = (state: unknown): unknown => renderOrdersScreen("detail", state);

const route = (r: Route): readonly [RoutePath, Route] => [r.path, r];

export const routes: ReadonlyMap<RoutePath, Route> = new Map<RoutePath, Route>([
  route({ path: "/", requiredCapability: null, feature: "feature.home", render: renderEntry }),
  route({
    path: "/sign-in",
    requiredCapability: null,
    feature: "feature.sign_in",
    render: renderSignIn,
  }),
  route({
    path: "/sign-up",
    requiredCapability: null,
    feature: "feature.sign_up",
    render: renderSignUp,
  }),
  route({
    path: "/recover",
    requiredCapability: null,
    feature: "feature.recover",
    render: renderNotAvailable("feature.recover"),
  }),
  route({
    path: "/reset",
    requiredCapability: null,
    feature: "feature.reset",
    render: renderNotAvailable("feature.reset"),
  }),
  route({
    path: "/accept-invite",
    requiredCapability: null,
    feature: "feature.accept_invite",
    render: renderNotAvailable("feature.accept_invite"),
  }),
  route({
    path: "/orders",
    requiredCapability: ORDER_READ_CAPABILITY,
    feature: "feature.orders",
    render: ordersList,
  }),
  route({
    path: "/orders/new",
    requiredCapability: ORDER_MUTATE_CAPABILITIES,
    feature: "feature.order_new",
    render: manualOrder,
  }),
  route({
    path: "/orders/new/paste-parse",
    requiredCapability: ORDER_MUTATE_CAPABILITIES,
    feature: "feature.order_paste",
    render: pasteParse,
  }),
  route({
    path: "/orders/new/repeat",
    requiredCapability: ORDER_MUTATE_CAPABILITIES,
    feature: "feature.order_repeat",
    render: repeatFromPast,
  }),
  route({
    path: "/orders/:id",
    requiredCapability: ORDER_READ_CAPABILITY,
    feature: "feature.orders",
    render: orderDetail,
  }),
  route({
    path: "/orders/:id/transition",
    requiredCapability: ORDER_MUTATE_CAPABILITIES,
    feature: "feature.order_transition",
    render: orderDetail,
  }),
  route({
    path: "/daily-card",
    requiredCapability: "business.view",
    feature: "feature.daily_card",
    render: renderNotAvailable("feature.daily_card"),
  }),
  route({
    path: "/audit-trail",
    requiredCapability: "audit.view",
    feature: "feature.audit_trail",
    render: renderAuditTrail,
  }),
  route({
    path: "/business",
    requiredCapability: "business.edit",
    feature: "feature.business",
    render: renderNotAvailable("feature.business"),
  }),
  route({
    path: "/settings",
    requiredCapability: "settings.edit.own",
    feature: "feature.settings",
    render: renderNotAvailable("feature.settings"),
  }),
  route({ path: "/lock", requiredCapability: null, feature: "feature.lock", render: renderLock }),
  route({
    path: "/not-found",
    requiredCapability: null,
    feature: "feature.not_found",
    render: renderNotFound,
  }),
]);
