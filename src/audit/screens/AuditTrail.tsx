/**
 * src/audit/screens/AuditTrail.tsx — the audit trail screen, `/audit-trail` (W4; BR7.5;
 * O10, P13, P14; NFR8.10, NFR9.5; frontend-components "AuditTrail").
 *
 * - Heading "অডিট ট্রেইল". One row per entry: the action's label (the raw action name when
 *   the catalogue has no label), the time in Bangla digits, the actor's email or "সিস্টেম"
 *   for a row with no actor, the subject (kind and short id), and the correlation id in a
 *   monospace cell, so the Owner can match a row to its log line (O10).
 * - It loads the first page on mount; "আরও দেখুন" appears while `nextCursor` is not null and
 *   APPENDS the next page in component state only (P13: nothing cached). If that call fails,
 *   the rows already loaded stay, the error shows beside them, and its retry asks for the
 *   SAME cursor again (review G-05). Every request here is a read (G-06).
 * - `ApiState` shows loading (after 300 ms), the empty state "এখনো কোনো এন্ট্রি নেই" and
 *   every error view; a 403 shows the lock screen inside the Shell (BR4.2), a failed read
 *   offers retry (BR5.3).
 * - The wide table scrolls inside its own `.scroll-x` box, never the page (BR9.1).
 * A feature screen: data and callbacks arrive as props (BR7.4); the HTTP call is App's
 * (src/client/audit-api.ts), imported here only as a type.
 */
import * as React from "react";
import type { ApiFailure, ApiResult } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { bnDigits } from "../../i18n/bnDigits.js";
import { hasKey, lookup, type LKey } from "../../i18n/L.js";
import { intlCode } from "../../i18n/locale.js";
import { ApiState, type RequestPhase } from "../../pres/ApiState.js";
import { Screen } from "../../pres/Screen.js";
import type { AuditEntryResponse, AuditPageResponse } from "../schemas.js";

export interface AuditTrailProps {
  readonly locale: Locale;
  readonly load: (cursor: string | null) => Promise<ApiResult<AuditPageResponse>>;
  readonly homeTo?: string | null;
}

export interface AuditRouteState extends AuditTrailProps {
  readonly kind: "audit";
}

/** The action's label in the catalogue, or the raw action name (W4 step 5). */
export const actionLabel = (action: string, locale: Locale): string => {
  const key = `audit.action.${action}`;
  return hasKey(key) ? lookup(key as LKey, locale) : action;
};

/** An ISO time as the person reads it: local date and time, Bangla digits in Bangla. */
export const shownTime = (iso: string, locale: Locale): string => {
  const text = new Date(iso).toLocaleString(intlCode(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    numberingSystem: "latn",
  });
  return locale === "bn" ? bnDigits(text) : text;
};

const shortId = (id: string | null): string => (id === null ? "" : id.slice(0, 8));

const Row = ({ entry, locale }: { entry: AuditEntryResponse; locale: Locale }) => (
  <tr data-testid="audit-row" data-entry-id={entry.id}>
    <td data-testid="audit-action">{actionLabel(entry.action, locale)}</td>
    <td data-testid="audit-time">{shownTime(entry.occurredAt, locale)}</td>
    <td data-testid="audit-actor">{entry.actorEmail ?? lookup("audit.system", locale)}</td>
    <td data-testid="audit-subject">
      {entry.subjectKind ?? ""} {shortId(entry.subjectId)}
    </td>
    <td data-testid="audit-correlation" className="mono">
      {entry.correlationId}
    </td>
  </tr>
);

export const AuditTrail = ({
  locale,
  load,
  homeTo = null,
}: AuditTrailProps): React.ReactElement => {
  const [entries, setEntries] = React.useState<ReadonlyArray<AuditEntryResponse>>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [moreBusy, setMoreBusy] = React.useState(false);
  // G-05: a failed "আরও দেখুন" keeps the rows; its error shows beside them.
  const [moreFailure, setMoreFailure] = React.useState<ApiFailure | null>(null);

  const first = React.useCallback(async (): Promise<void> => {
    setPhase("loading");
    setFailure(null);
    const r = await load(null);
    if (!r.ok) {
      setFailure(r);
      setPhase("error");
      return;
    }
    setEntries(r.value.entries);
    setNextCursor(r.value.nextCursor);
    setPhase(r.value.entries.length === 0 ? "empty" : "ready");
  }, [load]);

  React.useEffect(() => {
    void first();
  }, [first]);

  const more = async (): Promise<void> => {
    if (nextCursor === null || moreBusy) return;
    setMoreBusy(true);
    setMoreFailure(null);
    const r = await load(nextCursor);
    setMoreBusy(false);
    if (!r.ok) {
      // G-05: keep the loaded rows and the cursor; retry asks for the same page again.
      setMoreFailure(r);
      return;
    }
    setEntries((rows) => [...rows, ...r.value.entries]);
    setNextCursor(r.value.nextCursor);
  };

  const title = lookup("feature.audit_trail", locale);
  return (
    <Screen title={title}>
      <ApiState
        phase={phase}
        locale={locale}
        errorKind={failure?.kind ?? null}
        correlationId={failure?.correlationId ?? null}
        retryAfterMinutes={failure?.retryAfterMinutes ?? null}
        onRetry={() => void first()}
        read
        feature={title}
        homeTo={homeTo}
        empty={<p data-testid="audit-empty">{lookup("audit.empty", locale)}</p>}
      >
        <div className="scroll-x">
          <table data-testid="audit-trail" className="table">
            <thead>
              <tr>
                <th scope="col">{lookup("audit.col.action", locale)}</th>
                <th scope="col">{lookup("audit.col.time", locale)}</th>
                <th scope="col">{lookup("audit.col.actor", locale)}</th>
                <th scope="col">{lookup("audit.col.subject", locale)}</th>
                <th scope="col">{lookup("audit.col.correlation", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <Row key={e.id} entry={e} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
        {moreFailure !== null ? (
          <div data-testid="audit-more-error">
            <ApiState
              phase="error"
              locale={locale}
              errorKind={moreFailure.kind}
              correlationId={moreFailure.correlationId}
              retryAfterMinutes={moreFailure.retryAfterMinutes}
              onRetry={() => void more()}
              read
              feature={title}
              homeTo={homeTo}
            />
          </div>
        ) : null}
        {nextCursor !== null && moreFailure === null ? (
          <button
            type="button"
            data-testid="audit-more"
            disabled={moreBusy}
            aria-busy={moreBusy}
            onClick={() => void more()}
          >
            {lookup("audit.more", locale)}
          </button>
        ) : null}
      </ApiState>
    </Screen>
  );
};

export const isAuditRouteState = (state: unknown): state is AuditRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "audit";

/** The `/audit-trail` route's render: nothing from foreign state (as the order routes do). */
export const renderAuditTrail = (state: unknown): React.ReactElement | null =>
  isAuditRouteState(state) ? (
    <AuditTrail locale={state.locale} load={state.load} homeTo={state.homeTo ?? null} />
  ) : null;
