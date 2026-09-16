import type { MetricKey } from '@/types';
import { CHANGE_OPTIONS, TOP_N_MAX } from '@/constants/portfolio';
import { Eyebrow, Select } from '@/components/ui';

export interface SelectionGroupFieldsProps {
  /** Tiêu đề nhóm (vd "Nhóm 1"). */
  title: string;
  /** Số subnet — giữ dạng chuỗi để người dùng gõ tự do, clamp khi blur. */
  count: string;
  onCountChange: (value: string) => void;
  onCountBlur: () => void;
  changeKey: MetricKey;
  onChangeKey: (key: MetricKey) => void;
  /** Tiêu chí đã bị nhóm kia dùng → disable để hai nhóm không trùng. */
  disabledKey: MetricKey;
}

/** Một hàng cấu hình nhóm generate: số subnet + tiêu chí xếp hạng. */
export function SelectionGroupFields({
  title,
  count,
  onCountChange,
  onCountBlur,
  changeKey,
  onChangeKey,
  disabledKey,
}: SelectionGroupFieldsProps) {
  return (
    <div className="flex shrink-0 flex-col gap-2">
      <Eyebrow>
        {title} · số subnet + điều kiện (tối đa {TOP_N_MAX})
      </Eyebrow>
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          max={TOP_N_MAX}
          value={count}
          onChange={(e) => onCountChange(e.target.value)}
          onBlur={onCountBlur}
          className="field w-24 font-mono tabular-nums"
        />
        <Select value={changeKey} onChange={(e) => onChangeKey(e.target.value as MetricKey)} className="flex-1">
          {CHANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.value === disabledKey}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
