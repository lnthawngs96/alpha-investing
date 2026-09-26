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
 * (mạng tính như tiền mặt) bị loại khỏi bảng, giống dereg list bên alpha —
 * chỉ hiển thị, không cần điền.
 */
export function StockDataCard({ stock }: StockDataCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { rows, totalCount, excluded, status, error, fetchedAt } = stock;
  const loading = status === 'loading';

  function handleReload() {
    stock.reload().catch(() => {
      /* lỗi đã hiện trong card */
    });
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

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="eyebrow">Cash ETFs (loại khỏi bảng)</span>
                <span className="text-[11px] text-fg-faint">
                  {excluded.length} mã · mạng tính như tiền mặt
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
