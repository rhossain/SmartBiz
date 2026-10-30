/**
 * src/router/render-business-route.tsx — the containers of `/business` and `/settings`
 * (mockups §17.2, §17.3). The screens take props only and may not import the client (BR7.4);
 * these containers own the calls:
 *   - `/business` loads `GET /api/business` on mount (nothing cached), passes the phase to the
 *     screen, and saves with `PATCH /api/business`; a save replaces the shown values with the
 *     server's answer, never an optimistic copy;
 *   - `/settings` saves the person's language with `PATCH /api/me/locale` and, only when the
 *     server confirms it, switches the app's language.
 * `/business` is gated by `business.edit` (Owner), `/settings` by `settings.edit.own`; a role
 * the gate refuses meets the lock screen before these mount and sends no request.
 */
import * as React from "react";
import type { BusinessResponse } from "../auth/schemas.js";
import type { BusinessApi } from "../client/business-api.js";
import type { ApiFailure } from "../client/http.js";
import type { Locale, Role } from "../data/enums.js";
import type { RequestPhase } from "../pres/ApiState.js";
import { BusinessScreen } from "./screens/Business.js";
import { SettingsScreen } from "./screens/Settings.js";

export interface BusinessRouteState {
  readonly kind: "business";
  readonly locale: Locale;
  readonly business: BusinessApi;
}

export interface SettingsRouteState {
  readonly kind: "settings";
  readonly locale: Locale;
  readonly business: BusinessApi;
  readonly email: string;
  readonly role: Role;
  /** Switches the app's language once the server has saved it. */
  readonly applyLocale: (locale: Locale) => void;
}

const isKind = <K extends string>(state: unknown, kind: K): boolean =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === kind;

const BusinessRoute = ({ state }: { readonly state: BusinessRouteState }): React.ReactElement => {
  const { business } = state;
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [saved, setSaved] = React.useState<BusinessResponse | null>(null);

  const load = React.useCallback(async (): Promise<void> => {
    setPhase("loading");
    setFailure(null);
    const r = await business.get();
    if (!r.ok) {
      setFailure(r);
      setPhase("error");
      return;
    }
    setSaved(r.value);
    setPhase("ready");
  }, [business]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <BusinessScreen
      locale={state.locale}
      phase={phase}
      failure={failure}
      saved={saved}
      onRetry={() => void load()}
      onSave={async (patch) => {
        const r = await business.update(patch);
        if (!r.ok) return r;
        setSaved(r.value);
        return null;
      }}
    />
  );
};

export const renderBusinessRoute = (state: unknown): React.ReactElement | null =>
  isKind(state, "business") ? <BusinessRoute state={state as BusinessRouteState} /> : null;

export const renderSettingsRoute = (state: unknown): React.ReactElement | null => {
  if (!isKind(state, "settings")) return null;
  const s = state as SettingsRouteState;
  return (
    <SettingsScreen
      locale={s.locale}
      email={s.email}
      role={s.role}
      onLanguage={async (next) => {
        const r = await s.business.setMyLocale(next);
        if (!r.ok) return r;
        s.applyLocale(r.value.locale);
        return null;
      }}
    />
  );
};
