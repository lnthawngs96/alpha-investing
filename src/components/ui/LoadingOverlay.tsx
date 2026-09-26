import { useLocale } from '@/i18n';

/** Overlay toàn trang — spinner khi boot app đang chờ API. */
export function LoadingOverlay() {
  const { t } = useLocale();
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-canvas/85 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 rounded-full border-[3px] border-line border-t-accent animate-spin"
        aria-hidden
      />
      <p className="text-xs font-bold uppercase tracking-wider text-fg-muted">{t('common.loading')}</p>
    </div>
  );
}
