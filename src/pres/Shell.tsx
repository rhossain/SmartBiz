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

export const Shell = (props: ShellProps): React.ReactElement => {
  const { locale, onLocaleChange, user, onSignOut, children } = props;
  const signedIn = user !== null && user !== undefined;
  const nav = props.nav ?? [];
  return (
    <div data-testid="shell" className="shell">
      <header data-testid="shell-header" className="shell__header">
        <h1>SmartBiz BD</h1>
        {signedIn ? (
          <nav aria-label="Primary" data-testid="shell-nav" className="shell__nav">
            {nav.map((n) => (
              <a key={n.to} href={`#${n.to}`} data-testid={`nav-${n.to}`}>
                {lookup(n.label, locale)}
              </a>
            ))}
          </nav>
        ) : null}
        <div>
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
          <div data-testid="user-info">
            <span data-testid="user-email">{user.email}</span>{" "}
            <span data-testid="user-role" data-role={user.role}>
              {lookup(ROLE_LABEL[user.role], locale)}
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
      </header>
      {props.toast ? (
        <div data-testid="shell-toast" className="shell__toast">
          {props.toast}
        </div>
      ) : null}
      <main data-testid="shell-main" className="shell__main">
        {children}
      </main>
    </div>
  );
};
