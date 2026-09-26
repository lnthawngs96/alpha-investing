import { useState } from 'react';
import type { UsStockData } from '@/hooks/useUsStockData';
import { useLocale } from '@/i18n';
import { cn } from '@/utils/classNames';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CheckIcon, ChevronIcon, RefreshIcon } from '@/components/icons';

export interface StockDataCardProps {
  stock: UsStockData;
}

/** Card dữ liệu cổ phiếu Mỹ: tải từ API + hiển thị cash ETFs bị loại. */
export function StockDataCard({ stock }: StockDataCardProps) {
  const { t } = useLocale();
  const [collapsed, setCollapsed] = useState(false);
  const { rows, excluded, status, error } = stock;
  const loading = status === 'loading';

  function handleReload() {
    stock.reload().catch(() => {
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
          <span className="eyebrow">{t('dataStock.title')}</span>
          {rows.length > 0 && (
            <Badge tone="positive" className="animate-scale-in">
              <CheckIcon size={11} strokeWidth={2.5} />
              {t('dataStock.badge', { count: rows.length })}
            </Badge>
          )}
        </div>
        {status === 'error' && <span className="text-[11px] text-negative">{t('dataStock.error', { error })}</span>}
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
                {loading ? t('dataStock.loading') : t('dataStock.reload')}
              </Button>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="eyebrow">{t('dataStock.cashEtfs')}</span>
                <span className="text-[11px] text-fg-faint">
                  {t('dataStock.cashHint', { count: excluded.length })}
                </span>
              </div>
              <p className="break-all font-mono text-code leading-relaxed text-fg-muted">
                {loading ? '…' : status === 'error' ? '—' : JSON.stringify(excluded)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
