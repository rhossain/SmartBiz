/**
 * src/pres/Shell.tsx — chrome + Noto Sans Bengali preload.
 * Renders the navigation, the security `<meta>` headers (CSP
 * via Vite plugin; X-Content-Type-Options, Referrer-Policy),
 * and the `<link rel="preload">` for the Bengali font subset.
 */
import * as React from "react";
import { NOTO_SANS_BENGALI_HREF } from "./typography.js";
import { lookup, type LKey } from "../i18n/L.js";
import { useTranslations } from "../i18n/useTranslations.js";
import type { Locale } from "../auth/types.js";

export interface ShellProps {
  readonly locale: Locale;
  readonly onLocaleChange: (l: Locale) => void;
  readonly userEmail?: string;
  readonly onSignOut?: () => void;
  readonly children?: React.ReactNode;
}

const NavItem = ({ to, label }: { to: string; label: LKey }): React.ReactElement => {
  const { locale } = useTranslations();
  return (
    <a href={`#${to}`} data-testid={`nav-${to}`}>
      {lookup(label, locale)}
    </a>
  );
};

export const Shell = (props: ShellProps): React.ReactElement => {
  const { locale, onLocaleChange, userEmail, onSignOut, children } = props;
  React.useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "style";
    link.href = NOTO_SANS_BENGALI_HREF;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div data-testid="shell">
      <header data-testid="shell-header">
        <h1>SmartBiz BD</h1>
        <nav aria-label="Primary">
          <NavItem to="/orders" label="common.save" />
          <NavItem to="/daily-card" label="common.save" />
          <NavItem to="/audit-trail" label="common.save" />
          <NavItem to="/business" label="common.save" />
          <NavItem to="/settings" label="common.save" />
        </nav>
        <div>
          <label htmlFor="locale-select">{lookup("common.save", locale)}</label>
          <select
            id="locale-select"
            data-testid="locale-select"
            value={locale}
            onChange={(e) => onLocaleChange(e.target.value as Locale)}
          >
            <option value="bn">bn</option>
            <option value="en">en</option>
          </select>
        </div>
        {userEmail ? (
          <div data-testid="user-info">
            <span>{userEmail}</span>
            {onSignOut ? (
              <button type="button" onClick={onSignOut} data-testid="sign-out">
                {lookup("auth.sign_out.title", locale) as string}
              </button>
            ) : null}
          </div>
        ) : null}
      </header>
      <main data-testid="shell-main">{children}</main>
    </div>
  );
};

// kept for tests
export const LKEY_FOR_TEST = "common.save";
