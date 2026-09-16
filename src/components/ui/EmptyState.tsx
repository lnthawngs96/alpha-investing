import type { ReactNode } from 'react';
import { cn } from '@/utils/classNames';
import { Card } from './Card';

export interface EmptyStateProps {
  /** Icon lớn ở giữa (được bọc trong vòng tròn accent mờ). */
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Nút hành động bên dưới. */
  actions?: ReactNode;
  className?: string;
}

/** Trạng thái rỗng: card viền đứt, icon trong vòng tròn, mô tả ngắn và hành động. */
export function EmptyState({ icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <Card
      dashed
      className={cn(
        'flex flex-col items-center justify-center gap-4 p-8 text-center text-xs text-fg-muted animate-fade-in',
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent ring-1 ring-accent/30 animate-scale-in">
        {icon}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-sm font-semibold text-fg">{title}</div>
        {description && <div className="max-w-md leading-relaxed">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </Card>
  );
}
