import { TIER_ORDER } from '@/constants/tiers';
import type { SubnetTiers, TierStats } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
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
  const { config: TIERS, names, unit } = tiers;
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-surface-raised/60 p-3 text-xs animate-fade-in">
      <Eyebrow className="text-fg-faint">
        Phân loại theo data table · top ⚡{topEmissionN} {names.primary} · top 💧{topLiquidityN} {names.secondary}
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
            <div className="tabular-nums opacity-80">{stats[tier].weight.toFixed(2)}% tỷ trọng</div>
          </div>
        ))}
      </div>
      <div className="text-fg-muted">
        {stats.none.count ? (
          <>
            → <b className="text-negative">{stats.none.count} {unit} ngoài top</b> đang chiếm{' '}
            <b className="tabular-nums text-negative">{stats.none.weight.toFixed(2)}%</b> — cân nhắc cashout và dồn sang
            nhóm ⚡💧.
          </>
        ) : (
          <>→ Toàn bộ {unit} đều thuộc top {names.primary} hoặc top {names.secondary}.</>
        )}
        {stats.emission.count > 0 && (
          <>
            {' '}
            Nhóm <span className="text-warning">⚡ chỉ {names.primary}</span> {names.secondary} thấp — thoát hàng dễ bị slippage.
          </>
        )}
      </div>
    </div>
  );
}
