import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@/types/locale';
import { DEFAULT_LOCALE, LOCALE_META, LOCALE_STORAGE_KEY, LOCALES } from '@/constants/locale';
import { setActiveLocale } from './activeLocale';
import { translate, type MessageKey } from './translate';

function readStoredLocale(): Locale {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && (LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  } catch {
    /* private mode */
  }
  return DEFAULT_LOCALE;
}

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  dateLocale: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === 'undefined' ? DEFAULT_LOCALE : readStoredLocale()
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setActiveLocale(locale);
    document.documentElement.lang = LOCALE_META[locale].htmlLang;
  }, [locale]);

  // Đồng bộ ngay khi mount (trước paint effect) để util dùng đúng locale.
  setActiveLocale(locale);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      dateLocale: LOCALE_META[locale].dateLocale,
    }),
    [locale, setLocale]
  );

  return createElement(LocaleContext.Provider, { value }, children);
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale phải nằm trong LocaleProvider');
  return ctx;
}
