import { useCallback, useRef, useState, type ReactNode } from 'react';
import type { ThemeMode } from '@/types';
import { ACCENT_OPTIONS, THEME_MODE_OPTIONS } from '@/constants/theme';
import { useTheme } from '@/store/theme/context';
import { useLocale } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/classNames';
import { CheckIcon, MonitorIcon, MoonIcon, PaletteIcon, StarsIcon, SunIcon } from '@/components/icons';

/** Icon đại diện cho từng mode trong bộ chọn. */
const MODE_ICON: Record<ThemeMode, (animated: boolean) => ReactNode> = {
  light: (a) => <SunIcon size={15} animated={a} />,
  dark: () => <MoonIcon size={15} />,
  midnight: (a) => <StarsIcon size={15} animated={a} />,
  system: () => <MonitorIcon size={15} />,
};

const MODE_LABEL: Record<ThemeMode, MessageKey> = {
  light: 'theme.light',
  dark: 'theme.dark',
  midnight: 'theme.midnight',
  system: 'theme.system',
};

const MODE_HINT: Record<ThemeMode, MessageKey> = {
  light: 'theme.lightHint',
  dark: 'theme.darkHint',
  midnight: 'theme.midnightHint',
  system: 'theme.systemHint',
};

/**
 * Bộ chọn theme ở header: nút mở popover gồm 4 mode (sáng / tối / midnight /
 * hệ thống) và 6 accent. Thay đổi áp ngay và được lưu qua ThemeProvider.
 */
export function ThemeSwitcher() {
  const { preference, resolvedMode, setMode, setAccent } = useTheme();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(rootRef, close, open);

  const currentAccent = ACCENT_OPTIONS.find((a) => a.value === preference.accent);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('theme.title')}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs text-fg-muted',
          'transition-all duration-200 hover:border-accent/60 hover:text-fg hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)]',
          open && 'border-accent/60 text-fg'
        )}
      >
        <span className="text-accent">{MODE_ICON[resolvedMode](true)}</span>
        <span
          className="h-3.5 w-3.5 rounded-full ring-2 ring-surface transition-transform duration-300 group-hover:scale-110"
          style={{ background: currentAccent?.swatch }}
          aria-hidden
        />
        <PaletteIcon size={14} className="text-fg-faint" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('theme.dialog')}
          className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 rounded-xl border border-line bg-surface p-3 shadow-card animate-scale-in origin-top-right"
        >
          <div className="eyebrow mb-2">{t('theme.mode')}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {THEME_MODE_OPTIONS.map((opt) => {
              const active = preference.mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={t(MODE_HINT[opt.value])}
                  onClick={() => setMode(opt.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all duration-200',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-line text-fg-muted hover:border-line-strong hover:bg-surface-raised hover:text-fg'
                  )}
                >
                  {MODE_ICON[opt.value](active)}
                  <span className="font-semibold">{t(MODE_LABEL[opt.value])}</span>
                </button>
              );
            })}
          </div>

          <div className="eyebrow mb-2 mt-3">{t('theme.accent')}</div>
          <div className="flex items-center justify-between">
            {ACCENT_OPTIONS.map((opt) => {
              const active = preference.accent === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  aria-label={t('theme.accentColor', { name: opt.label })}
                  aria-pressed={active}
                  onClick={() => setAccent(opt.value)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-white transition-all duration-200 hover:scale-110',
                    active ? 'ring-2 ring-offset-2 ring-offset-surface scale-110' : 'opacity-80 hover:opacity-100'
                  )}
                  style={{ background: opt.swatch, ['--tw-ring-color' as string]: opt.swatch }}
                >
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
