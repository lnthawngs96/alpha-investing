import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/classNames';

export type BadgeTone = 'accent' | 'positive' | 'negative' | 'warning' | 'info' | 'neutral' | 'solid';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Kích thước chữ nhỏ hơn (10px) cho badge trong bảng. */
  tiny?: boolean;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  accent: 'border-accent/60 bg-accent/10 text-accent',
  positive: 'border-positive/60 bg-positive/10 text-positive',
  negative: 'border-negative/60 bg-negative/10 text-negative',
  warning: 'border-warning/60 bg-warning/10 text-warning',
  info: 'border-info/60 bg-info/10 text-info',
  neutral: 'border-line-strong bg-surface-raised text-fg-muted',
  /** Nền accent đặc — dùng cho số đếm trên tab. */
  solid: 'border-transparent bg-accent text-on-accent',
};

/** Nhãn nhỏ dạng pill: số đếm, trạng thái, phân loại. */
export function Badge({ tone = 'neutral', tiny, className, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-bold tabular-nums whitespace-nowrap',
        'transition-colors duration-200',
        tiny ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        TONE_CLASS[tone],
        className
      )}
      {...rest}
    />
  );
}
