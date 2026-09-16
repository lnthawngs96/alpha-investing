import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/utils/classNames';
import { ChevronIcon } from '@/components/icons';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Dropdown native với mũi tên tuỳ biến và style `.field` thống nhất. */
export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <span className={cn('relative inline-flex min-w-0', className)}>
      <select
        className="field w-full appearance-none pr-8 cursor-pointer hover:border-line-strong"
        {...rest}
      >
        {children}
      </select>
      <ChevronIcon
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-faint"
      />
    </span>
  );
}
