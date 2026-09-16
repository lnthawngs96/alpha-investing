import { cn } from '@/utils/classNames';

export interface SignedValueProps {
  /** Giá trị số; null/NaN → hiện "—". */
  value: number | null | undefined;
  /** Hàm định dạng chuỗi hiển thị (mặc định: ±x.xx%). */
  format?: (n: number) => string;
  /** In đậm. */
  bold?: boolean;
  className?: string;
}

/** Số có dấu tô màu theo dấu: dương → positive, âm → negative, 0 → faint. */
export function SignedValue({ value, format, bold, className }: SignedValueProps) {
  if (value == null || isNaN(value)) return <span className="text-fg-faint">—</span>;
  const tone = value > 0 ? 'text-positive' : value < 0 ? 'text-negative' : 'text-fg-faint';
  const text = format ? format(value) : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  return <span className={cn('tabular-nums', tone, bold && 'font-bold', className)}>{text}</span>;
}
