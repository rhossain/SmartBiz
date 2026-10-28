/**
 * src/catalog/screens/CustomerForm.tsx — record or edit a customer, `/customers/new` and
 * `/customers/:id/edit` (U4 W1, W2; US3.1; BR2.1, BR3.1–BR3.4, BR13.3; AC3.1.1–AC3.1.4;
 * NFR9.13; R18 / Q3 of the NFR design: the submit guard).
 *
 * - Name, mobile number, address, risk level (native radios: arrow keys move between them,
 *   NFR9.13) and, when recording, an optional first note (BR3.4).
 * - The phone is normalised as the person leaves the field and shown back as it will be
 *   stored (in the reader's digits); a number the rule refuses says "সঠিক মোবাইল নম্বর দিন
 *   (০১ দিয়ে শুরু, ১১ সংখ্যা)" before anything is sent — the same pure rule the server
 *   runs, which stays the authority (BR2.1).
 * - Edit sends ONLY the fields that changed (BR3.1, D10); a clear address is sent as null.
 *   Nothing changed → nothing is sent and the form returns to the customer.
 * - Saving goes to the customer with the toast ("ক্রেতা যোগ হয়েছে" / "সংরক্ষণ হয়েছে") and,
 *   when the server names a customer with the same phone, the warning on the detail
 *   (BR3.3: no pre-save check; the server's answer is the one source of truth).
 * - One click is one request (the submit guard); a refused save keeps every typed value and
 *   shows each field's message, the rest as a form-level line.
 */
import * as React from "react";
import type { ApiFailure } from "../../client/http.js";
import { lookup } from "../../i18n/L.js";
import { Field } from "../../pres/Field.js";
import { shownPhone } from "../../pres/PhoneText.js";
import { RISK_LABELS, type RiskLevelShown } from "../../pres/RiskChip.js";
import { Screen } from "../../pres/Screen.js";
import { useSubmitGuard } from "../../pres/use-submit-guard.js";
import { tr } from "../copy.js";
import { normalisePhone } from "../rules/phone.js";
import type { CustomerDetailResponse, CustomerUpdate } from "../schemas.js";
import { fieldError, FormFailure, LoadState, useLoad } from "./parts.js";
import type { CatalogRouteState } from "./render-catalog-route.js";

interface Values {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly riskLevel: RiskLevelShown;
  readonly note: string;
}

const BLANK: Values = { name: "", phone: "", address: "", riskLevel: 0, note: "" };

const valuesOf = (c: CustomerDetailResponse): Values => ({
  name: c.name,
  phone: c.phone,
  address: c.address ?? "",
  riskLevel: c.riskLevel,
  note: "",
});

/** D10: only what changed; an emptied address is null. */
export const customerPatch = (before: Values, after: Values, phone: string): CustomerUpdate => ({
  ...(after.name.trim() !== before.name ? { name: after.name } : {}),
  ...(phone !== before.phone ? { phone } : {}),
  ...(after.address.trim() !== before.address
    ? { address: after.address.trim() === "" ? null : after.address }
    : {}),
  ...(after.riskLevel !== before.riskLevel ? { riskLevel: after.riskLevel } : {}),
});

interface FormProps {
  readonly state: CatalogRouteState;
  readonly initial: Values | null;
  readonly id: string | null;
}

const CustomerFields = ({ state, initial, id }: FormProps): React.ReactElement => {
  const { locale, api } = state;
  const [values, setValues] = React.useState<Values>(initial ?? BLANK);
  const [failure, setFailure] = React.useState<ApiFailure | null>(null);
  const [phoneRefused, setPhoneRefused] = React.useState(false);
  const guard = useSubmitGuard();
  const set = (patch: Partial<Values>): void => {
    setValues((v) => ({ ...v, ...patch }));
    guard.reset();
  };

  const normaliseOnBlur = (): void => {
    if (values.phone.trim() === "") return;
    const stored = normalisePhone(values.phone);
    setPhoneRefused(stored === null);
    if (stored !== null) set({ phone: shownPhone(stored, locale) });
  };

  const submit = (): void => {
    void guard.submit(async () => {
      setFailure(null);
      const phone = normalisePhone(values.phone);
      if (phone === null) {
        setPhoneRefused(true);
        return false;
      }
      setPhoneRefused(false);
      if (id === null) {
        const r = await api.customers.create({
          name: values.name,
          phone,
          ...(values.address.trim() !== "" ? { address: values.address } : {}),
          riskLevel: values.riskLevel,
          ...(values.note.trim() !== "" ? { note: values.note } : {}),
        });
        if (!r.ok) {
          setFailure(r);
          return false;
        }
        state.onSaved(
          `/customers/${r.value.customer.id}`,
          tr("customer.added", locale),
          r.value.duplicatePhoneOf,
        );
        return true;
      }
      const patch = customerPatch(initial ?? BLANK, values, phone);
      if (Object.keys(patch).length === 0) {
        state.navigate(`/customers/${id}`);
        return true;
      }
      const r = await api.customers.update(id, patch);
      if (!r.ok) {
        setFailure(r);
        return false;
      }
      state.onSaved(`/customers/${id}`, tr("cat.saved", locale), r.value.duplicatePhoneOf);
      return true;
    });
  };

  const phoneError = phoneRefused
    ? tr("customer.phone_invalid", locale)
    : fieldError(failure, "phone", locale);
  const fieldsShown = failure !== null && failure.fields.length > 0;
  return (
    <form
      data-testid="customer-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Field
        label={tr("customer.field.name", locale)}
        name="customer-name"
        value={values.name}
        onChange={(name) => set({ name })}
        error={fieldError(failure, "name", locale)}
        required
      />
      <div className="field">
        <label htmlFor="field-customer-phone">{tr("customer.field.phone", locale)}</label>
        <input
          id="field-customer-phone"
          data-testid="field-customer-phone"
          inputMode="tel"
          autoComplete="tel"
          value={values.phone}
          aria-invalid={phoneError !== null}
          {...(phoneError !== null ? { "aria-describedby": "field-error-customer-phone" } : {})}
          onChange={(e) => {
            setPhoneRefused(false);
            set({ phone: e.target.value });
          }}
          onBlur={normaliseOnBlur}
        />
        {phoneError !== null ? (
          <span
            id="field-error-customer-phone"
            role="alert"
            data-testid="field-error-customer-phone"
            className="field__error"
          >
            {phoneError}
          </span>
        ) : null}
      </div>
      <div className="field">
        <label htmlFor="field-customer-address">{tr("customer.field.address", locale)}</label>
        <textarea
          id="field-customer-address"
          data-testid="field-customer-address"
          rows={2}
          value={values.address}
          onChange={(e) => set({ address: e.target.value })}
        />
      </div>
      <fieldset className="risk-choice" data-testid="customer-risk">
        <legend>{tr("risk.label", locale)}</legend>
        {([0, 1, 2, 3] as const).map((level) => (
          <label key={level}>
            <input
              type="radio"
              name="risk-level"
              value={level}
              data-testid={`customer-risk-${level}`}
              checked={values.riskLevel === level}
              onChange={() => set({ riskLevel: level })}
            />{" "}
            {RISK_LABELS[level][locale]}
          </label>
        ))}
      </fieldset>
      {id === null ? (
        <div className="field">
          <label htmlFor="field-customer-note">{tr("customer.field.note", locale)}</label>
          <textarea
            id="field-customer-note"
            data-testid="field-customer-note"
            rows={3}
            maxLength={2000}
            value={values.note}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>
      ) : null}
      <FormFailure
        failure={fieldsShown ? null : failure}
        locale={locale}
        testId="customer-form-error"
      />
      <button
        type="submit"
        data-testid="customer-save"
        disabled={guard.state === "saving"}
        aria-busy={guard.state === "saving"}
      >
        {tr("cat.save", locale)}
      </button>
    </form>
  );
};

const EditCustomer = ({
  state,
  id,
}: {
  readonly state: CatalogRouteState;
  readonly id: string;
}): React.ReactElement => {
  const load = React.useCallback(() => state.api.customers.get(id), [state.api, id]);
  const loaded = useLoad(load);
  return (
    <LoadState
      phase={loaded.phase}
      failure={loaded.failure}
      locale={state.locale}
      feature={lookup("feature.customer_edit", state.locale)}
      homeTo={state.homeTo}
      onRetry={loaded.reload}
    >
      {loaded.value !== null ? (
        <CustomerFields state={state} initial={valuesOf(loaded.value)} id={id} />
      ) : null}
    </LoadState>
  );
};

export const CustomerForm = ({
  state,
  mode,
  id = null,
}: {
  readonly state: CatalogRouteState;
  readonly mode: "new" | "edit";
  readonly id?: string | null;
}): React.ReactElement => {
  const { locale } = state;
  if (mode === "edit" && id !== null) {
    return (
      <Screen
        title={lookup("feature.customer_edit", locale)}
        back={{ href: `#/customers/${id}`, label: tr("cat.back.customer", locale) }}
      >
        <EditCustomer state={state} id={id} />
      </Screen>
    );
  }
  return (
    <Screen
      title={lookup("feature.customer_new", locale)}
      back={{ href: "#/customers", label: tr("cat.back.customers", locale) }}
    >
      <CustomerFields state={state} initial={null} id={null} />
    </Screen>
  );
};
