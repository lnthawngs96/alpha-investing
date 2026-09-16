import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/classNames';

export type IconButtonTone = 'neutral' | 'accent' | 'positive' | 'negative';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Màu khi hover. */
  tone?: IconButtonTone;
  /** Nhãn cho screen reader + tooltip. */
  label: string;
}

const TONE_CLASS: Record<IconButtonTone, string> = {
  neutral: 'hover:text-fg hover:bg-surface-raised',
  accent: 'hover:text-accent hover:bg-accent/10',
  positive: 'hover:text-positive hover:bg-positive/10',
  negative: 'hover:text-negative hover:bg-negative/10',
};

/** Nút chỉ có icon, vuông, dùng cho các thao tác phụ (đóng, sửa tên, xoá…). */
export function IconButton({ tone = 'neutral', label, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'group inline-flex items-center justify-center w-7 h-7 rounded-md text-fg-faint cursor-pointer',
        'transition-all duration-200 active:scale-90',
        'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-fg-faint',
        TONE_CLASS[tone],
        className
      )}
      {...rest}
    />
  );
}
