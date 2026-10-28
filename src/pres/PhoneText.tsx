/**
 * src/pres/PhoneText.tsx — a stored phone number as the reader reads it (U4 BR2.2, BR8.3;
 * AC3.3.4, AC3.6.2; frontend-components "PhoneText").
 *
 * The number is stored as ASCII `01XXXXXXXXX` (BR2.1) and shown in the locale's digits —
 * Bangla digits in Bangla. With `call`, a "কল করুন" (Call) link opens `tel:` with the STORED
 * ASCII form, which every phone dialler understands (BR2.2, BR8.3).
 */
import * as React from "react";
import type { Locale } from "../data/enums.js";
import { bnDigits } from "../i18n/bnDigits.js";
import { L } from "../i18n/L.js";

const CALL = L("কল করুন", "Call");

export interface PhoneTextProps {
  readonly phone: string;
  readonly locale: Locale;
  readonly call?: boolean;
  readonly testId?: string;
}

export const shownPhone = (phone: string, locale: Locale): string =>
  locale === "bn" ? bnDigits(phone) : phone;

export const PhoneText = ({
  phone,
  locale,
  call = false,
  testId = "phone",
}: PhoneTextProps): React.ReactElement => (
  <span className="phone-text">
    <span data-testid={testId}>{shownPhone(phone, locale)}</span>
    {call ? (
      <>
        {" "}
        <a href={`tel:${phone}`} data-testid={`${testId}-call`} className="phone-text__call">
          {CALL[locale]}
        </a>
      </>
    ) : null}
  </span>
);
