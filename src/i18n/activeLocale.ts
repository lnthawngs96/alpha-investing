import type { Locale } from '@/types/locale';
import { DEFAULT_LOCALE } from '@/constants/locale';
import { translate, type MessageKey } from './translate';

/** Locale đang dùng (đồng bộ từ LocaleProvider) — cho util ngoài React. */
let activeLocale: Locale = DEFAULT_LOCALE;

export function setActiveLocale(locale: Locale): void {
  activeLocale = locale;
}

export function getActiveLocale(): Locale {
  return activeLocale;
}

/** Dịch theo locale hiện tại — dùng trong util / hook không có React context. */
export function tt(key: MessageKey, vars?: Record<string, string | number>): string {
  return translate(activeLocale, key, vars);
}
