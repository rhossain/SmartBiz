/**
 * src/pres/Shell.tsx — the app chrome: title, navigation, language and the signed-in person
 * (BR8.6; FR4.1, FR2.4; AC5.2a.1).
 *
 * - The header shows the signed-in email and role, from `GET /api/session` — never a
 *   hard-coded address (BR8.6). Signed out, it shows neither, and no navigation.
 * - The navigation lists only the places the role can open, so a role is never offered a
 *   link that ends on the lock screen; the router gate and the server still decide (NFR1.1).
 * - Sign-out is a button that calls the caller's `onSignOut`, which posts to
 *   `/api/auth/sign-out`; it is disabled while that call runs.
 * - No external font is preloaded: the CSP is `default-src 'self'`, and the Bengali font is
 *   self-hosted or taken from the local fallback chain (team.md Code Style "Bengali font
 *   available offline").
 */
import * as React from "react";
import { hasCapability } from "../auth/capability.js";
import type { Capability, Locale, Role } from "../data/enums.js";
import { lookup, type LKey } from "../i18n/L.js";

export interface ShellUser {
  readonly email: string;
  readonly role: Role;
}

export interface ShellProps {
  readonly locale: Locale;
  readonly onLocaleChange: (l: Locale) => void;
  readonly user?: ShellUser | null;
  readonly onSignOut?: () => void;
  readonly signingOut?: boolean;
  readonly children?: React.ReactNode;
}

interface NavEntry {
  readonly to: string;
  readonly label: LKey;
  readonly capability: Capability;
}

/** The places in the header, each with the capability its route requires (src/router/routes.ts). */
const NAV: ReadonlyArray<NavEntry> = [
  { to: "/orders", label: "nav.orders", capability: "business.view" },
  { to: "/daily-card", label: "nav.daily_card", capability: "business.view" },
  { to: "/audit-trail", label: "nav.audit_trail", capability: "audit.view" },
  { to: "/business", label: "nav.business", capability: "business.edit" },
  { to: "/settings", label: "nav.settings", capability: "settings.edit.own" },
];

const ROLE_LABEL: Readonly<Record<Role, LKey>> = {
  owner: "role.owner",
  manager: "role.manager",
  sales_staff: "role.sales_staff",
  accountant: "role.accountant",
};

export const Shell = (props: ShellProps): React.ReactElement => {
  const { locale, onLocaleChange, user, onSignOut, children } = props;
  const signedIn = user !== null && user !== undefined;
  return (
    <div data-testid="shell">
      <header data-testid="shell-header">
        <h1>SmartBiz BD</h1>
        {signedIn ? (
          <nav aria-label="Primary" data-testid="shell-nav">
            {NAV.filter((n) => hasCapability(user.role, n.capability)).map((n) => (
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
      <main data-testid="shell-main">{children}</main>
    </div>
  );
};
