import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { DropletIcon, ZapIcon } from '@/components/icons';

export interface TierCellProps {
  netuid: string | number;
  tiers: SubnetTiers;
}

/**
 * Ô "Nhóm" trong bảng chi tiết: badge thứ hạng ⚡ emission và 💧 thanh khoản
 * theo data table hiện tại; ngoài top thì badge đỏ kèm hạng (nếu có).
 */
export function TierCell({ netuid, tiers }: TierCellProps) {
  if (!tiers.canRank) return <span className="text-fg-faint">—</span>;
  const { eRank, lRank, topE, topL, tier } = tiers.classify(netuid);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const title =
    `${tiers.config[tier].hint}\n` +
    `${cap(tiers.names.primary)}: ${eRank != null ? `hạng #${eRank}` : 'không có trong data table'} (top ${tiers.topEmissionN})\n` +
    `${cap(tiers.names.secondary)}: ${lRank != null ? `hạng #${lRank}` : 'không có trong data table'} (top ${tiers.topLiquidityN})`;

  if (tier === 'none') {
    return (
      <span
        className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold', tiers.config.none.box)}
        title={title}
      >
        ✕ NGOÀI TOP
        {(eRank != null || lRank != null) && (
          <span className="ml-1 inline-flex items-center gap-0.5 font-normal tabular-nums text-fg-muted">
            <ZapIcon size={10} />
            {eRank ?? '–'}/<DropletIcon size={10} />
            {lRank ?? '–'}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex gap-1 whitespace-nowrap" title={title}>
      {topE && (
        <span className="inline-flex items-center gap-0.5 rounded border border-warning/60 bg-warning/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-warning">
          <ZapIcon size={10} />#{eRank}
        </span>
      )}
      {topL && (
        <span className="inline-flex items-center gap-0.5 rounded border border-info/60 bg-info/10 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-info">
          <DropletIcon size={10} />#{lRank}
        </span>
      )}
    </span>
  );
}
