/**
 * src/router/types.ts — Route type. The hash-router registry holds a `Map<RoutePath, Route>`;
 * the three-layer gate dispatcher reads the route's `requiredCapability` on every navigation
 * (BR2.4, R1.2).
 *
 * U2 (entities.md ScreenRoute; BR1.1, BR1.2, BR1.5; Q2): `/accept` is now `/accept-invite`
 * (the path C6's invitation link uses), and every route names its `feature`, the i18n key of
 * the feature's name that the lock and not-available screens show.
 */
import type { Capability } from "../data/enums.js";
import type { BusinessRule } from "../auth/business-rule.js";
import type { LKey } from "../i18n/L.js";

export type RoutePath =
  | "/"
  | "/sign-in"
  | "/sign-up"
  | "/recover"
  | "/reset"
  | "/accept-invite"
  | "/orders"
  | "/orders/new"
  | "/orders/new/paste-parse"
  | "/orders/new/repeat"
  | "/orders/:id"
  | "/orders/:id/transition"
  | "/orders/:id/print"
  // U4 (BR13.1; Q14): the ten catalog screens.
  | "/customers"
  | "/customers/new"
  | "/customers/:id"
  | "/customers/:id/edit"
  | "/products"
  | "/products/new"
  | "/products/:id"
  | "/products/:id/edit"
  | "/low-stock"
  | "/suppliers"
  | "/daily-card"
  | "/audit-trail"
  | "/staff"
  | "/business"
  | "/settings"
  | "/lock"
  | "/not-found";

/**
 * A resolved navigation: the registry key (a pattern such as
 * `/orders/:id`) plus the values its `:name` segments matched.
 */
export interface RouteMatch {
  readonly path: RoutePath;
  readonly params: Readonly<Record<string, string>>;
}

export interface Route<State = unknown> {
  readonly path: RoutePath;
  /**
   * null = public. A list means "any one of these" (B2: order mutation is
   * open to `money.mutate.price` OR `money.mutate.full`); the dispatcher
   * still runs the single-capability three-layer gate.
   */
  readonly requiredCapability: Capability | ReadonlyArray<Capability> | null;
  /** The feature's name (i18n key) for the lock and not-available screens (BR4.1, BR1.1). */
  readonly feature: LKey;
  readonly render: (state: State) => unknown;
  readonly businessRule?: BusinessRule<State>;
}
