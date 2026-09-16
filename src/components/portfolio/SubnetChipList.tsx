import type { SubnetRow } from '@/types';
import { formatMetric } from '@/utils/format';
import { toNumber } from '@/utils/numeric';
import { cn } from '@/utils/classNames';

export interface SubnetChipListProps {
  subnets: SubnetRow[];
  /** Chỉ số hiển thị bên phải mỗi chip (vd thanh khoản). */
  metricField?: string;
  className?: string;
}

/** Danh sách chip subnet (#id · tên · chỉ số), xuất hiện lần lượt (stagger). */
export function SubnetChipList({ subnets, metricField, className }: SubnetChipListProps) {
  return (
    <div className={className || 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto'}>
      {subnets.map((s, i) => {
        const val = metricField ? toNumber(s[metricField]) : NaN;
        const hasVal = !isNaN(val);
        return (
          <div
            key={String(s.netuid)}
            className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised px-3 py-2 transition-colors duration-200 hover:border-accent/50 animate-slide-up"
            style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
          >
            <span className="min-w-[36px] font-mono text-xs font-bold text-accent">#{s.netuid}</span>
            <span className="flex-1 truncate text-xs text-fg">{s.name || 'Unknown'}</span>
            {hasVal && (
              <span
                className={cn(
                  'shrink-0 font-mono text-xs font-bold tabular-nums',
                  val >= 0 ? 'text-positive' : 'text-negative'
                )}
              >
                {formatMetric(val, metricField)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
