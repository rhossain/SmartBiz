/**
 * src/i18n/useTranslations.ts — React hook: subscribe to the
 * active locale + get a translator bound to that locale.
 */
import { useSyncExternalStore } from "react";
import { createStateContainer } from "../data/state-container.js";
import type { Locale } from "../data/enums.js";
import { lookup, type LKey } from "./L.js";

interface LocaleState {
  readonly locale: Locale;
}

const initial: LocaleState = { locale: "bn" };
const store = createStateContainer<LocaleState>(initial);

const subscribe = (cb: () => void): (() => void) => store.subscribe(() => cb());

export const useLocale = (): Locale => {
  return useSyncExternalStore(
    subscribe,
    () => store.get().locale,
    () => "bn" as Locale,
  );
};

export const setLocale = (l: Locale): void => store.set({ locale: l });

export interface TranslationsApi {
  readonly locale: Locale;
  readonly t: (key: LKey) => string;
}

export const useTranslations = (): TranslationsApi => {
  const locale = useLocale();
  return { locale, t: (key) => lookup(key, locale) };
};
