/**
 * src/daily-card/screens/DailyCard.tsx — the Owner's daily card (US3.1; mockups §17.1).
 *
 * Four tiles and a status strip, read from today's orders through the existing `GET /api/orders`
 * (already gated on the server), so no new endpoint or grant is added.
 *
 * - Today's orders: count, and the value of those not cancelled or returned, shown with the
 *   `pipeline` basis (booked, not yet recognised as earned).
 * - Today's income: today's settled orders, basis `realized`, always `partial` because an older
 *   order settled today is not in today's list (D17-1).
 * - Dues and expenses: their sources are not recorded until later Bolts, so they show no amount
 *   and `unknown` completeness, never a fake ৳০ (D17-1).
 *
 * Owner only (US3.1 persona): any other role gets the lock screen and no money element at all,
 * which the absence test asserts (NFR6.6).
 */
import * as React from "react";
import type { ApiResult } from "../../client/http.js";
import type { ListQuery } from "../../client/orders-api.js";
import { now } from "../../data/clock.js";
import { ORDER_STATUSES, type Locale } from "../../data/enums.js";
import { money } from "../../money/money-figure.js";
import type { OrdersPageResponse } from "../../orders/schemas.js";
import type { UnrecognizedFigure } from "../../orders/order-figure.js";
import { BasisPill } from "../../pres/BasisPill.js";
import { CompletenessControl } from "../../pres/CompletenessControl.js";
import { LockScreen } from "../../pres/Lock.js";
import { MoneyCell } from "../../pres/MoneyCell.js";
import { Pill } from "../../pres/Pill.js";
import { Screen } from "../../pres/Screen.js";
import { statusText, statusTone } from "../../pres/status-labels.js";
import { tr } from "../copy.js";
import { dhakaDayBounds, summarizeDay, type DayOrder, type DaySummary } from "../today.js";

export type LoadOrders = (query: ListQuery) => Promise<ApiResult<OrdersPageResponse>>;

export interface DailyCardProps {
  readonly locale: Locale;
  readonly load: LoadOrders;
  readonly isOwner: boolean;
}

/** A day never has more than this many pages of 50 in this build; the cap stops a runaway loop. */
const MAX_PAGES = 20;

type Phase =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | { readonly kind: "ready"; readonly summary: DaySummary; readonly at: Date };

/** Every order created in the Dhaka day containing `at`, across pages. */
export const loadDay = async (load: LoadOrders, at: Date): Promise<DaySummary | null> => {
  const { from, to } = dhakaDayBounds(at);
  const rows: DayOrder[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const r = await load({ from, to, limit: 50, cursor });
    if (!r.ok) return null;
    rows.push(...r.value.orders);
    cursor = r.value.nextCursor;
    if (cursor === null) break;
  }
  return summarizeDay(rows);
};

const dateLine = (at: Date, locale: Locale): string => {
  const tag = locale === "bn" ? "bn-BD" : "en-GB";
  const day = new Intl.DateTimeFormat(tag, {
    timeZone: "Asia/Dhaka",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(at);
  const time = new Intl.DateTimeFormat(tag, {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
  return `${day} · ${tr("daily.updated_at", locale)} ${time}`;
};

/** Booked value of today's orders: `pipeline`, not yet recognised as earned. */
const booked = (paise: number): UnrecognizedFigure => ({
  paise,
  basis: "pipeline",
  completeness: "complete",
});

const count = (n: number, locale: Locale): string =>
  new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-GB").format(n);

const Tile = (props: {
  readonly id: string;
  readonly label: string;
  readonly children: React.ReactNode;
}): React.ReactElement => (
  <section className="day-tile" aria-labelledby={`${props.id}-label`} data-testid={props.id}>
    <h3 id={`${props.id}-label`} className="day-tile__label">
      {props.label}
    </h3>
    {props.children}
  </section>
);

/** A tile whose source is not recorded yet: no amount, `unknown` completeness (D17-1). */
const NotRecordedTile = (props: {
  readonly id: string;
  readonly label: string;
  readonly locale: Locale;
}): React.ReactElement => (
  <Tile id={props.id} label={props.label}>
    <p className="day-tile__figure day-tile__figure--none" aria-hidden="true">
      —
    </p>
    <p className="day-tile__note">{tr("daily.not_recorded", props.locale)}</p>
    <span className="day-tile__pills">
      <BasisPill basis="realized" />
      <CompletenessControl completeness="unknown" />
    </span>
  </Tile>
);

export const DailyCard = ({ locale, load, isOwner }: DailyCardProps): React.ReactElement => {
  const [phase, setPhase] = React.useState<Phase>({ kind: "loading" });
  // The App hands a new `load` function on every render; keeping the latest one in a ref (not
  // in the effect's dependencies) loads once per visit instead of on every render.
  const loadRef = React.useRef(load);
  loadRef.current = load;

  const refresh = React.useCallback(async (): Promise<void> => {
    setPhase({ kind: "loading" });
    const at = now();
    const summary = await loadDay(loadRef.current, at);
    setPhase(summary === null ? { kind: "error" } : { kind: "ready", summary, at });
  }, []);

  React.useEffect(() => {
    if (isOwner) void refresh();
  }, [isOwner, refresh]);

  // US3.1 persona: Owner only. No money element renders for any other role (NFR6.6).
  if (!isOwner) return <LockScreen />;

  return (
    <Screen title={tr("daily.title", locale)}>
      <div className="day-head">
        <p data-testid="daily-date" aria-live="polite">
          {phase.kind === "ready" ? dateLine(phase.at, locale) : tr("daily.loading", locale)}
        </p>
        <button type="button" data-testid="daily-refresh" onClick={() => void refresh()}>
          ↻ {tr("daily.refresh", locale)}
        </button>
      </div>

      {phase.kind === "error" ? (
        <div role="alert" className="banner banner--error" data-testid="daily-error">
          <span className="banner__label">{tr("daily.error", locale)}</span>{" "}
          <button type="button" onClick={() => void refresh()}>
            {tr("daily.retry", locale)}
          </button>
        </div>
      ) : null}

      {phase.kind === "loading" ? (
        <div className="day-tiles" aria-busy="true" data-testid="daily-loading">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="day-tile day-tile--skeleton" />
          ))}
        </div>
      ) : null}

      {phase.kind === "ready" ? (
        <>
          <div className="day-tiles">
            <Tile id="daily-orders" label={tr("daily.orders", locale)}>
              <MoneyCell
                figure={booked(phase.summary.bookedPaise)}
                locale={locale}
                testId="daily-orders-value"
              />
              <p className="day-tile__note">
                {phase.summary.count === 0
                  ? tr("daily.none_today", locale)
                  : `${count(phase.summary.count, locale)}${tr("daily.orders_note", locale)}`}
              </p>
            </Tile>
            <Tile id="daily-income" label={tr("daily.income", locale)}>
              <MoneyCell
                figure={money(phase.summary.realizedPaise, "realized", "partial")}
                locale={locale}
                testId="daily-income-value"
              />
              <p className="day-tile__note">{tr("daily.income_note", locale)}</p>
            </Tile>
            <NotRecordedTile id="daily-dues" label={tr("daily.dues", locale)} locale={locale} />
            <NotRecordedTile
              id="daily-expenses"
              label={tr("daily.expenses", locale)}
              locale={locale}
            />
          </div>

          {phase.summary.count > 0 ? (
            <section className="status-strip" aria-labelledby="daily-strip-label">
              <h3 id="daily-strip-label">{tr("daily.by_status", locale)}</h3>
              <ul data-testid="daily-status-strip">
                {ORDER_STATUSES.filter((s) => phase.summary.byStatus[s] > 0).map((s) => (
                  <li key={s} data-status={s}>
                    <Pill
                      kind={statusTone(s)}
                      label={`${statusText(s, locale)} ${count(phase.summary.byStatus[s], locale)}`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <a href="#/orders" className="day-link" data-testid="daily-all-orders">
            {tr("daily.all_orders", locale)}
          </a>
        </>
      ) : null}
    </Screen>
  );
};

export interface DailyRouteState {
  readonly kind: "daily";
  readonly locale: Locale;
  readonly load: LoadOrders;
  readonly isOwner: boolean;
}

export const isDailyRouteState = (state: unknown): state is DailyRouteState =>
  typeof state === "object" && state !== null && (state as { kind?: unknown }).kind === "daily";

export const renderDailyCard = (state: unknown): React.ReactElement | null =>
  isDailyRouteState(state) ? (
    <DailyCard locale={state.locale} load={state.load} isOwner={state.isOwner} />
  ) : null;
