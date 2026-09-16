import type { WeightMap } from '@/types';
import type { ReceiveMode } from '@/constants/editor';
import type { RedistributeResult } from '@/utils/portfolioMath';
import { Button } from '@/components/ui';
import { UndoIcon } from '@/components/icons';

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
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-warning/60 bg-warning/10 p-3 text-xs animate-slide-down">
      <div className="font-bold text-warning">
        Đã bỏ {removedIds.length} subnet · giải phóng <span className="tabular-nums">{removal.pool.toFixed(2)}%</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {removedIds.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1.5 rounded border border-line-strong bg-surface px-2 py-1 text-fg-muted animate-scale-in"
          >
            <span className="font-mono font-bold text-accent">#{id}</span>
            <span className="max-w-[110px] truncate">{subnetName(id)}</span>
            <span className="tabular-nums text-fg-faint">{(baseWeights[id] ?? 0).toFixed(2)}%</span>
            <button
              type="button"
              className="text-fg-faint transition-colors hover:text-positive"
              title="Khôi phục subnet này vào danh mục"
              onClick={() => onRestore(id)}
            >
              <UndoIcon size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-bold text-fg-muted">Chia tỷ trọng đó vào:</span>
        <label className="flex cursor-pointer items-center gap-1.5 text-fg">
          <input
            type="radio"
            className="accent-accent"
            checked={receiveMode === 'all'}
            onChange={() => onChangeReceiveMode('all')}
          />
          Tất cả subnet còn lại (chia đều)
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-fg">
          <input
            type="radio"
            className="accent-accent"
            checked={receiveMode === 'pick'}
            onChange={() => onChangeReceiveMode('pick')}
          />
          Subnet tôi chọn (tick cột “Nhận”)
        </label>
        <Button size="xs" variant="secondary" onClick={onSelectAllReceivers} title="Chia đều cho tất cả subnet còn lại" className="hover:border-positive hover:text-positive">
          ☑ Chọn tất cả
        </Button>
        <Button
          size="xs"
          variant="secondary"
          onClick={onClearReceivers}
          title="Không subnet nào nhận thêm — phần giải phóng sẽ được chuẩn hoá lại theo tỷ lệ hiện tại"
          className="hover:border-warning hover:text-warning"
        >
          ☐ Bỏ chọn tất cả
        </Button>
      </div>
      <div className="text-fg-muted">
        {!removal.remainingIds.length ? (
          'Không còn subnet nào trong danh mục.'
        ) : removal.targets.length ? (
          <>
            Mỗi subnet nhận thêm <b className="tabular-nums text-fg">{removal.share.toFixed(4)}%</b> (
            {removal.targets.length}/{removal.remainingIds.length} subnet nhận).
          </>
        ) : (
          <span className="text-warning">
            Không subnet nào nhận → giữ nguyên tỷ trọng hiện tại của {removal.remainingIds.length} subnet còn lại;{' '}
            {removal.pool.toFixed(2)}% giải phóng sẽ được chuẩn hoá lại theo đúng tỷ lệ giữa chúng khi bấm ÁP DỤNG.
          </span>
        )}
      </div>
    </div>
  );
}
