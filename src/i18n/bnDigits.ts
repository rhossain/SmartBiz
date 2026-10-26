/**
 * src/i18n/bnDigits.ts — ASCII → Bangla numeral conversion
 * (BR6.5). Single-pass String#replace. Empty string returns
 * empty string.
 */
const ASCII_TO_BN: Record<string, string> = {
  "0": "০",
  "1": "১",
  "2": "২",
  "3": "৩",
  "4": "৪",
  "5": "৫",
  "6": "৬",
  "7": "৭",
  "8": "৮",
  "9": "৯",
};

export const bnDigits = (input: string): string => {
  if (input === "") return "";
  return input.replace(/[0-9]/g, (c) => ASCII_TO_BN[c] ?? c);
};
