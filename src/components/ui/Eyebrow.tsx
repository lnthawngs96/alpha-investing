import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/classNames';

/** Nhãn mục nhỏ (chữ hoa, cách chữ) — tiêu đề của một section trong card. */
export function Eyebrow({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('eyebrow flex items-center gap-1.5', className)} {...rest} />;
}
