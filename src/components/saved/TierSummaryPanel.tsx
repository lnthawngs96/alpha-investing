import { TIER_ORDER } from '@/constants/tiers';
import type { SubnetTiers, TierStats } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { useLocale } from '@/i18n';
import { Eyebrow } from '@/components/ui';

export interface TierSummaryPanelProps {
  stats: TierStats;
  topEmissionN: number;
  topLiquidityN: number;
  /** Nhãn nhóm / tên tiêu chí theo mục đầu tư. */
  tiers: Pick<SubnetTiers, 'config' | 'names' | 'unit'>;
}

/** Bảng 4 ô tổng hợp phân loại của một danh mục + lời khuyên cashout. */
export function TierSummaryPanel({ stats, topEmissionN, topLiquidityN, tiers }: TierSummaryPanelProps) {
  const { t } = useLocale();
  const { config: TIERS, names, unit } = tiers;
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-surface-raised/60 p-3 text-xs animate-fade-in">
      <Eyebrow className="text-fg-faint">
        {t('saved.classifyTitle', {
          eN: topEmissionN,
          lN: topLiquidityN,
          primary: names.primary,
          secondary: names.secondary,
        })}
      </Eyebrow>
      <div className="grid grid-cols-4 gap-2">
        {TIER_ORDER.map((tier, i) => (
          <div
            key={tier}
            className={cn(
              'flex flex-col gap-0.5 rounded border p-2 transition-colors duration-200 animate-scale-in',
              stats[tier].count ? TIERS[tier].box : 'border-line text-fg-faint'
            )}
            style={{ animationDelay: `${i * 40}ms` }}
            title={TIERS[tier].hint}
          >
            <div className="whitespace-nowrap font-bold">
              {TIERS[tier].chip} {TIERS[tier].label}
            </div>
            <div className="tabular-nums">
              <b>{stats[tier].count}</b> {unit}
            </div>
            <div className="tabular-nums opacity-80">
              {t('tiers.weightPct', { pct: stats[tier].weight.toFixed(2) })}
            </div>
          </div>
        ))}
      </div>
      <div className="text-fg-muted">
        {stats.none.count
          ? t('saved.outsideAdvice', {
              count: stats.none.count,
              unit,
              weight: stats.none.weight.toFixed(2),
            })
          : t('saved.allInTop', {
              unit,
              primary: names.primary,
              secondary: names.secondary,
            })}
        {stats.emission.count > 0 && (
          <>
            {' '}
            {t('saved.slippageAdvice', {
              primary: names.primary,
              secondary: names.secondary,
            })}
          </>
        )}
      </div>
    </div>
  );
}
