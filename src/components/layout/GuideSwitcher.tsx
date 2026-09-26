import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUIDE_SECTIONS } from '@/i18n/guideContent';
import { useLocale } from '@/i18n';
import { useClickOutside } from '@/hooks/useClickOutside';
import { cn } from '@/utils/classNames';
import { BookIcon, XIcon } from '@/components/icons';
import { IconButton } from '@/components/ui';

const SOURCE_URL = 'https://github.com/mobiusfund/investing';

/**
 * Nút Guide cạnh ThemeSwitcher: mở panel giữa màn hình (70vh), nội dung scroll.
 * Modal portal ra body để không bị chứa khối bởi backdrop-filter trên header.
 */
export function GuideSwitcher() {
  const { t, locale } = useLocale();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(panelRef, close, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const sections = GUIDE_SECTIONS[locale];

  const dialog =
    open &&
    createPortal(
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <button
          type="button"
          aria-label={t('guide.close')}
          className="absolute inset-0 bg-canvas/70 backdrop-blur-sm animate-fade-in"
          onClick={close}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            'relative z-10 flex w-full max-w-3xl flex-col overflow-hidden',
            'h-[70vh] rounded-2xl border border-line bg-surface shadow-card',
            'animate-slide-down'
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line bg-surface-raised/80 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-sm font-bold text-fg">
                {t('guide.title')}
              </h2>
              <p className="mt-1 text-[11px] text-fg-muted">{t('guide.subtitle')}</p>
            </div>
            <IconButton label={t('guide.close')} onClick={close} className="shrink-0">
              <XIcon size={16} />
            </IconButton>
          </div>

          <div className="show-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-6">
              {sections.map((section) => (
                <section key={section.id} className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{section.title}</h3>
                  {section.paragraphs.map((p, i) => (
                    <p key={i} className="text-xs leading-relaxed text-fg-muted">
                      {p}
                    </p>
                  ))}
                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="mt-1 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-fg">
                      {section.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {section.links && section.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                      {section.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-semibold text-accent underline-offset-2 hover:underline"
                        >
                          {link.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-line bg-surface-raised/60 px-5 py-3 text-[11px] text-fg-faint">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                {t('guide.sourceLabel')}{' '}
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-accent underline-offset-2 hover:underline"
                >
                  github.com/mobiusfund/investing
                </a>
              </span>
              <a
                href="https://kym.investing88.ai/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                KYM
              </a>
              <a
                href="https://db.investing88.ai"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                Dashboard
              </a>
              <a
                href="https://x.com/Investing88ai"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline-offset-2 hover:underline"
              >
                X
              </a>
            </span>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('guide.open')}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1.5 text-xs text-fg-muted',
          'transition-all duration-200 hover:border-accent/60 hover:text-fg hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)]',
          open && 'border-accent/60 text-fg'
        )}
      >
        <BookIcon size={15} className="text-accent transition-transform duration-300 group-hover:scale-110" />
        <span className="hidden font-bold tracking-wider sm:inline">{t('guide.badge')}</span>
      </button>
      {dialog}
    </>
  );
}
