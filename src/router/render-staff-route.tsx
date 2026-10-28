/**
 * src/router/render-staff-route.tsx — the container of `/staff` (U3 W1, W3, W7; BR2.5, BR9.1,
 * BR9.2; P15; review D-02).
 *
 * The staff screen (src/router/screens/Staff.tsx) takes props only and may not import the
 * client (BR7.4); this container, outside `screens/`, owns the staff client calls:
 *   - on mount it loads `GET /api/staff` (one request; nothing cached, P13) and passes the
 *     phase — loading, ready or the failure — to the screen, whose ApiState shows it;
 *   - an invitation or a reset link that succeeds (201) opens the LinkSheet with the link the
 *     server returned once; closing the sheet drops it from memory for good (BR9.2). After an
 *     invitation the list is read again, so the new pending row appears;
 *   - a refused write is handed back to the screen to show (403, 409, 400, 503).
 * The route is gated by `staff.invite`, so Sales Staff and Accountants see the lock screen
 * before this container mounts and no staff request is sent for them (BR1.1, U2 D-04).
 */
import * as React from "react";
import type { InviteRequest, StaffListResponse } from "../auth/schemas.js";
import type { ApiFailure } from "../client/http.js";
import type { StaffApi } from "../client/staff-api.js";
import type { Locale } from "../data/enums.js";
import type { RequestPhase } from "../pres/ApiState.js";
import { StaffScreen, type ShownLink } from "./screens/Staff.js";

export interface StaffRouteState {
  readonly kind: "staff";
  readonly locale: Locale;
  readonly staff: StaffApi;
  readonly homeTo: string | null;
}

export const isStaffRouteState = (state: unknown): state is StaffRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "staff";

const StaffRoute = ({ state }: { readonly state: StaffRouteState }): React.ReactElement => {
  const { staff } = state;
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [list, setList] = React.useState<StaffListResponse | null>(null);
  const [sheet, setSheet] = React.useState<ShownLink | null>(null);

  const load = React.useCallback(async (): Promise<void> => {
    setPhase("loading");
    setFailure(null);
    const r = await staff.list();
    if (!r.ok) {
      setFailure(r);
      setPhase("error");
      return;
    }
    setList(r.value);
    setPhase("ready");
  }, [staff]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onInvite = async (input: InviteRequest): Promise<ApiFailure | null> => {
    const r = await staff.invite(input);
    if (!r.ok) return r;
    setSheet({ link: r.value.link, expiresAt: r.value.invitation.expiresAt });
    const again = await staff.list();
    if (again.ok) setList(again.value);
    return null;
  };

  const onResetLink = async (userId: string): Promise<ApiFailure | null> => {
    const r = await staff.resetLink(userId);
    if (!r.ok) return r;
    setSheet({ link: r.value.link, expiresAt: r.value.expiresAt });
    return null;
  };

  return (
    <StaffScreen
      locale={state.locale}
      phase={phase}
      failure={failure}
      list={list}
      homeTo={state.homeTo}
      onRetry={() => void load()}
      onInvite={onInvite}
      onResetLink={onResetLink}
      sheet={sheet}
      onCloseSheet={() => setSheet(null)}
    />
  );
};

/** The `/staff` route's render: nothing from foreign state (as the other routes do). */
export const renderStaffRoute = (state: unknown): React.ReactElement | null =>
  isStaffRouteState(state) ? <StaffRoute state={state} /> : null;
