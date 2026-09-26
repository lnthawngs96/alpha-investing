import { useState } from 'react';
import type { AlphaSubnetData } from '@/hooks/useAlphaSubnetData';
import { useLocale } from '@/i18n';
import { cn } from '@/utils/classNames';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CheckIcon, ChevronIcon, RefreshIcon } from '@/components/icons';

export interface DataInputCardProps {
  alpha: AlphaSubnetData;
}

/** Card dữ liệu Alpha: tải từ API + hiển thị dereg list. */
export function DataInputCard({ alpha }: DataInputCardProps) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const { rows, deregIds, status, error } = alpha;
  const loading = status === 'loading';

  function handleReload() {
    alpha.reload().catch(() => {
      /* lỗi đã hiện trong card */
    });
  }

  return (
    <Card className="overflow-hidden animate-slide-up">
      <CardHeader
        divided={!collapsed}
        className="cursor-pointer select-none hover:bg-surface-raised"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon size={15} open={!collapsed} className="text-accent" />
          <span className="eyebrow">{t('dataAlpha.title')}</span>
          {rows.length > 0 && (
            <Badge tone="positive" className="animate-scale-in">
              <CheckIcon size={11} strokeWidth={2.5} />
              {t('dataAlpha.badge', { count: rows.length })}
            </Badge>
          )}
        </div>
        {status === 'error' && <span className="text-[11px] text-negative">{t('dataAlpha.error', { error })}</span>}
      </CardHeader>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                icon={<RefreshIcon size={13} className={cn(loading && 'animate-spin')} />}
                onClick={handleReload}
                disabled={loading}
              >
                {loading ? t('dataAlpha.loading') : t('dataAlpha.reload')}
              </Button>
            </div>

            <div>
              <div className="mb-1.5">
                <span className="eyebrow">{t('dataAlpha.dereg')}</span>
              </div>
              <p className="font-mono text-code leading-relaxed text-fg-muted">
                {loading ? '…' : JSON.stringify(deregIds)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
