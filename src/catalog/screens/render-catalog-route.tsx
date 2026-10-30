/**
 * src/catalog/screens/render-catalog-route.tsx — wires the ten catalog routes to their
 * screens (U4 BR13.1–BR13.3; frontend-components "Screens"; Q14).
 *
 * The router's `Route.render` receives the app state as `unknown`; this module narrows it to
 * `CatalogRouteState` (built by App) and picks the screen. A state that is not the catalog's
 * renders nothing rather than a half-built screen. The route gate has already run
 * (src/router/dispatch.ts); the screens whose whole purpose is writing — the new and edit
 * screens — also gate themselves (team.md "role gate tested by absence"): a role without the
 * write capability gets the lock screen, never a form, however it got there.
 *
 *   /customers            → CustomerList        /products            → ProductList
 *   /customers/new        → CustomerForm (new)  /products/new        → ProductForm (new)
 *   /customers/:id        → CustomerDetail      /products/:id        → ProductDetail
 *   /customers/:id/edit   → CustomerForm (edit) /products/:id/edit   → ProductForm (edit)
 *   /low-stock            → LowStock            /suppliers           → Suppliers
 *
 * Screens take everything as props — the catalog client (imported here as a type only, the
 * ESLint screen boundary), what the role may do (computed by App from the capability
 * constants, never decided here), the route's id, and `navigate` / `onSaved` for after a
 * save. A screen keyed by the id remounts when the id changes, so it never shows one
 * record's data under another's address.
 */
import type { ShrunkImage } from "../../pres/shrink-image.js";
import * as React from "react";
import type { CatalogApi } from "../../client/catalog-api.js";
import type { ApiResult } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { assertNever } from "../../data/assert-never.js";
import { LockScreen } from "../../pres/Lock.js";
import type { HistoryOrder } from "../types.js";
import { CustomerDetail } from "./CustomerDetail.js";
import { CustomerForm } from "./CustomerForm.js";
import { CustomerList } from "./CustomerList.js";
import { LowStock } from "./LowStock.js";
import { ProductDetail } from "./ProductDetail.js";
import { ProductForm } from "./ProductForm.js";
import { ProductList } from "./ProductList.js";
import { Suppliers } from "./Suppliers.js";

/** What the signed-in role may do in the catalog (App derives it from S26's constants). */
export interface CatalogPermissions {
  readonly writeCustomers: boolean;
  readonly manage: boolean;
  readonly readCost: boolean;
  readonly writeCost: boolean;
}

export interface DuplicateShown {
  readonly id: string;
  readonly name: string;
}

export interface CatalogRouteState {
  readonly kind: "catalog";
  readonly locale: Locale;
  readonly api: CatalogApi;
  /** BR5.4: the customer's orders with their status bucket (App reads them over C3). */
  readonly customerOrders: (customerId: string) => Promise<ApiResult<ReadonlyArray<HistoryOrder>>>;
  /** The route's `:id`, already parsed as a UUID by the hash router; null elsewhere. */
  readonly id: string | null;
  readonly can: CatalogPermissions;
  readonly homeTo: string | null;
  readonly navigate: (to: string) => void;
  /** After a save: show the toast on `to`, go there, and carry BR3.3's warning along. */
  readonly onSaved: (to: string, message: string, duplicateOf?: DuplicateShown | null) => void;
  /** BR3.3: the duplicate-phone warning for the customer just saved, on its detail. */
  readonly duplicateOf: DuplicateShown | null;
  /** Product photos: shrinks a picked image before upload; the browser's canvas by default. */
  readonly shrinkPhoto?: (file: File) => Promise<ShrunkImage | null>;
}

export type CatalogScreen =
  | "customers"
  | "customer-new"
  | "customer"
  | "customer-edit"
  | "products"
  | "product-new"
  | "product"
  | "product-edit"
  | "low-stock"
  | "suppliers";

export const isCatalogRouteState = (state: unknown): state is CatalogRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "catalog";

export const renderCatalogScreen = (
  screen: CatalogScreen,
  state: unknown,
): React.ReactElement | null => {
  if (!isCatalogRouteState(state)) return null;
  const id = state.id ?? "";
  switch (screen) {
    case "customers":
      return <CustomerList state={state} />;
    case "customer-new":
      return state.can.writeCustomers ? <CustomerForm state={state} mode="new" /> : <LockScreen />;
    case "customer":
      return <CustomerDetail key={id} state={state} id={id} />;
    case "customer-edit":
      return state.can.writeCustomers ? (
        <CustomerForm key={id} state={state} mode="edit" id={id} />
      ) : (
        <LockScreen />
      );
    case "products":
      return <ProductList state={state} />;
    case "product-new":
      return state.can.manage ? <ProductForm state={state} mode="new" /> : <LockScreen />;
    case "product":
      return <ProductDetail key={id} state={state} id={id} />;
    case "product-edit":
      return state.can.manage ? (
        <ProductForm key={id} state={state} mode="edit" id={id} />
      ) : (
        <LockScreen />
      );
    case "low-stock":
      return <LowStock state={state} />;
    case "suppliers":
      return <Suppliers state={state} />;
    default:
      return assertNever(screen, "catalog screen");
  }
};
