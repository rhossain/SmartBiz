/**
 * src/router/screens/Business.tsx — the Business page, `/business` (mockups §17.2; US1.5
 * AC1.5.1, AC1.5.4). Props only: the container (src/router/render-business-route.tsx) owns
 * the client calls, so this screen imports no client module (BR7.4).
 *
 * - The form holds the business name, phone, address and default language; the currency is
 *   shown read-only (৳ BDT, D17-3). Name and address span the row; phone and currency share
 *   one.
 * - Save is enabled only when a field differs from the saved values, and sends only the
 *   changed fields; an emptied phone or address is sent as null (cleared). While saving it
 *   reads "সংরক্ষণ হচ্ছে…" and is disabled (AC5.4.4).
 * - A refusal keeps the typed values: 400 puts each message under its field, anything else
 *   shows the shared error banner. A save shows "ব্যবসার তথ্য সংরক্ষণ হয়েছে".
 * - The route is `business.edit` (Owner); every other role meets the lock screen first.
 */
import * as React from "react";
import type { BusinessResponse } from "../../auth/schemas.js";
import type { ApiFailure } from "../../client/http.js";
import type { Locale } from "../../data/enums.js";
import { L, lookup } from "../../i18n/L.js";
import { ApiState, ErrorBanner, type RequestPhase } from "../../pres/ApiState.js";
import { Field } from "../../pres/Field.js";
import { Screen } from "../../pres/Screen.js";

const COPY = {
  intro: L(
    "আপনার ব্যবসার তথ্য — রসিদ ও কুরিয়ারে এগুলো দেখানো হবে।",
    "Your business details — shown on invoices and courier slips.",
  ),
  panel: L("ব্যবসার তথ্য", "Business details"),
  name: L("ব্যবসার নাম", "Business name"),
  phone: L("ফোন", "Phone"),
  currency: L("মুদ্রা", "Currency"),
  address: L("ঠিকানা", "Address"),
  language: L("ডিফল্ট ভাষা", "Default language"),
  save: L("পরিবর্তন সংরক্ষণ করুন", "Save changes"),
  saving: L("সংরক্ষণ হচ্ছে…", "Saving…"),
  saved: L("ব্যবসার তথ্য সংরক্ষণ হয়েছে", "Business details saved"),
  nameError: L("নাম ১ থেকে ১২০ অক্ষরের হতে হবে", "The name needs 1 to 120 characters"),
  phoneError: L(
    "০১ দিয়ে শুরু ১১ সংখ্যার মোবাইল নম্বর লিখুন",
    "Enter an 11-digit mobile number starting 01",
  ),
  addressError: L("ঠিকানা ৩০০ অক্ষরের মধ্যে লিখুন", "Keep the address within 300 characters"),
} as const;

const t = (key: keyof typeof COPY, locale: Locale): string =>
  locale === "bn" ? COPY[key].bn : COPY[key].en;

export interface BusinessForm {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly locale: Locale;
}

export const formOf = (b: BusinessResponse): BusinessForm => ({
  name: b.name,
  phone: b.phone ?? "",
  address: b.address ?? "",
  locale: b.locale,
});

/** Only the changed fields; an emptied phone or address clears it (null). */
export const changesOf = (
  saved: BusinessForm,
  form: BusinessForm,
): Partial<{ name: string; phone: string | null; address: string | null; locale: Locale }> => {
  const out: Partial<{
    name: string;
    phone: string | null;
    address: string | null;
    locale: Locale;
  }> = {};
  if (form.name.trim() !== saved.name) out.name = form.name.trim();
  if (form.phone.trim() !== saved.phone)
    out.phone = form.phone.trim() === "" ? null : form.phone.trim();
  if (form.address.trim() !== saved.address)
    out.address = form.address.trim() === "" ? null : form.address.trim();
  if (form.locale !== saved.locale) out.locale = form.locale;
  return out;
};

export interface BusinessScreenProps {
  readonly locale: Locale;
  readonly phase: RequestPhase;
  readonly failure: ApiFailure | null;
  readonly saved: BusinessResponse | null;
  readonly onRetry: () => void;
  /** Resolves to null on success, or the refusal to show. */
  readonly onSave: (patch: ReturnType<typeof changesOf>) => Promise<ApiFailure | null>;
}

const fieldError = (failure: ApiFailure | null, path: string): boolean =>
  failure !== null &&
  failure.kind === "invalid_input" &&
  failure.fields.some((f) => f.path === path || f.path.startsWith(`${path}.`));

export const BusinessScreen = (props: BusinessScreenProps): React.ReactElement => {
  const { locale } = props;
  const savedForm = props.saved ? formOf(props.saved) : null;
  const [form, setForm] = React.useState<BusinessForm | null>(savedForm);
  const [saving, setSaving] = React.useState(false);
  const [refusal, setRefusal] = React.useState<ApiFailure | null>(null);
  const [notice, setNotice] = React.useState(false);

  // A fresh load (or a successful save) resets the form to the saved values.
  React.useEffect(() => {
    setForm(props.saved ? formOf(props.saved) : null);
  }, [props.saved]);

  const changes = savedForm && form ? changesOf(savedForm, form) : {};
  const dirty = Object.keys(changes).length > 0;

  const set = (patch: Partial<BusinessForm>): void => {
    setNotice(false);
    setForm((f) => (f ? { ...f, ...patch } : f));
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    setRefusal(null);
    const r = await props.onSave(changes);
    setSaving(false);
    if (r === null) setNotice(true);
    else setRefusal(r);
  };

  return (
    <Screen title={lookup("feature.business", locale)}>
      <p className="screen__intro">{t("intro", locale)}</p>
      <ApiState
        phase={props.phase}
        locale={locale}
        errorKind={props.failure?.kind ?? null}
        correlationId={props.failure?.correlationId ?? null}
        onRetry={props.onRetry}
      >
        {form ? (
          <form
            className="settings-panel"
            data-testid="business-form"
            onSubmit={(e) => void submit(e)}
          >
            <h3>{t("panel", locale)}</h3>
            <Field
              label={t("name", locale)}
              name="business-name"
              value={form.name}
              onChange={(v) => set({ name: v })}
              required
              error={fieldError(refusal, "name") ? t("nameError", locale) : null}
            />
            <div className="form-row">
              <Field
                label={t("phone", locale)}
                name="business-phone"
                value={form.phone}
                onChange={(v) => set({ phone: v })}
                error={fieldError(refusal, "phone") ? t("phoneError", locale) : null}
              />
              <div className="field">
                <label htmlFor="field-business-currency">{t("currency", locale)}</label>
                <input
                  id="field-business-currency"
                  data-testid="field-business-currency"
                  value="BDT (৳)"
                  readOnly
                />
              </div>
            </div>
            <Field
              label={t("address", locale)}
              name="business-address"
              value={form.address}
              onChange={(v) => set({ address: v })}
              error={fieldError(refusal, "address") ? t("addressError", locale) : null}
            />
            <fieldset data-testid="business-locale">
              <legend>{t("language", locale)}</legend>
              {(["bn", "en"] as const).map((l) => (
                <label key={l}>
                  <input
                    type="radio"
                    name="business-locale"
                    value={l}
                    data-testid={`business-locale-${l}`}
                    checked={form.locale === l}
                    onChange={() => set({ locale: l })}
                  />
                  {l === "bn" ? "বাংলা" : "English"}
                </label>
              ))}
            </fieldset>
            {refusal && refusal.kind !== "invalid_input" ? (
              <ErrorBanner
                kind={refusal.kind}
                locale={locale}
                correlationId={refusal.correlationId}
              />
            ) : null}
            {notice ? (
              <p role="status" data-testid="business-saved" className="banner banner--success">
                {t("saved", locale)}
              </p>
            ) : null}
            <button type="submit" data-testid="business-save" disabled={!dirty || saving}>
              {saving ? t("saving", locale) : t("save", locale)}
            </button>
          </form>
        ) : null}
      </ApiState>
    </Screen>
  );
};
