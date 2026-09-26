import { useCallback, useRef, useState } from 'react';
import type { Locale } from '@/types/locale';
import { LOCALE_META, LOCALES } from '@/constants/locale';
import { useLocale } from '@/i18n';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/classNames';
import { CheckIcon } from '@/components/icons';
import { FlagEngland, FlagVietnam } from '@/components/icons/Flags';

const FLAGS: Record<Locale, typeof FlagVietnam> = {
  vi: FlagVietnam,
  en: FlagEngland,
};

/**
 * Bộ chọn ngôn ngữ (VI / EN) đặt cạnh ThemeSwitcher.
 * Cờ Việt Nam + cờ Anh; lựa chọn lưu localStorage.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  const CurrentFlag = FLAGS[locale];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('language.title')}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs text-fg-muted',
          'transition-all duration-200 hover:border-accent/60 hover:text-fg hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)]',
          open && 'border-accent/60 text-fg'
        )}
      >
        <CurrentFlag size={16} className="rounded-[2px] shadow-sm ring-1 ring-line" />
        <span className="font-bold tracking-wider text-fg">{LOCALE_META[locale].nativeLabel}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('language.dialog')}
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-48 rounded-xl border border-line bg-surface p-2 shadow-card animate-scale-in origin-top-right"
        >
          <div className="eyebrow mb-1.5 px-1.5">{t('language.title')}</div>
          <div className="flex flex-col gap-1">
            {LOCALES.map((code) => {
              const Flag = FLAGS[code];
              const active = locale === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-xs transition-all duration-200',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-transparent text-fg-muted hover:border-line hover:bg-surface-raised hover:text-fg'
                  )}
                >
                  <Flag size={18} className="rounded-[2px] shadow-sm ring-1 ring-line" />
                  <span className="flex-1 text-left font-semibold">
                    {code === 'vi' ? t('language.vi') : t('language.en')}
                  </span>
                  <span className="font-mono text-[10px] opacity-70">{LOCALE_META[code].nativeLabel}</span>
                  {active && <CheckIcon size={13} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
