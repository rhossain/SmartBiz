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
 *   - `/daily-card` is the Owner's daily card; `/business` and `/settings` are the Business
 *     and Settings pages (mockups §17.2, §17.3), through src/router/render-business-route.tsx.
 * U3 (BR9.1–BR9.5, BR10.1; review D-02): `/accept-invite`, `/reset` and `/recover` leave the
 * not-available screen for their real screens, rendered through the token containers
 * (src/router/render-token-routes.tsx), and `/staff` is new, open to `staff.invite` (Owner,
 * Manager) with the feature name "কর্মী", through its container
 * (src/router/render-staff-route.tsx). U4 adds the ten catalog routes (AC5.1.4, units R-02;
 * BR13.1): reads open to `business.view`, the customer new/edit screens to the customer-write
 * set, the product new/edit screens to `money.mutate.full`, from the same constants the
 * server's catalog routes use (src/catalog/catalog-capability.ts, S26).
 */
import { renderAuditTrail } from "../audit/screens/AuditTrail.js";
import { CATALOG_MANAGE, CATALOG_READ, CUSTOMER_WRITE } from "../catalog/catalog-capability.js";
import {
  renderCatalogScreen,
  type CatalogScreen,
} from "../catalog/screens/render-catalog-route.js";
import { renderDailyCard } from "../daily-card/screens/DailyCard.js";
import { renderBusinessRoute, renderSettingsRoute } from "./render-business-route.js";
import { renderInsightsRoute } from "./render-insights-route.js";
import { ORDER_MUTATE_CAPABILITIES, ORDER_READ_CAPABILITY } from "../orders/order-capability.js";
import { renderOrdersScreen } from "../orders/screens/render-orders-route.js";
import { renderStaffRoute } from "./render-staff-route.js";
import { renderAcceptInvite, renderRecover, renderReset } from "./render-token-routes.js";
import {
  renderLock,
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
const orderPrint = (state: unknown): unknown => renderOrdersScreen("print", state);

const route = (r: Route): readonly [RoutePath, Route] => [r.path, r];

const catalogScreen =
  (screen: CatalogScreen) =>
  (state: unknown): unknown =>
    renderCatalogScreen(screen, state);

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
    render: renderRecover,
  }),
  route({
    path: "/reset",
    requiredCapability: null,
    feature: "feature.reset",
    render: renderReset,
  }),
  route({
    path: "/accept-invite",
    requiredCapability: null,
    feature: "feature.accept_invite",
    render: renderAcceptInvite,
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
  // The printable invoice and delivery slip: whoever reads the order may print it.
  route({
    path: "/orders/:id/print",
    requiredCapability: ORDER_READ_CAPABILITY,
    feature: "feature.orders",
    render: orderPrint,
  }),
  route({
    path: "/orders/:id/transition",
    requiredCapability: ORDER_MUTATE_CAPABILITIES,
    feature: "feature.order_transition",
    render: orderDetail,
  }),
  // U4 (BR13.1, S26; Q14): the catalog. Every role reads; the new and edit screens of
  // customers need the customer-write set, those of products `money.mutate.full`. Each
  // renders through src/catalog/screens/render-catalog-route.tsx.
  route({
    path: "/customers",
    requiredCapability: CATALOG_READ,
    feature: "feature.customers",
    render: catalogScreen("customers"),
  }),
  route({
    path: "/customers/new",
    requiredCapability: CUSTOMER_WRITE,
    feature: "feature.customer_new",
    render: catalogScreen("customer-new"),
  }),
  route({
    path: "/customers/:id",
    requiredCapability: CATALOG_READ,
    feature: "feature.customers",
    render: catalogScreen("customer"),
  }),
  route({
    path: "/customers/:id/edit",
    requiredCapability: CUSTOMER_WRITE,
    feature: "feature.customer_edit",
    render: catalogScreen("customer-edit"),
  }),
  route({
    path: "/products",
    requiredCapability: CATALOG_READ,
    feature: "feature.products",
    render: catalogScreen("products"),
  }),
  route({
    path: "/products/new",
    requiredCapability: CATALOG_MANAGE,
    feature: "feature.product_new",
    render: catalogScreen("product-new"),
  }),
  route({
    path: "/products/:id",
    requiredCapability: CATALOG_READ,
    feature: "feature.products",
    render: catalogScreen("product"),
  }),
  route({
    path: "/products/:id/edit",
    requiredCapability: CATALOG_MANAGE,
    feature: "feature.product_edit",
    render: catalogScreen("product-edit"),
  }),
  route({
    path: "/low-stock",
    requiredCapability: CATALOG_READ,
    feature: "feature.low_stock",
    render: catalogScreen("low-stock"),
  }),
  route({
    path: "/suppliers",
    requiredCapability: CATALOG_READ,
    feature: "feature.suppliers",
    render: catalogScreen("suppliers"),
  }),
  route({
    path: "/daily-card",
    // B5 (US3.1, mockups §17.1): the daily card is the Owner's; `business.edit` is the Owner-only
    // capability, so every other role meets the lock screen and no nav link (NFR6.6).
    requiredCapability: "business.edit",
    feature: "feature.daily_card",
    render: renderDailyCard,
  }),
  // Customer and product insights: money per customer, so the Owner only (`business.edit`).
  route({
    path: "/insights",
    requiredCapability: "business.edit",
    feature: "feature.insights",
    render: renderInsightsRoute,
  }),
  route({
    path: "/audit-trail",
    requiredCapability: "audit.view",
    feature: "feature.audit_trail",
    render: renderAuditTrail,
  }),
  route({
    path: "/staff",
    requiredCapability: "staff.invite",
    feature: "feature.staff",
    render: renderStaffRoute,
  }),
  route({
    path: "/business",
    requiredCapability: "business.edit",
    feature: "feature.business",
    render: renderBusinessRoute,
  }),
  route({
    path: "/settings",
    requiredCapability: "settings.edit.own",
    feature: "feature.settings",
    render: renderSettingsRoute,
  }),
  route({ path: "/lock", requiredCapability: null, feature: "feature.lock", render: renderLock }),
  route({
    path: "/not-found",
    requiredCapability: null,
    feature: "feature.not_found",
    render: renderNotFound,
  }),
]);
