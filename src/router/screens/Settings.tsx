/**
 * src/router/screens/Settings.tsx — the Settings page, `/settings` (mockups §17.3; US1.5
 * AC1.5.2). Props only: the container (src/router/render-settings-route.tsx) owns the client
 * call, so this screen imports no client module (BR7.4).
 *
 * "My settings", for every signed-in role (`settings.edit.own`):
 *   - my language as a radio group that saves on change (the header switch follows) and shows
 *     "ভাষা বদলানো হয়েছে"; a failed save keeps the previous choice and shows the banner;
 *   - my email and role, read-only;
 *   - "পাসওয়ার্ড বদলান" opens the existing password reset flow (`#/recover`).
 * The mockup's Owner-only "business switches" (AI assistant, debug screen) are left out on the
 * Owner's "decide for me" (2026-10-30): neither feature exists yet, so a switch would do
 * nothing. They join this page when those features are built.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import type { Locale, Role } from "../../data/enums.js";
import { L, lookup, type LKey } from "../../i18n/L.js";
import { ErrorBanner } from "../../pres/ApiState.js";
import { Screen } from "../../pres/Screen.js";

const COPY = {
  panel: L("আমার সেটিংস", "My settings"),
  language: L("আমার ভাষা", "My language"),
  languageHint: L("এই ভাষায় আপনার স্ক্রিন খুলবে", "Your screens open in this language"),
  email: L("ইমেইল", "Email"),
  password: L("পাসওয়ার্ড", "Password"),
  changePassword: L("পাসওয়ার্ড বদলান", "Change password"),
  changed: L("ভাষা বদলানো হয়েছে", "Language changed"),
} as const;

const t = (key: keyof typeof COPY, locale: Locale): string =>
  locale === "bn" ? COPY[key].bn : COPY[key].en;

const ROLE_LABEL: Readonly<Record<Role, LKey>> = {
  owner: "role.owner",
  manager: "role.manager",
  sales_staff: "role.sales_staff",
  accountant: "role.accountant",
};

export interface SettingsScreenProps {
  readonly locale: Locale;
  readonly email: string;
  readonly role: Role;
  /** Resolves to null on success, or the refusal to show. */
  readonly onLanguage: (next: Locale) => Promise<ApiFailure | null>;
}

export const SettingsScreen = (props: SettingsScreenProps): React.ReactElement => {
  const { locale } = props;
  const [saving, setSaving] = React.useState(false);
  const [refusal, setRefusal] = React.useState<ApiFailure | null>(null);
  const [notice, setNotice] = React.useState(false);

  const choose = async (next: Locale): Promise<void> => {
    if (next === locale || saving) return;
    setSaving(true);
    setRefusal(null);
    setNotice(false);
    const r = await props.onLanguage(next);
    setSaving(false);
    if (r === null) setNotice(true);
    else setRefusal(r);
  };

  return (
    <Screen title={lookup("feature.settings", locale)}>
      <section
        className="settings-panel"
        data-testid="settings-mine"
        aria-labelledby="settings-mine-title"
      >
        <h3 id="settings-mine-title">{t("panel", locale)}</h3>
        <fieldset data-testid="settings-language">
          <legend>{t("language", locale)}</legend>
          {(["bn", "en"] as const).map((l) => (
            <label key={l}>
              <input
                type="radio"
                name="settings-language"
                value={l}
                data-testid={`settings-language-${l}`}
                checked={locale === l}
                disabled={saving}
                onChange={() => void choose(l)}
              />
              {l === "bn" ? "বাংলা" : "English"}
            </label>
          ))}
          <p>{t("languageHint", locale)}</p>
        </fieldset>
        <dl>
          <dt>{t("email", locale)}</dt>
          <dd data-testid="settings-email">
            {props.email}{" "}
            <span data-testid="settings-role">({lookup(ROLE_LABEL[props.role], locale)})</span>
          </dd>
          <dt>{t("password", locale)}</dt>
          <dd>
            <a href="#/recover" data-testid="settings-change-password">
              {t("changePassword", locale)}
            </a>
          </dd>
        </dl>
        {refusal ? (
          <ErrorBanner kind={refusal.kind} locale={locale} correlationId={refusal.correlationId} />
        ) : null}
        {notice ? (
          <p role="status" data-testid="settings-saved" className="banner banner--success">
            {t("changed", locale)}
          </p>
        ) : null}
      </section>
    </Screen>
  );
};
