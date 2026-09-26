import { DD_TRIGGER } from '@/constants/portfolio';
import { cn } from '@/utils/classNames';
import { useLocale } from '@/i18n';
import { IconButton } from '@/components/ui';
import { ArrowLeftRightIcon, XIcon } from '@/components/icons';

/** Một cặp danh mục đã so. */
export interface DedupePair {
  i: number;
  j: number;
  dist: number;
  ni: string;
  nj: string;
}

/** Kết quả kiểm tra dedupe toàn bộ danh mục với nhau. */
export interface DedupeReport {
  count: number;
  pairs: number;
  minPair: DedupePair | null;
  conflicts: DedupePair[];
}

export interface DedupeReportPanelProps {
  report: DedupeReport;
  onClose: () => void;
}

/** Bảng kết quả so khoảng cách dedupe giữa mọi cặp danh mục đã lưu. */
export function DedupeReportPanel({ report, onClose }: DedupeReportPanelProps) {
  const { t } = useLocale();
  const hasConflicts = report.conflicts.length > 0;
  return (
    <div className="shrink-0 px-5 pb-3">
      <div
        className={cn(
          'rounded-lg border p-3 text-xs animate-slide-down',
          hasConflicts ? 'border-negative bg-negative/10' : 'border-positive bg-positive/10'
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className={cn('font-bold', hasConflicts ? 'text-negative' : 'text-positive')}>
            {hasConflicts
              ? t('saved.dedupeConflicts', { count: report.conflicts.length, threshold: DD_TRIGGER })
              : t('saved.dedupeSafe', { count: report.count })}
          </div>
          <IconButton label={t('common.close')} onClick={onClose} className="shrink-0">
            <XIcon size={14} />
          </IconButton>
        </div>
        <div className="mt-1 text-fg-muted">
          {t('saved.compared', { pairs: report.pairs })}
          {report.minPair && (
            <>
              {' '}
              {t('saved.minDist', {
                dist: report.minPair.dist,
                a: report.minPair.ni,
                b: report.minPair.nj,
              })}
            </>
          )}
        </div>
        {hasConflicts && (
          <div className="mt-2 flex flex-col gap-1">
            {report.conflicts.map((c) => (
              <div key={`${c.i}-${c.j}`} className="flex items-center gap-2 text-negative">
                <span className="w-16 shrink-0 font-bold tabular-nums">d={c.dist}</span>
                <span className="truncate">{c.ni}</span>
                <ArrowLeftRightIcon size={12} className="shrink-0 text-fg-faint" />
                <span className="truncate">{c.nj}</span>
              </div>
            ))}
            <div className="mt-1 text-fg-muted">
              {t('saved.dedupeAdvice', { threshold: DD_TRIGGER })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
