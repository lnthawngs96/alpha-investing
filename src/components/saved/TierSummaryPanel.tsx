import { TIER_ORDER, TIERS } from '@/constants/tiers';
import type { TierStats } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { Eyebrow } from '@/components/ui';

export interface TierSummaryPanelProps {
  stats: TierStats;
  topEmissionN: number;
  topLiquidityN: number;
}

/** Bảng 4 ô tổng hợp phân loại của một danh mục + lời khuyên cashout. */
export function TierSummaryPanel({ stats, topEmissionN, topLiquidityN }: TierSummaryPanelProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-line bg-surface-raised/60 p-3 text-xs animate-fade-in">
      <Eyebrow className="text-fg-faint">
        Phân loại theo data table · top ⚡{topEmissionN} emission · top 💧{topLiquidityN} thanh khoản
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
              <b>{stats[tier].count}</b> subnet
            </div>
            <div className="tabular-nums opacity-80">{stats[tier].weight.toFixed(2)}% tỷ trọng</div>
          </div>
        ))}
      </div>
      <div className="text-fg-muted">
        {stats.none.count ? (
          <>
            → <b className="text-negative">{stats.none.count} subnet ngoài top</b> đang chiếm{' '}
            <b className="tabular-nums text-negative">{stats.none.weight.toFixed(2)}%</b> — cân nhắc cashout và dồn sang
            nhóm ⚡💧.
          </>
        ) : (
          <>→ Toàn bộ subnet đều thuộc top emission hoặc top thanh khoản.</>
        )}
        {stats.emission.count > 0 && (
          <>
            {' '}
            Nhóm <span className="text-warning">⚡ chỉ emission</span> thanh khoản thấp — thoát hàng dễ bị slippage.
          </>
        )}
      </div>
    </div>
  );
}
