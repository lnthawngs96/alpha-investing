import type { MetricKey } from '@/types';
import { TOP_N_MAX } from '@/constants/portfolio';
import { useAssetProfile } from '@/store/asset/context';
import { localizedMetricLabel, unitLabel, useLocale } from '@/i18n';
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

/** Một khối cấu hình nhóm generate: số subnet / mã + nhiều tiêu chí xếp hạng (theo mục đầu tư). */
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
  const { metricOptions, unit } = useAssetProfile();
  const { t, locale } = useLocale();
  const disabled = new Set(disabledKeys);
  void locale;

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
          {t('portfolio.groupMax', { title, max: TOP_N_MAX, unit: unitLabel(unit) })}
        </Eyebrow>
        {canRemove && onRemove && (
          <Button
            size="xs"
            variant="secondary"
            icon={<TrashIcon size={12} />}
            onClick={onRemove}
            className="hover:border-negative hover:text-negative"
            title={t('portfolio.removeGroupTitle')}
          >
            {t('portfolio.removeGroup')}
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
          {t('portfolio.criteriaHint')}
        </span>
        <div className="flex flex-col gap-0.5">
          {metricOptions.map((opt) => {
            const checked = changeKeys.includes(opt.value);
            const isDisabled = disabled.has(opt.value);
            const label = localizedMetricLabel(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-fg',
                  isDisabled && 'cursor-not-allowed opacity-40',
                  checked && !isDisabled && 'bg-accent/10 text-accent'
                )}
                title={isDisabled ? t('portfolio.metricUsed') : label}
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={checked}
                  disabled={isDisabled}
                  onChange={() => toggleKey(opt.value)}
                />
                <span className="leading-snug">{label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
