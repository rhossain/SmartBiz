/**
 * src/catalog/screens/CustomerList.tsx — the customer list, `/customers` (U4 W4; US3.3;
 * BR1.2, BR5.1–BR5.3, BR5.6, BR13.2, BR13.3; AC3.3.1, AC3.3.4; NFR6.30, NFR9.12).
 *
 * - The count tile shows `total`, the customers matching the search (D11), in the reader's
 *   digits (BR5.6).
 * - The search box searches 300 ms after the last key: the name, and the phone once the
 *   query has 4 or more digits; with 1–3 digits it says "নম্বর দিয়ে খুঁজতে কমপক্ষে ৪টি
 *   সংখ্যা লিখুন" (BR5.2). Only the latest search's answer is shown, so a slow early answer
 *   cannot overwrite a later one.
 * - Each row: the name (a link to the customer), the phone in the reader's digits and the
 *   risk chip with its text (BR5.3). "আরও দেখুন" appends the next page; a failed "more"
 *   keeps the loaded rows.
 * - Empty: no customers yet → "এখনো কোনো ক্রেতা নেই" with "প্রথম ক্রেতা যোগ করুন"; a search
 *   with no match → "এই নামে বা নম্বরে কেউ নেই" with "খোঁজ মুছুন". "+ নতুন" and the empty
 *   state's action show only for a role that may record customers (BR1.2).
 * Props only; the catalog client arrives with the route state.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import type { CustomerListResponse } from "../schemas.js";
import { lookup } from "../../i18n/L.js";
import { PhoneText } from "../../pres/PhoneText.js";
import { RiskChip } from "../../pres/RiskChip.js";
import { Screen } from "../../pres/Screen.js";
import { SearchBox } from "../../pres/SearchBox.js";
import { digits, tr } from "../copy.js";
import { digitsHint } from "../rules/phone.js";
import { FormFailure, LoadState } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";
import type { RequestPhase } from "../../pres/ApiState.js";

type Row = CustomerListResponse["customers"][number];

export const CustomerList = ({
  state,
}: {
  readonly state: CatalogRouteState;
}): React.ReactElement => {
  const { locale, api, can } = state;
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState<ReadonlyArray<Row>>([]);
  const [next, setNext] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [phase, setPhase] = React.useState<RequestPhase>("loading");
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [moreFailure, setMoreFailure] = React.useState<ApiFailure | null>(null);
  const [moreBusy, setMoreBusy] = React.useState(false);
  const latest = React.useRef(0);

  const load = React.useCallback(
    async (query: string): Promise<void> => {
      const ticket = (latest.current += 1);
      setPhase("loading");
      setFailure(null);
      setMoreFailure(null);
      const r = await api.customers.list({ q: query });
      if (ticket !== latest.current) return;
      if (!r.ok) {
        setFailure(r);
        setPhase("error");
        return;
      }
      setRows(r.value.customers);
      setNext(r.value.nextCursor);
      setTotal(r.value.total);
      setPhase(r.value.customers.length === 0 ? "empty" : "ready");
    },
    [api],
  );

  React.useEffect(() => {
    void load(q);
  }, [load, q]);

  const more = async (): Promise<void> => {
    if (next === null || moreBusy) return;
    setMoreBusy(true);
    setMoreFailure(null);
    const r = await api.customers.list({ q, cursor: next });
    setMoreBusy(false);
    if (!r.ok) {
      setMoreFailure(r);
      return;
    }
    setRows((old) => [...old, ...r.value.customers]);
    setNext(r.value.nextCursor);
  };

  const title = tr("customers.title", locale);
  const empty =
    q.trim() === "" ? (
      <div data-testid="customers-empty">
        <p>{tr("customers.empty", locale)}</p>
        {can.writeCustomers ? (
          <a href="#/customers/new" data-testid="customers-empty-add">
            {tr("customers.empty_action", locale)}
          </a>
        ) : null}
      </div>
    ) : (
      <div data-testid="customers-no-match">
        <p>{tr("customers.no_match", locale)}</p>
        <button type="button" data-testid="customers-clear" onClick={() => setQ("")}>
          {tr("cat.clear_search", locale)}
        </button>
      </div>
    );

  return (
    <Screen title={title}>
      <div className="cat-head">
        <span className="cat-count" data-testid="customers-total">
          {tr("cat.total", locale)}: {digits(total, locale)}
        </span>
        {can.writeCustomers ? (
          <a href="#/customers/new" data-testid="customers-new">
            {tr("cat.new", locale)}
          </a>
        ) : null}
      </div>
      <SearchBox
        label={tr("customers.search", locale)}
        value={q}
        onSearch={setQ}
        clearLabel={tr("cat.clear_search", locale)}
        hint={digitsHint(q) ? tr("customers.digits_hint", locale) : null}
        testId="customers-search"
      />
      <LoadState
        phase={phase}
        failure={failure}
        locale={locale}
        feature={lookup("feature.customers", locale)}
        homeTo={state.homeTo}
        onRetry={() => void load(q)}
        empty={empty}
      >
        <div className="scroll-x">
          <table className="table table--stack" data-testid="customers-table">
            <thead>
              <tr>
                <th scope="col">{tr("customers.col.name", locale)}</th>
                <th scope="col">{tr("customers.col.phone", locale)}</th>
                <th scope="col">{tr("risk.label", locale)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} data-testid="customer-row" data-customer-id={c.id}>
                  <td>
                    <a href={`#/customers/${c.id}`} data-testid="customer-open">
                      {c.name}
                    </a>
                  </td>
                  <td data-label={tr("customers.col.phone", locale)}>
                    <PhoneText phone={c.phone} locale={locale} testId="customer-phone" />
                  </td>
                  <td data-cell="corner">
                    <RiskChip level={c.riskLevel} locale={locale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FormFailure failure={moreFailure} locale={locale} testId="customers-more-error" />
        {next !== null ? (
          <button
            type="button"
            data-testid="customers-more"
            disabled={moreBusy}
            aria-busy={moreBusy}
            onClick={() => void more()}
          >
            {tr("cat.more", locale)}
          </button>
        ) : null}
      </LoadState>
    </Screen>
  );
};
