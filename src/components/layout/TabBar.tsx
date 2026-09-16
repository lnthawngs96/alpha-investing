import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { TabKey } from '@/types';
import { cn } from '@/utils/classNames';
import { Badge } from '@/components/ui';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: ReactNode;
  /** Số hiển thị trên badge; undefined → không hiện. */
  count?: number;
}

export interface TabBarProps {
  tabs: TabItem[];
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

/**
 * Thanh tab với vạch chỉ báo trượt mượt tới tab đang chọn.
 * Vị trí vạch được đo từ DOM (useLayoutEffect) nên tự đúng khi nhãn / số đếm đổi độ rộng.
 */
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const el = list.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`);
      if (!el) return;
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(list);
    return () => ro.disconnect();
  }, [active, tabs]);

  return (
    <div ref={listRef} role="tablist" className="relative flex shrink-0 gap-1 border-b border-line">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            data-tab={tab.key}
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={cn(
              'group relative flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.1em] cursor-pointer',
              'transition-colors duration-200 rounded-t-lg',
              isActive ? 'text-accent' : 'text-fg-muted hover:text-fg hover:bg-surface-raised/60'
            )}
          >
            <span
              className={cn(
                'transition-transform duration-300',
                isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:-rotate-6'
              )}
            >
              {tab.icon}
            </span>
            {tab.label}
            {tab.count !== undefined && (
              <Badge tone={isActive ? 'solid' : 'neutral'} className="ml-0.5 animate-scale-in">
                {tab.count}
              </Badge>
            )}
          </button>
        );
      })}
      {/* Vạch chỉ báo trượt */}
      {indicator && (
        <span
          aria-hidden
          className="absolute -bottom-px h-0.5 rounded-full bg-accent transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      )}
    </div>
  );
}
