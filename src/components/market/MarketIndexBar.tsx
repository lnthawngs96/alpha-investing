import { useMemo } from 'react';
import type { SubnetRow } from '@/types';
import { computeAlphaMarketIndex, MARKET_CHANGE_FIELDS, type MarketChangeField } from '@/utils/marketIndex';
import { useLocale } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { SignedValue } from '@/components/ui';
import { cn } from '@/utils/classNames';

export interface MarketIndexBarProps {
  /** Bảng Alpha đã loại dereg (thường là `alpha.rows`). */
  rows: SubnetRow[];
  className?: string;
}

const PERIOD_LABEL: Record<MarketChangeField, MessageKey> = {
  price_change_1_hour: 'market.h1',
  price_change_1_day: 'market.d1',
  price_change_1_week: 'market.w1',
  price_change_1_month: 'market.m1',
};

/**
 * Thanh chỉ số thị trường Alpha: trung bình đều % 1H/1D/1W/1M
 * trên mọi subnet trừ uid 0 và dereg list.
 */
export function MarketIndexBar({ rows, className }: MarketIndexBarProps) {
  const { t } = useLocale();
  const index = useMemo(() => computeAlphaMarketIndex(rows), [rows]);

  if (!index.count) return null;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-surface px-4 py-2 shadow-card animate-fade-in',
        className
      )}
      title={t('market.hint', { count: index.count })}
    >
      <span className="eyebrow shrink-0 text-fg-muted">{t('market.title')}</span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {MARKET_CHANGE_FIELDS.map((field) => {
          const value = index.changes[field];
          return (
            <div key={field} className="flex items-baseline gap-1.5 text-xs">
              <span className="font-bold uppercase tracking-wider text-fg-faint">{t(PERIOD_LABEL[field])}</span>
              <SignedValue value={value} bold className="text-sm" />
            </div>
          );
        })}
      </div>
      <span className="ml-auto text-[10px] tabular-nums text-fg-faint">
        {t('market.sample', { count: index.count })}
      </span>
    </div>
  );
}
