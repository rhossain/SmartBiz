/**
 * src/catalog/screens/Suppliers.tsx — the suppliers, `/suppliers` (U4 W5; US3.6; BR1.3,
 * BR2.1, BR8.1, BR8.3, BR8.4, BR13.3; AC3.6.1, AC3.6.2; NFR9.12).
 *
 * - The list, by name: each supplier's name, phone with "কল করুন" (BR8.3) and how many
 *   products name it as their default supplier (BR8.4); past 200 it says only the first 200
 *   are shown.
 * - Owner and Manager (BR1.3) get the add form — opened at once when there is no supplier
 *   yet ("এখনো কোনো সরবরাহকারী নেই") — and a "সম্পাদনা" action on each row, which opens
 *   the same form filled in. Name and phone are both required; the phone follows BR2.1 and
 *   a refused one says so under the field. Everyone else reads the list only.
 * - A saved supplier appears in the list at once (no reload), with the toast.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { lookup } from "../../i18n/L.js";
import { Field } from "../../pres/Field.js";
import { PhoneText, shownPhone } from "../../pres/PhoneText.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { digits, tr } from "../copy.js";
import { normalisePhone } from "../rules/phone.js";
import type { SupplierListResponse, SupplierResponse } from "../schemas.js";
import { fieldError, FormFailure, LoadState, useLoad } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

const SupplierForm = ({
  state,
  editing,
  onSaved,
  onCancel,
}: {
  readonly state: CatalogRouteState;
  readonly editing: SupplierResponse | null;
  readonly onSaved: (s: SupplierResponse) => void;
  readonly onCancel: (() => void) | null;
}): React.ReactElement => {
  const { locale, api } = state;
  const [name, setName] = React.useState(editing?.name ?? "");
  const [phone, setPhone] = React.useState(
    editing === null ? "" : shownPhone(editing.phone, locale),
  );
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [phoneRefused, setPhoneRefused] = React.useState(false);
  const guard = useSubmitGuard();
  const submit = (): void => {
    void guard.submit(async () => {
      setFailure(null);
      const stored = normalisePhone(phone);
      setPhoneRefused(stored === null);
      if (stored === null) return false;
      const patch =
        editing === null
          ? null
          : {
              ...(name.trim() !== editing.name ? { name } : {}),
              ...(stored !== editing.phone ? { phone: stored } : {}),
            };
      // Nothing changed: nothing is sent (the server would write nothing either, R20).
      if (editing !== null && patch !== null && Object.keys(patch).length === 0) {
        onCancel?.();
        return true;
      }
      const r =
        editing === null || patch === null
          ? await api.suppliers.create({ name, phone: stored })
          : await api.suppliers.update(editing.id, patch);
      if (!r.ok) {
        setFailure(r);
        return false;
      }
      onSaved(r.value.supplier);
      if (editing === null) {
        setName("");
        setPhone("");
      }
      return true;
    });
  };
  const phoneError = phoneRefused
    ? tr("customer.phone_invalid", locale)
    : fieldError(failure, "phone", locale);
  return (
    <form
      data-testid="supplier-form"
      className="cat-card"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <h3>{tr(editing === null ? "suppliers.add" : "suppliers.edit_title", locale)}</h3>
      <Field
        label={tr("suppliers.field.name", locale)}
        name="supplier-name"
        value={name}
        onChange={(v) => {
          setName(v);
          guard.reset();
        }}
        error={fieldError(failure, "name", locale)}
        required
      />
      <Field
        label={tr("suppliers.field.phone", locale)}
        name="supplier-phone"
        value={phone}
        onChange={(v) => {
          setPhone(v);
          setPhoneRefused(false);
          guard.reset();
        }}
        error={phoneError}
        required
      />
      <FormFailure
        failure={failure !== null && failure.fields.length > 0 ? null : failure}
        locale={locale}
        testId="supplier-form-error"
      />
      <button
        type="submit"
        data-testid="supplier-save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("cat.save", locale)}
      </button>
      {onCancel !== null ? (
        <button type="button" data-testid="supplier-cancel" onClick={onCancel}>
          {lookup("common.cancel", locale)}
        </button>
      ) : null}
    </form>
  );
};

export const Suppliers = ({ state }: { readonly state: CatalogRouteState }): React.ReactElement => {
  const { locale, can } = state;
  const load = React.useCallback(() => state.api.suppliers.list(), [state.api]);
  const loaded = useLoad(load);
  const [editing, setEditing] = React.useState<SupplierResponse | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [saved, setSaved] = React.useState<string | null>(null);
  const list: SupplierListResponse | null = loaded.value;
  const suppliers = list?.suppliers ?? [];
  const showAdd =
    can.manage && editing === null && (adding || (list !== null && suppliers.length === 0));

  const onSaved = (s: SupplierResponse): void => {
    if (list === null) return;
    const exists = suppliers.some((x) => x.id === s.id);
    const next = exists ? suppliers.map((x) => (x.id === s.id ? s : x)) : [...suppliers, s];
    loaded.setValue({ ...list, suppliers: next });
    setSaved(tr(exists ? "cat.saved" : "suppliers.added", locale));
    setEditing(null);
    setAdding(false);
  };

  return (
    <Screen title={tr("suppliers.title", locale)}>
      <LoadState
        phase={loaded.phase}
        failure={loaded.failure}
        locale={locale}
        feature={lookup("feature.suppliers", locale)}
        homeTo={state.homeTo}
        onRetry={loaded.reload}
      >
        {saved !== null ? (
          <p role="status" data-testid="suppliers-saved">
            {saved}
          </p>
        ) : null}
        {list?.truncated === true ? (
          <p data-testid="suppliers-truncated">{tr("cat.truncated", locale)}</p>
        ) : null}
        {suppliers.length === 0 ? (
          <p data-testid="suppliers-empty">{tr("suppliers.empty", locale)}</p>
        ) : (
          <div className="scroll-x">
            <table className="table" data-testid="suppliers-table">
              <thead>
                <tr>
                  <th scope="col">{tr("suppliers.col.name", locale)}</th>
                  <th scope="col">{tr("suppliers.col.phone", locale)}</th>
                  <th scope="col">{tr("suppliers.col.products", locale)}</th>
                  {can.manage ? <th scope="col">{tr("cat.edit", locale)}</th> : null}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} data-testid="supplier-row" data-supplier-id={s.id}>
                    <td>{s.name}</td>
                    <td>
                      <PhoneText phone={s.phone} locale={locale} call testId="supplier-phone" />
                    </td>
                    <td data-testid="supplier-product-count">{digits(s.productCount, locale)}</td>
                    {can.manage ? (
                      <td>
                        <button
                          type="button"
                          data-testid={`supplier-edit-${s.id}`}
                          onClick={() => {
                            setSaved(null);
                            setEditing(s);
                          }}
                        >
                          {tr("cat.edit", locale)}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {editing !== null ? (
          <SupplierForm
            key={editing.id}
            state={state}
            editing={editing}
            onSaved={onSaved}
            onCancel={() => setEditing(null)}
          />
        ) : null}
        {showAdd ? (
          <SupplierForm
            state={state}
            editing={null}
            onSaved={onSaved}
            onCancel={suppliers.length === 0 ? null : () => setAdding(false)}
          />
        ) : null}
        {can.manage && !showAdd && editing === null ? (
          <button
            type="button"
            data-testid="suppliers-add"
            onClick={() => {
              setSaved(null);
              setAdding(true);
            }}
          >
            {tr("suppliers.add", locale)}
          </button>
        ) : null}
      </LoadState>
    </Screen>
  );
};
