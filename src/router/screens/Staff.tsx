/**
 * src/router/screens/Staff.tsx — the staff screen, `/staff` (U3 W1, W3, W7; BR9.1, BR9.2,
 * BR2.5; NFR9.10, NFR9.11; frontend-components "StaffScreen"; review D-02).
 *
 * Props only (D-02, BR7.4): the container (src/router/render-staff-route.tsx) owns the staff
 * client and hands this screen the list, the phase of its load, the two write callbacks and
 * the link sheet's content. The screen imports no client, auth or router module, so it can
 * neither call the API nor decide permissions:
 *   - the members table (email · role · active) shows a "রিসেট লিংক" button ONLY where the
 *     server said `canReset` (BR1.3), and the invite form's role select lists ONLY the
 *     server's `invitableRoles` (BR1.2) — both computed on the server from the delegation
 *     matrix (S20), so the screen cannot offer what the server would refuse;
 *   - the pending invitations table (email · role · expiry);
 *   - after a 201 the container passes the link and the LinkSheet shows it once (BR9.2);
 *   - a 409 on invite says "এই ইমেইল আগে থেকেই আছে"; a bad email is a message under the
 *     field; every other refusal uses the shared error copy;
 *   - both tables sit in `.scroll-x`, so the page never scrolls sideways at 360 px (NFR9.10);
 *   - loading, a 403 (the inline lock naming the feature) and every other error come from
 *     ApiState (U2), as on the other screens.
 */
import * as React from "react";
import type { InviteRequest, StaffListResponse } from "../../auth/schemas.js";
import type { ApiFailure } from "../../client/http.js";
import type { Locale, Role } from "../../data/enums.js";
import { errorMessage, fieldMessage } from "../../i18n/error-copy.js";
import { lookup, type LKey } from "../../i18n/L.js";
import { ApiState, type RequestPhase } from "../../pres/ApiState.js";
import { Field } from "../../pres/Field.js";
import { LinkSheet } from "../../pres/LinkSheet.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { shownExpiry } from "../../pres/LinkSheet.js";

export interface ShownLink {
  readonly link: string;
  readonly expiresAt: string;
}

export interface StaffScreenProps {
  readonly locale: Locale;
  readonly phase: RequestPhase;
  readonly failure: ApiFailure | null;
  readonly list: StaffListResponse | null;
  readonly homeTo?: string | null;
  readonly onRetry: () => void;
  /** Resolves to null on success (the container opens the sheet), or the refusal. */
  readonly onInvite: (input: InviteRequest) => Promise<ApiFailure | null>;
  readonly onResetLink: (userId: string) => Promise<ApiFailure | null>;
  readonly sheet: ShownLink | null;
  readonly onCloseSheet: () => void;
}

const roleLabel = (role: Role, locale: Locale): string => lookup(`role.${role}` as LKey, locale);

/** What a refused invite or reset link says, in the person's language. */
const refusalText = (f: ApiFailure, locale: Locale): string =>
  f.kind === "conflict"
    ? lookup("staff.invite.exists", locale)
    : errorMessage(f.kind, locale, {
        correlationId: f.correlationId,
        retryAfterMinutes: f.retryAfterMinutes,
      });

const InviteForm = ({
  locale,
  roles,
  onInvite,
}: {
  readonly locale: Locale;
  readonly roles: StaffListResponse["invitableRoles"];
  readonly onInvite: StaffScreenProps["onInvite"];
}): React.ReactElement => {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState(roles[0] ?? "sales_staff");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const guard = useSubmitGuard();
  const emailError =
    failure !== null && failure.fields.some((f) => f.path === "email")
      ? fieldMessage(failure.kind, locale)
      : null;

  const submit = (): void => {
    void guard.submit(async () => {
      setFailure(null);
      const refused = await onInvite({ email, role });
      setFailure(refused);
      if (refused === null) setEmail("");
      return refused === null;
    });
  };

  return (
    <form
      data-testid="staff-invite-form"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3>{lookup("staff.invite.title", locale)}</h3>
      <Field
        label={lookup("auth.email", locale)}
        name="invite-email"
        type="email"
        value={email}
        onChange={(v) => {
          setEmail(v);
          guard.reset();
        }}
        error={emailError}
        required
      />
      <div className="field">
        <label htmlFor="field-invite-role">{lookup("staff.col.role", locale)}</label>
        <select
          id="field-invite-role"
          data-testid="field-invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {roleLabel(r, locale)}
            </option>
          ))}
        </select>
      </div>
      {failure !== null && emailError === null ? (
        <p role="alert" tabIndex={-1} data-testid="staff-invite-error" data-kind={failure.kind}>
          {refusalText(failure, locale)}
        </p>
      ) : null}
      <button
        type="submit"
        data-testid="staff-invite-submit"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {lookup("staff.invite.submit", locale)}
      </button>
    </form>
  );
};

export const StaffScreen = (props: StaffScreenProps): React.ReactElement => {
  const { locale, list } = props;
  const [resetFailure, setResetFailure] = React.useState<ApiFailure | null>(null);
  const title = lookup("feature.staff", locale);

  const resetLink = (userId: string): void => {
    void (async () => {
      setResetFailure(null);
      setResetFailure(await props.onResetLink(userId));
    })();
  };

  return (
    <Screen title={title}>
      <ApiState
        phase={props.phase}
        locale={locale}
        errorKind={props.failure?.kind ?? null}
        correlationId={props.failure?.correlationId ?? null}
        retryAfterMinutes={props.failure?.retryAfterMinutes ?? null}
        onRetry={props.onRetry}
        read
        feature={title}
        homeTo={props.homeTo ?? null}
      >
        {props.sheet !== null ? (
          <LinkSheet
            link={props.sheet.link}
            expiresAt={props.sheet.expiresAt}
            onClose={props.onCloseSheet}
            locale={locale}
          />
        ) : null}
        {list !== null && list.truncated ? (
          <p data-testid="staff-truncated">{lookup("staff.truncated", locale)}</p>
        ) : null}
        <h3>{lookup("staff.members", locale)}</h3>
        {resetFailure !== null ? (
          <p
            role="alert"
            tabIndex={-1}
            data-testid="staff-reset-error"
            data-kind={resetFailure.kind}
          >
            {refusalText(resetFailure, locale)}
          </p>
        ) : null}
        <div className="scroll-x">
          <table data-testid="staff-members" className="table">
            <thead>
              <tr>
                <th scope="col">{lookup("staff.col.email", locale)}</th>
                <th scope="col">{lookup("staff.col.role", locale)}</th>
                <th scope="col">{lookup("staff.col.active", locale)}</th>
                <th scope="col">{lookup("staff.reset_link", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {(list?.members ?? []).map((m) => (
                <tr key={m.id} data-testid="staff-member" data-member-id={m.id}>
                  <td>{m.email}</td>
                  <td>{roleLabel(m.role, locale)}</td>
                  <td>{lookup(m.active ? "staff.active" : "staff.inactive", locale)}</td>
                  <td>
                    {m.canReset ? (
                      <button
                        type="button"
                        data-testid={`staff-reset-${m.id}`}
                        onClick={() => resetLink(m.id)}
                      >
                        {lookup("staff.reset_link", locale)}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>{lookup("staff.invitations", locale)}</h3>
        {(list?.invitations ?? []).length === 0 ? (
          <p data-testid="staff-no-invitations">{lookup("staff.no_invitations", locale)}</p>
        ) : (
          <div className="scroll-x">
            <table data-testid="staff-invitations" className="table">
              <thead>
                <tr>
                  <th scope="col">{lookup("staff.col.email", locale)}</th>
                  <th scope="col">{lookup("staff.col.role", locale)}</th>
                  <th scope="col">{lookup("staff.col.expires", locale)}</th>
                </tr>
              </thead>
              <tbody>
                {(list?.invitations ?? []).map((i) => (
                  <tr key={i.id} data-testid="staff-invitation">
                    <td>{i.email}</td>
                    <td>{roleLabel(i.role, locale)}</td>
                    <td>{shownExpiry(i.expiresAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list !== null && list.invitableRoles.length > 0 ? (
          <InviteForm locale={locale} roles={list.invitableRoles} onInvite={props.onInvite} />
        ) : null}
      </ApiState>
    </Screen>
  );
};
