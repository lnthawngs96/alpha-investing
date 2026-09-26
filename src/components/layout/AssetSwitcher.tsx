import type { AssetKey } from '@/types';
import { ASSET_KEYS, ASSET_PROFILES } from '@/constants/assets';
import { cn } from '@/utils/classNames';
import { Badge } from '@/components/ui';
import { CoinsIcon, LayersIcon } from '@/components/icons';

export interface AssetSwitcherProps {
  value: AssetKey;
  onChange: (asset: AssetKey) => void;
  /** Số dòng dữ liệu đã nạp của từng mục (hiện trên badge). */
  counts: Record<AssetKey, number>;
}

const ICONS: Record<AssetKey, typeof LayersIcon> = { alpha: LayersIcon, stock: CoinsIcon };

/** Công tắc hai mục đầu tư của Subnet 88: Alpha (asset class 0) / Cổ phiếu Mỹ (asset class 1). */
export function AssetSwitcher({ value, onChange, counts }: AssetSwitcherProps) {
  return (
    <div role="radiogroup" aria-label="Mục đầu tư" className="inline-flex shrink-0 self-start rounded-xl border border-line bg-surface p-1 shadow-card">
      {ASSET_KEYS.map((key) => {
        const active = key === value;
        const Icon = ICONS[key];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] transition-colors duration-200',
              active ? 'bg-accent/15 text-accent' : 'text-fg-muted hover:bg-surface-raised hover:text-fg'
            )}
          >
            <Icon size={14} />
            {ASSET_PROFILES[key].label}
            <span className="font-mono text-[10px] font-normal normal-case tracking-normal opacity-70">
              _:{ASSET_PROFILES[key].assetClass}
            </span>
            {counts[key] > 0 && (
              <Badge tone={active ? 'solid' : 'neutral'} tiny>
                {counts[key]}
              </Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
