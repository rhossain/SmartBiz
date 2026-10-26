/**
 * src/index.tsx — entry: mount the Shell at `#root`.
 * Vite's `index.html` is the bootstrap; this file is the
 * application entry that hydrates the Shell + binds the
 * three-layer gate.
 */
import * as React from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./pres/Shell.js";
import { setLocale, useLocale } from "./i18n/useTranslations.js";
import type { Locale } from "./auth/types.js";
import "./pres/tokens.css";

const App = (): React.ReactElement => {
  const locale = useLocale();
  return (
    <Shell
      locale={locale}
      onLocaleChange={(l: Locale) => setLocale(l)}
      userEmail="owner@example.com"
      onSignOut={() => {
        if (typeof window !== "undefined") window.location.hash = "/sign-in";
      }}
    />
  );
};

const mount = (): void => {
  const el = document.getElementById("root");
  if (!el) return;
  createRoot(el).render(<App />);
};

if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}