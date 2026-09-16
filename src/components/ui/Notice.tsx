import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/classNames';
import { AlertIcon, CheckCircleIcon, InfoIcon, XCircleIcon, XIcon } from '@/components/icons';
import { IconButton } from './IconButton';

export type NoticeTone = 'success' | 'error' | 'warning' | 'info';

export interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone: NoticeTone;
  /** Hàm đóng — có thì hiện nút ✕ bên phải. */
  onDismiss?: () => void;
  /** Bỏ icon mặc định (khi nội dung đã tự có ký hiệu). */
  hideIcon?: boolean;
  /** Nội dung phụ bên phải (nút hành động…). */
  actions?: ReactNode;
}

const TONE_CLASS: Record<NoticeTone, string> = {
  success: 'border-positive/60 bg-positive/10 text-positive',
  error: 'border-negative/60 bg-negative/10 text-negative',
  warning: 'border-warning/60 bg-warning/10 text-warning',
  info: 'border-info/60 bg-info/10 text-info',
};

const TONE_ICON: Record<NoticeTone, ReactNode> = {
  success: <CheckCircleIcon size={15} />,
  error: <XCircleIcon size={15} />,
  warning: <AlertIcon size={15} />,
  info: <InfoIcon size={15} />,
};

/**
 * Thông báo nội tuyến (banner): kết quả lưu, lỗi nhập file, cảnh báo…
 * Tự animate trượt xuống khi xuất hiện; lỗi thì lắc nhẹ để gây chú ý.
 */
export function Notice({ tone, onDismiss, hideIcon, actions, className, children, ...rest }: NoticeProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs leading-relaxed',
        'animate-slide-down',
        tone === 'error' && 'animate-shake',
        TONE_CLASS[tone],
        className
      )}
      {...rest}
    >
      {!hideIcon && <span className="mt-px shrink-0">{TONE_ICON[tone]}</span>}
      <div className="min-w-0 flex-1">{children}</div>
      {actions}
      {onDismiss && (
        <IconButton label="Đóng" onClick={onDismiss} className="-my-1 -mr-1 text-current opacity-70 hover:opacity-100">
          <XIcon size={14} />
        </IconButton>
      )}
    </div>
  );
}
