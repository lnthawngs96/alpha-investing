import { useState, useSyncExternalStore } from 'react';
import { clearAgentLog, getAgentLogSnapshot, subscribeAgentLog } from '@/store/agentLog';
import { isWebMCPAvailable } from '@/webmcp/useWebMCP';
import { useLocale } from '@/i18n';
import { cn } from '@/utils/classNames';
import { IconButton } from '@/components/ui';
import { BotIcon, CheckIcon, EraserIcon, XIcon } from '@/components/icons';

/**
 * Bảng theo dõi hành động của agent (nổi góc dưới phải).
 *
 * Đây là nửa "con người" của bài toán human + agent: agent sửa danh mục qua
 * tool, còn người dùng cần thấy nó vừa làm gì để can thiệp kịp. Không có bảng
 * này thì trọng số tự nhảy mà không rõ lý do.
 */
export function AgentActivityLog() {
  const entries = useSyncExternalStore(subscribeAgentLog, getAgentLogSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const available = isWebMCPAvailable();
  const { t, dateLocale } = useLocale();

  if (collapsed) {
    return (
      <button
        type="button"
        className={cn(
          'group fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-accent/50 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent shadow-card cursor-pointer',
          'transition-all duration-200 hover:bg-accent/10 hover:shadow-[0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)] animate-scale-in'
        )}
        onClick={() => setCollapsed(false)}
      >
        <BotIcon size={15} animated={available} />
        Agent
        {entries.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-[10px] text-on-accent">{entries.length}</span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-h-96 w-80 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card animate-slide-up">
      <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface-raised/70 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className={cn('h-2 w-2 rounded-full', available ? 'bg-positive animate-pulse-ring' : 'bg-fg-faint')}
            title={available ? t('header.webmcpOnTitle') : t('header.webmcpOffTitle')}
          />
          <BotIcon size={14} className="text-accent" animated={available} />
          <span className="eyebrow">{t('agent.title')}</span>
        </div>
        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <IconButton label={t('agent.clear')} onClick={clearAgentLog}>
              <EraserIcon size={14} />
            </IconButton>
          )}
          <IconButton label={t('agent.collapse')} onClick={() => setCollapsed(true)}>
            <XIcon size={14} />
          </IconButton>
        </div>
      </div>

      <div className="show-scrollbar min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="whitespace-pre-line px-4 py-6 text-center text-xs leading-relaxed text-fg-faint">
            {available ? t('agent.emptyOn') : t('agent.emptyOff')}
          </div>
        ) : (
          entries.map((e, i) => (
            <div
              key={e.id}
              className="flex items-start gap-2.5 border-b border-line px-4 py-2 last:border-b-0 animate-slide-down"
              style={{ animationDelay: `${Math.min(i, 6) * 30}ms` }}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                  e.ok ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative'
                )}
              >
                {e.ok ? <CheckIcon size={10} strokeWidth={3} /> : <XIcon size={10} strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="break-words text-xs leading-relaxed text-fg">{e.summary}</div>
                <div className="mt-0.5 font-mono text-[10px] text-fg-faint">
                  {e.tool} · {e.at.toLocaleTimeString(dateLocale)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
