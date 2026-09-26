import { useState } from 'react';
import type { UsStockData } from '@/hooks/useUsStockData';
import { cn } from '@/utils/classNames';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CheckIcon, ChevronIcon, RefreshIcon } from '@/components/icons';

export interface StockDataCardProps {
  stock: UsStockData;
}

/**
 * Card dữ liệu cổ phiếu Mỹ: không cần dán JSON — bảng lấy thẳng từ
 * api.investing88.ai/assets mỗi lần mở app (hoặc bấm tải lại). Cash ETFs
 * (mạng tính như tiền mặt) bị loại khỏi bảng, giống dereg list bên alpha.
 */
export function StockDataCard({ stock }: StockDataCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [cashError, setCashError] = useState('');
  const { rows, totalCount, excluded, cashText, status, error, fetchedAt } = stock;
  const loading = status === 'loading';

  function handleReload() {
    setCashError('');
    stock.reload().catch(() => {
      /* lỗi đã hiện trong card */
    });
  }

  function handleApplyCash() {
    setCashError(stock.applyCashText());
  }

  const statusText =
    status === 'loading'
      ? 'Đang tải từ api.investing88.ai/assets…'
      : status === 'error'
        ? `Không tải được: ${error}`
        : status === 'ready'
          ? `Đã lấy từ api.investing88.ai/assets${fetchedAt ? ` lúc ${fetchedAt.toLocaleTimeString('vi-VN')}` : ''} · ${totalCount} mã, loại ${totalCount - rows.length} cash ETF`
          : 'Chưa tải';

  return (
    <Card className="overflow-hidden animate-slide-up">
      <CardHeader
        divided={!collapsed}
        className="cursor-pointer select-none hover:bg-surface-raised"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon size={15} open={!collapsed} className="text-accent" />
          <span className="eyebrow">Data input · Cổ phiếu Mỹ</span>
          {rows.length > 0 && (
            <Badge tone="positive" className="animate-scale-in">
              <CheckIcon size={11} strokeWidth={2.5} />
              {rows.length} mã
            </Badge>
          )}
        </div>
        <span className={cn('text-[11px]', status === 'error' ? 'text-negative' : 'text-fg-faint')}>
          Tự tải mỗi lần mở app — không cần dán
        </span>
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
                Tải lại dữ liệu
              </Button>
              <span className={cn('text-xs', status === 'error' ? 'text-negative' : 'text-fg-muted')}>{statusText}</span>
            </div>

            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="eyebrow">Cash ETFs (loại khỏi bảng)</span>
                <span className={cn('text-[11px]', cashError ? 'text-negative' : 'text-fg-faint')}>
                  {cashError || `${excluded.length} mã · mạng tính như tiền mặt`}
                </span>
              </span>
              <textarea
                className="field w-full min-h-[2.75rem] resize-y font-mono text-code leading-relaxed p-3"
                placeholder='["SGOV", "BIL"]'
                value={cashText}
                onChange={(e) => {
                  stock.setCashText(e.target.value);
                  setCashError('');
                }}
                spellCheck={false}
                rows={2}
                disabled={loading}
              />
            </label>
            <div>
              <Button size="sm" variant="secondary" onClick={handleApplyCash} disabled={loading}>
                Áp dụng danh sách loại trừ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
