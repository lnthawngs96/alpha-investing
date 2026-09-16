import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/classNames';

/** Kiểu nút theo ngữ nghĩa hành động. */
export type ButtonVariant =
  | 'primary' // hành động chính — nền accent
  | 'secondary' // hành động phụ — viền, chữ muted
  | 'ghost' // không viền, chỉ chữ
  | 'accent' // viền + chữ accent, hover đổ nền accent
  | 'success' // viền + chữ positive, hover đổ nền
  | 'danger' // viền + chữ negative, hover đổ nền
  | 'warning'; // viền + chữ warning

export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon đứng trước nhãn. Nút có class `group` nên icon hover-animated hoạt động. */
  icon?: ReactNode;
  /** Icon đứng sau nhãn. */
  trailingIcon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent border-accent shadow-[0_6px_18px_-8px_var(--accent)] hover:bg-accent-strong hover:border-accent-strong hover:shadow-[0_8px_22px_-8px_var(--accent)] active:translate-y-px',
  secondary:
    'bg-transparent text-fg-muted border-line-strong hover:text-fg hover:border-fg-faint hover:bg-surface-raised',
  ghost: 'bg-transparent text-fg-muted border-transparent hover:text-fg hover:bg-surface-raised',
  accent: 'bg-accent/10 text-accent border-accent hover:bg-accent hover:text-on-accent',
  success: 'bg-positive/10 text-positive border-positive hover:bg-positive hover:text-canvas',
  danger: 'bg-negative/10 text-negative border-negative/70 hover:bg-negative hover:text-canvas',
  warning: 'bg-warning/10 text-warning border-warning/70 hover:bg-warning hover:text-canvas',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-[11px] gap-1 rounded-md',
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-4 py-2 text-xs gap-2 rounded-lg',
};

/**
 * Nút bấm thống nhất toàn app: chữ hoa nhỏ, cách chữ, viền 1px, hiệu ứng
 * hover/active mượt. Dùng `icon` để gắn icon đầu; nút tự có class `group`
 * nên các icon dạng hover-animated (RefreshIcon, UploadIcon…) sẽ chạy.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  trailingIcon,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'group inline-flex items-center justify-center whitespace-nowrap border font-bold uppercase tracking-[0.08em] cursor-pointer select-none',
        'transition-all duration-200 ease-out',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
      {trailingIcon}
    </button>
  );
}
