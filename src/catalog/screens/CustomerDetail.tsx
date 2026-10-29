/**
 * src/catalog/screens/CustomerDetail.tsx — one customer, `/customers/:id` (U4 W3, W4; US3.2,
 * US3.3; BR3.3, BR4.1–BR4.4, BR5.3–BR5.6, BR13.3; AC3.2.1, AC3.2.2, AC3.3.2–AC3.3.5).
 *
 * - The heading is the customer's name, with the back link to the list. Right after a save
 *   the toast shows (App), and when the server named a customer with the same phone the
 *   warning "এই নম্বরে আগে থেকেই আছেন: <name> →" links to that customer (BR3.3).
 * - Profile: the phone in the reader's digits with "কল করুন", the address, the risk chip,
 *   "সম্পাদনা" and "নতুন অর্ডার" for a role that may write (BR1.2).
 * - "লেনদেন ও বাকি" says "এখনো চালু হয়নি" — no amount, no digit, never ৳০ (BR5.5).
 * - Notes (BR4.4): every note no other note revises, newest first, each with the chain of
 *   earlier versions under it labelled "আগের নোট". A writer can add a note or revise the
 *   latest version of one; a revision is a new note (BR4.2), and "already revised" (409)
 *   says "এই নোট আগেই সংশোধন হয়েছে — পাতাটি আবার খুলুন" (BR4.3). Past 200 notes the screen
 *   says only the newest 200 are shown. Text is rendered as React text, so markup typed in a
 *   note is shown as characters, never run (S32).
 * - Order history (BR5.4): each order's number (a link), status and the pill of its status
 *   bucket — earned, realized, pipeline or no sale; with none, "এখনো অর্ডার নেই". The rows
 *   come from `GET /api/orders?customerId=` through App; until U5 links orders to customers,
 *   the empty state is what shows (AC3.3.2's rows are verified in U5).
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { lookup } from "../../i18n/L.js";
import { BasisPill } from "../../pres/BasisPill.js";
import { PhoneText } from "../../pres/PhoneText.js";
import { Pill } from "../../pres/Pill.js";
import { RiskChip } from "../../pres/RiskChip.js";
import { Screen } from "../../pres/Screen.js";
import { statusText, statusTone } from "../../pres/status-labels.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { shownDate, tr } from "../copy.js";
import type { CustomerDetailResponse, NoteResponse } from "../schemas.js";
import type { HistoryOrder } from "../types.js";
import { FormFailure, LoadState, useLoad } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

/** BR4.4: the latest version of each note, newest first, each with its earlier versions. */
export const noteChains = (
  notes: ReadonlyArray<NoteResponse>,
): ReadonlyArray<{
  readonly latest: NoteResponse;
  readonly earlier: ReadonlyArray<NoteResponse>;
}> => {
  const byId = new Map(notes.map((n) => [n.id, n]));
  const revised = new Set(
    notes.flatMap((n) => (n.revisesNoteId === null ? [] : [n.revisesNoteId])),
  );
  return notes
    .filter((n) => !revised.has(n.id))
    .map((latest) => {
      const earlier: NoteResponse[] = [];
      let at = latest.revisesNoteId === null ? undefined : byId.get(latest.revisesNoteId);
      while (at !== undefined && earlier.length < notes.length) {
        earlier.push(at);
        at = at.revisesNoteId === null ? undefined : byId.get(at.revisesNoteId);
      }
      return { latest, earlier };
    });
};

const NoteEditor = ({
  locale,
  initial,
  submitLabel,
  onSave,
  testId,
}: {
  readonly locale: Locale;
  readonly initial: string;
  readonly submitLabel: string;
  readonly onSave: (text: string) => Promise<ApiFailure | null>;
  readonly testId: string;
}): React.ReactElement => {
  const [text, setText] = React.useState(initial);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const guard = useSubmitGuard();
  return (
    <form
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault();
        void guard.submit(async () => {
          const refused = await onSave(text);
          setFailure(refused);
          if (refused === null) setText("");
          return refused === null;
        });
      }}
    >
      <label htmlFor={`${testId}-text`}>{tr("customer.note_text", locale)}</label>
      <textarea
        id={`${testId}-text`}
        data-testid={`${testId}-text`}
        rows={3}
        maxLength={2000}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          guard.reset();
        }}
      />
      <FormFailure
        failure={failure}
        locale={locale}
        testId={`${testId}-error`}
        text={failure?.kind === "conflict" ? tr("customer.note_conflict", locale) : null}
      />
      <button
        type="submit"
        data-testid={`${testId}-save`}
        disabled={guard.state === "saving" || text.trim() === ""}
        aria-busy={guard.state === "saving"}
      >
        {submitLabel}
      </button>
    </form>
  );
};

const bucketPill = (bucket: HistoryOrder["bucket"], locale: Locale): React.ReactElement =>
  bucket === "earned" || bucket === "realized" ? (
    <BasisPill basis={bucket} />
  ) : (
    <Pill
      kind="neutral"
      label={tr(bucket === "pipeline" ? "bucket.pipeline" : "bucket.none", locale)}
    />
  );

const History = ({
  state,
  customerId,
}: {
  readonly state: CatalogRouteState;
  readonly customerId: string;
}): React.ReactElement => {
  const { locale } = state;
  const load = React.useCallback(() => state.customerOrders(customerId), [state, customerId]);
  const orders = useLoad(load, (rows) => rows.length === 0);
  return (
    <section data-testid="customer-orders" aria-labelledby="customer-orders-title">
      <h3 id="customer-orders-title">{tr("customer.orders", locale)}</h3>
      <LoadState
        phase={orders.phase}
        failure={orders.failure}
        locale={locale}
        feature={lookup("feature.orders", locale)}
        homeTo={state.homeTo}
        onRetry={orders.reload}
        empty={<p data-testid="customer-orders-empty">{tr("customer.orders_empty", locale)}</p>}
      >
        <ul data-testid="customer-order-list">
          {(orders.value ?? []).map((o) => (
            <li key={o.id} data-testid="customer-order" data-bucket={o.bucket}>
              <a href={`#/orders/${o.id}`}>{o.orderNo}</a>{" "}
              <Pill kind={statusTone(o.status)} label={statusText(o.status, locale)} />{" "}
              {bucketPill(o.bucket, locale)}
            </li>
          ))}
        </ul>
      </LoadState>
    </section>
  );
};

const Notes = ({
  state,
  customer,
  onAdded,
}: {
  readonly state: CatalogRouteState;
  readonly customer: CustomerDetailResponse;
  readonly onAdded: (note: NoteResponse) => void;
}): React.ReactElement => {
  const { locale, api, can } = state;
  const [revising, setRevising] = React.useState<string | null>(null);
  const chains = noteChains(customer.notes);
  const save = async (text: string, revisesNoteId: string | null): Promise<ApiFailure | null> => {
    const r = await api.customers.addNote(customer.id, { text, revisesNoteId });
    if (!r.ok) return r;
    onAdded(r.value.note);
    setRevising(null);
    return null;
  };
  return (
    <section data-testid="customer-notes" aria-labelledby="customer-notes-title">
      <h3 id="customer-notes-title">{tr("customer.notes", locale)}</h3>
      {customer.notesTruncated ? (
        <p data-testid="customer-notes-truncated">{tr("customer.notes_truncated", locale)}</p>
      ) : null}
      {chains.length === 0 ? (
        <p data-testid="customer-notes-empty">{tr("customer.notes_empty", locale)}</p>
      ) : (
        <ul className="note-list">
          {chains.map(({ latest, earlier }) => (
            <li key={latest.id} data-testid="customer-note" data-note-id={latest.id}>
              <p className="note-text" data-testid="customer-note-text">
                {latest.text}
              </p>
              <p className="note-meta">
                {latest.authorName ?? ""} · {shownDate(latest.createdAt, locale)}
              </p>
              {can.writeCustomers && revising !== latest.id ? (
                <button
                  type="button"
                  data-testid="customer-note-revise"
                  onClick={() => setRevising(latest.id)}
                >
                  {tr("customer.note_revise", locale)}
                </button>
              ) : null}
              {revising === latest.id ? (
                <NoteEditor
                  locale={locale}
                  initial={latest.text}
                  submitLabel={tr("cat.save", locale)}
                  onSave={(text) => save(text, latest.id)}
                  testId="customer-note-revision"
                />
              ) : null}
              {earlier.map((n) => (
                <div key={n.id} className="note-earlier" data-testid="customer-note-earlier">
                  <strong>{tr("customer.note_earlier", locale)}</strong>
                  <p className="note-text">{n.text}</p>
                  <p className="note-meta">{shownDate(n.createdAt, locale)}</p>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
      {can.writeCustomers ? (
        <NoteEditor
          locale={locale}
          initial=""
          submitLabel={tr("customer.note_add", locale)}
          onSave={(text) => save(text, null)}
          testId="customer-note-new"
        />
      ) : null}
    </section>
  );
};

export const CustomerDetail = ({
  state,
  id,
}: {
  readonly state: CatalogRouteState;
  readonly id: string;
}): React.ReactElement => {
  const { locale, can } = state;
  const load = React.useCallback(() => state.api.customers.get(id), [state.api, id]);
  const loaded = useLoad(load);
  const customer = loaded.value;
  const title = customer?.name ?? tr("customers.title", locale);
  return (
    <Screen title={title} back={{ href: "#/customers", label: tr("cat.back.customers", locale) }}>
      {state.duplicateOf !== null && state.duplicateOf.id !== id ? (
        <p className="cat-warning" data-testid="customer-duplicate" role="status">
          {tr("customer.duplicate", locale)}{" "}
          <a href={`#/customers/${state.duplicateOf.id}`} data-testid="customer-duplicate-link">
            {state.duplicateOf.name} →
          </a>
        </p>
      ) : null}
      <LoadState
        phase={loaded.phase}
        failure={loaded.failure}
        locale={locale}
        feature={lookup("feature.customers", locale)}
        homeTo={state.homeTo}
        onRetry={loaded.reload}
      >
        {customer !== null ? (
          <>
            <div className="cat-card" data-testid="customer-profile">
              <div className="cat-facts">
                <PhoneText phone={customer.phone} locale={locale} call testId="customer-phone" />
                <RiskChip level={customer.riskLevel} locale={locale} />
              </div>
              {customer.address !== null ? (
                <p data-testid="customer-address">
                  {tr("customer.address", locale)}: {customer.address}
                </p>
              ) : null}
              {can.writeCustomers ? (
                <div className="cat-actions">
                  <a href={`#/customers/${customer.id}/edit`} data-testid="customer-edit">
                    {tr("cat.edit", locale)}
                  </a>
                  <a href="#/orders/new" data-testid="customer-new-order">
                    {tr("customer.new_order", locale)}
                  </a>
                </div>
              ) : null}
            </div>
            <section
              className="cat-card"
              data-testid="customer-dues"
              aria-labelledby="customer-dues-title"
            >
              <h3 id="customer-dues-title">{tr("customer.dues", locale)}</h3>
              <p data-testid="customer-dues-na">{tr("customer.dues_na", locale)}</p>
            </section>
            <Notes
              state={state}
              customer={customer}
              onAdded={(note) => loaded.setValue({ ...customer, notes: [note, ...customer.notes] })}
            />
            <History state={state} customerId={customer.id} />
          </>
        ) : null}
      </LoadState>
    </Screen>
  );
};
