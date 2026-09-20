import type { MetricKey } from '@/types';
import { CHANGE_OPTIONS, TOP_N_MAX } from '@/constants/portfolio';
import { cn } from '@/utils/classNames';
import { Button, Eyebrow } from '@/components/ui';
import { TrashIcon } from '@/components/icons';

export interface SelectionGroupFieldsProps {
  /** Tiêu đề nhóm (vd "Nhóm 1"). */
  title: string;
  /** Số subnet — giữ dạng chuỗi để người dùng gõ tự do, clamp khi blur. */
  count: string;
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  /** Các tiêu chí đã chọn trong nhóm (ít nhất 1). */
  changeKeys: MetricKey[];
  onChangeKeys: (keys: MetricKey[]) => void;
  /** Tiêu chí các nhóm khác đang dùng → disable để không trùng option. */
  disabledKeys?: readonly MetricKey[];
  /** Cho phép xoá nhóm (ẩn khi chỉ còn 1 nhóm). */
  canRemove?: boolean;
  onRemove?: () => void;
}

/** Một khối cấu hình nhóm generate: số subnet + nhiều tiêu chí xếp hạng. */
export function SelectionGroupFields({
  title,
  count,
  onCountChange,
  onCountBlur,
  changeKeys,
  onChangeKeys,
  disabledKeys = [],
  canRemove = false,
  onRemove,
}: SelectionGroupFieldsProps) {
  const disabled = new Set(disabledKeys);

  function toggleKey(key: MetricKey) {
    if (disabled.has(key)) return;
    if (changeKeys.includes(key)) {
      if (changeKeys.length <= 1) return; // luôn giữ ít nhất 1 tiêu chí
      onChangeKeys(changeKeys.filter((k) => k !== key));
      return;
    }
    onChangeKeys([...changeKeys, key]);
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <Eyebrow>
          {title} · tối đa {TOP_N_MAX} subnet
        </Eyebrow>
        {canRemove && onRemove && (
          <Button
            size="xs"
            variant="secondary"
            icon={<TrashIcon size={12} />}
            onClick={onRemove}
            className="hover:border-negative hover:text-negative"
            title="Xoá nhóm này"
          >
            Xoá
          </Button>
        )}
      </div>
      <input
        type="number"
        min="1"
        max={TOP_N_MAX}
        value={count}
        onChange={(e) => onCountChange(e.target.value)}
        onBlur={onCountBlur}
        className="field w-24 font-mono tabular-nums"
      />
      <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-sunken/40 p-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
          Tiêu chí · chọn một hoặc nhiều
        </span>
        <div className="flex flex-col gap-0.5">
          {CHANGE_OPTIONS.map((opt) => {
            const checked = changeKeys.includes(opt.value);
            const isDisabled = disabled.has(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-fg',
                  isDisabled && 'cursor-not-allowed opacity-40',
                  checked && !isDisabled && 'bg-accent/10 text-accent'
                )}
                title={isDisabled ? 'Đã dùng ở nhóm khác' : opt.label}
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={checked}
                  disabled={isDisabled}
                  onChange={() => toggleKey(opt.value)}
                />
                <span className="leading-snug">{opt.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
