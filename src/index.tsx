/**
 * src/index.tsx — the browser entry: build the client and the stores, mount the app at
 * `#root` (BR8.6; W3, W9).
 *
 * Vite's `index.html` is the bootstrap; this file creates the one HTTP client, the two API
 * modules over it and the per-feature stores, and hands them to the App, which resolves the
 * session on load. Nothing here knows who is signed in: there is no hard-coded email, and the
 * session lives only in memory and the HttpOnly cookie (BR8.1, BR8.6).
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { createAuthApi } from "./client/auth-api.js";
import { createHttpClient } from "./client/http.js";
import { createOrdersApi } from "./client/orders-api.js";
import { createOrdersStore } from "./client/orders-store.js";
import { createSessionStore } from "./client/session-store.js";
import { createOrderDraftStore } from "./orders/order-draft.js";
import { App, type AppDeps } from "./router/App.js";
import "./pres/tokens.css";
import "./pres/components.css";

export const createAppDeps = (): AppDeps => {
  const http = createHttpClient();
  return {
    http,
    auth: createAuthApi(http),
    orders: createOrdersApi(http),
    sessions: createSessionStore(),
    ordersStore: createOrdersStore(),
    draft: createOrderDraftStore(),
  };
};

const mount = (): void => {
  const el = document.getElementById("root");
  if (!el) return;
  createRoot(el).render(<App deps={createAppDeps()} />);
};

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}
