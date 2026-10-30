/**
 * src/pres/Shell.tsx — the app chrome: title, navigation, language, the signed-in person and
 * the save toast (BR8.6; FR4.1, FR2.4; AC5.2a.1; U2 BR2.1–BR2.3, BR6.2; S12; review F-01,
 * F-05).
 *
 * - The header shows the signed-in email and role, from `GET /api/session` — never a
 *   hard-coded address (BR2.3). Signed out, it shows neither, and no navigation.
 * - U2 (F-01, S12): the navigation is a PROP. App (RouterComponent) builds the `NavItem`
 *   list from the screen route map and keeps only the items the role may open (BR2.1); the
 *   Shell renders exactly what it is given, each with its own label in the chosen language
 *   (BR2.2). It holds no capability list and imports neither the router, the API client nor
 *   `src/auth`.
 * - U2 (F-05, BR6.2): the toast renders here, at Shell level, so a "সংরক্ষণ হয়েছে" shown
 *   after a save outlives the route change that follows it; the toast announces itself
 *   politely (Toast.tsx).
 * - Sign-out is a button that calls the caller's `onSignOut`, which posts to
 *   `/api/auth/sign-out`; it is disabled while that call runs.
 * - No external font is preloaded: the CSP is `default-src 'self'`, and the Bengali font is
 *   self-hosted or taken from the local fallback chain (team.md Code Style "Bengali font
 *   available offline").
 *
 * Redesign (mockups §18, 2026-10-30): one header element plays two parts. From 960 px it is
 * the fixed ink sidebar (brand, navigation, then language and account at the foot). Below
 * that it is an off-canvas drawer opened from a slim top bar, and a bottom tab bar repeats
 * up to four of the given links (by `TAB_ORDER`) plus "আরও", which opens the drawer. The tab
 * bar only re-shows links the Shell was given, so it can never widen what a role may open.
 * Icons are decorative (`aria-hidden`) and carry no text, so each link's text is its label.
 */
import * as React from "react";
import type { Locale, Role } from "../data/enums.js";
import { lookup, type LKey } from "../i18n/L.js";

export interface ShellUser {
  readonly email: string;
  readonly role: Role;
}

/** One navigation link: the route it opens and its label key (entities.md NavItem). */
export interface NavItem {
  readonly to: string;
  readonly label: LKey;
}

export interface ShellProps {
  readonly locale: Locale;
  readonly onLocaleChange: (l: Locale) => void;
  readonly user?: ShellUser | null;
  /** The links this role may open, already filtered by App from the route map (BR2.1). */
  readonly nav?: ReadonlyArray<NavItem>;
  /** The current hash path; the nav link it falls under is marked `aria-current="page"`. */
  readonly currentPath?: string;
  /** The Shell-level toast (BR6.2), or nothing. */
  readonly toast?: React.ReactNode;
  readonly onSignOut?: () => void;
  readonly signingOut?: boolean;
  readonly children?: React.ReactNode;
}

const ROLE_LABEL: Readonly<Record<Role, LKey>> = {
  owner: "role.owner",
  manager: "role.manager",
  sales_staff: "role.sales_staff",
  accountant: "role.accountant",
};

/** The phone tab bar's preference order; the first four the role was given are shown. */
const TAB_ORDER: ReadonlyArray<string> = [
  "/daily-card",
  "/orders",
  "/customers",
  "/products",
  "/low-stock",
];
const TAB_COUNT = 4;

/** 24 × 24 stroke icons, drawn for this app; keyed by route, with a neutral fallback. */
const ICON_PATHS: Readonly<Record<string, string>> = {
  "/orders": "M6 7h12l-1 13H7L6 7Z M9 7a3 3 0 0 1 6 0",
  "/customers":
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M2.5 20a6.5 6.5 0 0 1 13 0 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.5a6.5 6.5 0 0 1 3.5 5.5",
  "/products": "M12 3 3.5 7.5v9L12 21l8.5-4.5v-9L12 3Z M3.5 7.5 12 12l8.5-4.5 M12 12v9",
  "/low-stock": "M12 4 2.5 20h19L12 4Z M12 10v4.5 M12 17.5h.01",
  "/suppliers":
    "M2.5 6h11v10h-11z M13.5 10h4l3 3v3h-7 M6.5 19a2 2 0 1 0 0-.01 M17 19a2 2 0 1 0 0-.01",
  "/daily-card": "M4 4h7v7H4z M13 4h7v4h-7z M13 10h7v10h-7z M4 13h7v7H4z",
  "/insights": "M4 20V10 M10 20V4 M16 20v-7 M21 20H3",
  "/audit-trail":
    "M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Z M8.5 12l2.5 2.5 4.5-5",
  "/staff":
    "M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M3.5 20a6.5 6.5 0 0 1 11-4.7 M18.5 14v6 M15.5 17h6",
  "/business": "M3.5 9.5 5 4h14l1.5 5.5 M3.5 9.5h17 M5 9.5V20h14V9.5 M10 20v-5h4v5",
  "/settings": "M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 5v4 M9 15v4",
  menu: "M4 7h16 M4 12h16 M4 17h16",
  more: "M5 12h.01 M12 12h.01 M19 12h.01",
  close: "M6 6l12 12 M18 6 6 18",
  signout: "M15 4h4v16h-4 M10 8l-4 4 4 4 M6 12h10",
};

const Icon = (props: { readonly name: string }): React.ReactElement => (
  <svg
    className="icon"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path d={ICON_PATHS[props.name] ?? "M12 12h.01"} />
  </svg>
);

/** A nav link is current on its own path and on every path beneath it (`/orders/new`). */
const isCurrent = (to: string, path: string | undefined): boolean =>
  path !== undefined && (path === to || path.startsWith(`${to}/`));

const current = (to: string, path: string | undefined): { "aria-current"?: "page" } =>
  isCurrent(to, path) ? { "aria-current": "page" } : {};

export const Shell = (props: ShellProps): React.ReactElement => {
  const { locale, onLocaleChange, user, onSignOut, children } = props;
  const signedIn = user !== null && user !== undefined;
  const nav = props.nav ?? [];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const close = (): void => setMenuOpen(false);

  // A route change closes the phone drawer; so does Escape while it is open.
  React.useEffect(() => setMenuOpen(false), [props.currentPath]);
  React.useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const tabs = TAB_ORDER.flatMap((to) => nav.filter((n) => n.to === to)).slice(0, TAB_COUNT);
  // "আরও" reads as current when the page is one the tab bar does not show.
  const elsewhere =
    props.currentPath !== undefined && !tabs.some((t) => isCurrent(t.to, props.currentPath));

  return (
    <div
      data-testid="shell"
      className={signedIn ? "shell shell--app" : "shell shell--public"}
      data-menu-open={menuOpen ? "true" : "false"}
    >
      {signedIn ? (
        <div className="shell__topbar">
          <span className="shell__topbar-brand" aria-hidden="true">
            SmartBiz
          </span>
          <button
            type="button"
            className="shell__icon-button"
            aria-expanded={menuOpen}
            aria-controls="shell-header"
            data-testid="menu-toggle"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "close" : "menu"} />
            <span className="visually-hidden">
              {lookup(menuOpen ? "nav.close" : "nav.menu", locale)}
            </span>
          </button>
        </div>
      ) : null}
      <header id="shell-header" data-testid="shell-header" className="shell__header">
        <h1>SmartBiz BD</h1>
        {signedIn ? (
          <nav aria-label="Primary" data-testid="shell-nav" className="shell__nav">
            {nav.map((n) => (
              <a
                key={n.to}
                href={`#${n.to}`}
                data-testid={`nav-${n.to}`}
                onClick={close}
                {...current(n.to, props.currentPath)}
              >
                <Icon name={n.to} />
                <span>{lookup(n.label, locale)}</span>
              </a>
            ))}
          </nav>
        ) : null}
        <div className="shell__account">
          <div className="shell__locale">
            <label htmlFor="locale-select">{lookup("nav.language", locale)}</label>
            <select
              id="locale-select"
              data-testid="locale-select"
              value={locale}
              onChange={(e) => onLocaleChange(e.target.value as Locale)}
            >
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </div>
          {signedIn ? (
            <div data-testid="user-info" className="shell__user">
              <span className="shell__avatar" aria-hidden="true">
                {user.email.slice(0, 1).toUpperCase()}
              </span>
              <span className="shell__who">
                <span data-testid="user-email">{user.email}</span>
                <span data-testid="user-role" data-role={user.role}>
                  {lookup(ROLE_LABEL[user.role], locale)}
                </span>
              </span>
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={props.signingOut ?? false}
                  data-testid="sign-out"
                >
                  {lookup("auth.sign_out.title", locale)}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      {signedIn && menuOpen ? (
        <button
          type="button"
          className="shell__scrim"
          tabIndex={-1}
          aria-label={lookup("nav.close", locale)}
          onClick={close}
        />
      ) : null}
      {props.toast ? (
        <div data-testid="shell-toast" className="shell__toast">
          {props.toast}
        </div>
      ) : null}
      <main data-testid="shell-main" className="shell__main">
        {children}
      </main>
      {signedIn && tabs.length > 0 ? (
        <nav aria-label="Quick" data-testid="shell-tabbar" className="shell__tabbar">
          {tabs.map((n) => (
            <a
              key={n.to}
              href={`#${n.to}`}
              data-testid={`tab-${n.to}`}
              {...current(n.to, props.currentPath)}
            >
              <Icon name={n.to} />
              <span>{lookup(n.label, locale)}</span>
            </a>
          ))}
          <button
            type="button"
            data-testid="tab-more"
            aria-expanded={menuOpen}
            aria-controls="shell-header"
            {...(elsewhere ? { "data-current": "true" } : {})}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name="more" />
            <span>{lookup("nav.more", locale)}</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
};
