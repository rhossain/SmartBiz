/**
 * src/catalog/rules/phone.ts — Bangladeshi mobile numbers and the search query (U4 BR2.1,
 * BR5.1, BR5.2; S32; functional-design Q3, Q5; NFR-design review R-05).
 *
 * One pure module, imported by the server and by the screens, so the browser shows the same
 * refusal before saving that the server would give (frontend-components "Form validation in
 * the browser"); the server stays the authority.
 *
 * `normalisePhone` (BR2.1): Bangla digits become ASCII; spaces, '-', '.', '(' and ')' go; a
 * leading '+880' or '880' becomes '0'; what is left must be '01', one of 3–9, then 8 digits.
 * Anything else is `null` (the caller refuses the field). One stored shape makes duplicate
 * detection (BR3.3) and phone search exact.
 *
 * `searchTerms` (BR5.1): the query is trimmed and its Bangla digits become ASCII. When the
 * query without spaces, '-' and one leading '+' is all digits and at least 4 of them, the
 * phone is searched as well (a leading 880 becoming 0), so people can type the first or the
 * last four digits; otherwise only the name is searched. The name pattern escapes '\', '%'
 * and '_' (searched with `ESCAPE '\'`), so `50%` and `a_b` match literally (S32).
 * `digitsHint` is BR5.2's "fewer than 4 digits" case, for the screen's hint.
 */
import { toAsciiDigits } from "../../i18n/bnDigits.js";

/** BR2.1: the stored shape, `01XXXXXXXXX`. */
export const PHONE_PATTERN = /^01[3-9][0-9]{8}$/;

/** Phone search starts at this many digits (BR5.1, BR5.2). */
export const MIN_PHONE_SEARCH_DIGITS = 4;

/** S32: the longest query accepted (the zod schema enforces it at the boundary). */
export const MAX_QUERY_LENGTH = 100;

export const normalisePhone = (raw: string): string | null => {
  let s = toAsciiDigits(raw.trim()).replace(/[\s\-.()]/g, "");
  if (s.startsWith("+880")) s = `0${s.slice(4)}`;
  else if (s.startsWith("880")) s = `0${s.slice(3)}`;
  return PHONE_PATTERN.test(s) ? s : null;
};

/** `\`, `%` and `_` made literal for `LIKE … ESCAPE '\'`. */
export const escapeLike = (text: string): string => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export interface SearchTerms {
  /** `%<escaped query>%`, or null when the query is empty (list everything). */
  readonly namePattern: string | null;
  /** `%<digits>%` when the query is a phone search of 4+ digits, else null. */
  readonly phonePattern: string | null;
}

/** The query's digits when it reads as a phone number of any length, else null. */
const phoneDigits = (query: string): string | null => {
  const d = query.replace(/[\s-]/g, "").replace(/^\+/, "");
  return /^[0-9]+$/.test(d) ? d : null;
};

export const searchTerms = (raw: string | null | undefined): SearchTerms => {
  const query = toAsciiDigits((raw ?? "").trim());
  if (query === "") return { namePattern: null, phonePattern: null };
  const namePattern = `%${escapeLike(query)}%`;
  const digits = phoneDigits(query);
  if (digits === null || digits.length < MIN_PHONE_SEARCH_DIGITS) {
    return { namePattern, phonePattern: null };
  }
  const local = digits.startsWith("880") ? `0${digits.slice(3)}` : digits;
  return { namePattern, phonePattern: `%${local}%` };
};

/** BR5.2: a query of 1–3 digits searches names only; the screen says so. */
export const digitsHint = (raw: string): boolean => {
  const digits = phoneDigits(toAsciiDigits(raw.trim()));
  return digits !== null && digits.length > 0 && digits.length < MIN_PHONE_SEARCH_DIGITS;
};
