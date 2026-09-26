import type { Locale } from '@/types/locale';

export const LOCALE_STORAGE_KEY = 'subnet_explorer_locale';

export const LOCALES: readonly Locale[] = ['vi', 'en'];

export const DEFAULT_LOCALE: Locale = 'vi';

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; htmlLang: string; dateLocale: string }
> = {
  vi: { label: 'Tiếng Việt', nativeLabel: 'VI', htmlLang: 'vi', dateLocale: 'vi-VN' },
  en: { label: 'English', nativeLabel: 'EN', htmlLang: 'en', dateLocale: 'en-GB' },
};
