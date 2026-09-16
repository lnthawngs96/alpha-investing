import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/classNames';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Nền chìm hơn (dùng cho card lồng bên trong card). */
  inset?: boolean;
  /** Viền nét đứt — dùng cho trạng thái rỗng. */
  dashed?: boolean;
}

/** Khối surface có viền và bo góc — đơn vị bố cục cơ bản của app. */
export function Card({ inset, dashed, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-colors duration-300',
        inset ? 'bg-surface-raised border-line' : 'bg-surface border-line shadow-card',
        dashed && 'border-dashed border-line-strong shadow-none',
        className
      )}
      {...rest}
    />
  );
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Có đường kẻ dưới hay không. */
  divided?: boolean;
}

/** Thanh tiêu đề của card: nền nhạt, có thể click (collapse). */
export function CardHeader({ divided = true, className, ...rest }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-5 py-3 bg-surface-raised/70 rounded-t-xl',
        divided && 'border-b border-line',
        className
      )}
      {...rest}
    />
  );
}
