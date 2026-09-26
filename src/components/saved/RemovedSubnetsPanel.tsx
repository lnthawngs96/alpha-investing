import type { WeightMap } from '@/types';
import type { ReceiveMode } from '@/constants/editor';
import type { RedistributeResult } from '@/utils/portfolioMath';
import { unitLabel, unitNoun, useLocale } from '@/i18n';
import { Button } from '@/components/ui';
import { UndoIcon } from '@/components/icons';
import { formatAssetId } from '@/constants/assets';
import { useAssetProfile } from '@/store/asset/context';

export interface RemovedSubnetsPanelProps {
  removedIds: string[];
  baseWeights: WeightMap;
  /** Kết quả tầng "removal" của bản nháp. */
  removal: RedistributeResult;
  receiveMode: ReceiveMode;
  subnetName: (id: string) => string;
  onRestore: (id: string) => void;
  onChangeReceiveMode: (mode: ReceiveMode) => void;
  onSelectAllReceivers: () => void;
  onClearReceivers: () => void;
}

/**
 * Bảng "Đã bỏ N subnet": chip từng subnet đã bỏ (khôi phục được), chọn cách chia
 * phần tỷ trọng giải phóng và mô tả kết quả chia.
 */
export function RemovedSubnetsPanel({
  removedIds,
  baseWeights,
  removal,
  receiveMode,
  subnetName,
  onRestore,
  onChangeReceiveMode,
  onSelectAllReceivers,
  onClearReceivers,
}: RemovedSubnetsPanelProps) {
  const profile = useAssetProfile();
  const { t } = useLocale();
  const unit = unitLabel(profile.unit);
  const noun = unitNoun(profile.unit);

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-warning/60 bg-warning/10 p-3 text-xs animate-slide-down">
      <div className="font-bold text-warning">
        {t('saved.removedBanner', {
          count: removedIds.length,
          unit,
          pool: removal.pool.toFixed(2),
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {removedIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded border border-line-strong bg-surface px-2 py-1 text-fg-muted animate-scale-in"
          >
            <span className="font-mono font-bold text-accent">{formatAssetId(profile, id)}</span>
            <span className="max-w-[110px] truncate">{subnetName(id)}</span>
            <span className="tabular-nums text-fg-faint">{(baseWeights[id] ?? 0).toFixed(2)}%</span>
            <button
              type="button"
              className="text-fg-faint transition-colors hover:text-positive"
              title={t('saved.restoreTitle', { unit })}
              onClick={() => onRestore(id)}
            >
              <UndoIcon size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-bold text-fg-muted">{t('saved.redistributeInto')}</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-fg">
          <input
            type="radio"
            className="accent-accent"
            checked={receiveMode === 'all'}
            onChange={() => onChangeReceiveMode('all')}
          />
          {t('saved.receiveAll', { unit })}
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-fg">
          <input
            type="radio"
            className="accent-accent"
            checked={receiveMode === 'pick'}
            onChange={() => onChangeReceiveMode('pick')}
          />
          {t('saved.receivePick', { label: noun })}
        </label>
        <Button
          size="xs"
          variant="secondary"
          onClick={onSelectAllReceivers}
          title={t('saved.selectAllTitle', { unit })}
          className="hover:border-positive hover:text-positive"
        >
          {t('saved.selectAll')}
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={onClearReceivers}
          title={t('saved.clearReceiversTitle', { unit })}
          className="hover:border-warning hover:text-warning"
        >
          {t('saved.clearAll')}
        </Button>
      </div>
      <div className="text-fg-muted">
        {!removal.remainingIds.length ? (
          t('saved.noUnitsLeft', { unit })
        ) : removal.targets.length ? (
          t('saved.eachReceives', {
            unit,
            share: removal.share.toFixed(4),
            targets: removal.targets.length,
            remaining: removal.remainingIds.length,
          })
        ) : (
          <span className="text-warning">
            {t('saved.noneReceives', {
              unit,
              remaining: removal.remainingIds.length,
              pool: removal.pool.toFixed(2),
            })}
          </span>
        )}
      </div>
    </div>
  );
}
