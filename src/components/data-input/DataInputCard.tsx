import { useState } from 'react';
import type { AlphaSubnetData } from '@/hooks/useAlphaSubnetData';
import { SAMPLE_SUBNETS } from '@/constants/sampleSubnets';
import { cn } from '@/utils/classNames';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { CheckIcon, ChevronIcon, RefreshIcon, SparklesIcon, XIcon } from '@/components/icons';

export interface DataInputCardProps {
  alpha: AlphaSubnetData;
}

/**
 * Card dữ liệu Alpha: tự tải bảng subnet từ TaoMarketCap (SSE) + dereg từ
 * api.investing88.ai/assets. Không cần dán JSON; vẫn có nút sample / clear.
 */
export function DataInputCard({ alpha }: DataInputCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { rows, totalCount, deregIds, status, error, fetchedAt } = alpha;
  const loading = status === 'loading';

  function handleReload() {
    alpha.reload().catch(() => {
      /* lỗi đã hiện trong card */
    });
  }

  function handleLoadSample() {
    alpha.applyManual([...SAMPLE_SUBNETS]);
    setCollapsed(true);
  }

  function handleClear() {
    alpha.clear();
    setCollapsed(false);
  }

  const statusText =
    status === 'loading'
      ? 'Đang tải từ taomarketcap.com…'
      : status === 'error'
        ? `Không tải được: ${error}`
        : status === 'ready'
          ? `Đã lấy từ taomarketcap.com${fetchedAt ? ` lúc ${fetchedAt.toLocaleTimeString('vi-VN')}` : ''} · ${totalCount} subnet, loại ${totalCount - rows.length} (dereg/cố định)`
          : 'Chưa tải';

  const deregHint =
    status === 'loading'
      ? 'Đang tải kèm bảng subnet…'
      : deregIds.length > 0
        ? 'Đã lấy từ api.investing88.ai/assets'
        : status === 'error'
          ? 'Không tải được — dereg rỗng'
          : 'Lấy từ api.investing88.ai/assets';

  return (
    <Card className="overflow-hidden animate-slide-up">
      <CardHeader
        divided={!collapsed}
        className="cursor-pointer select-none hover:bg-surface-raised"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <ChevronIcon size={15} open={!collapsed} className="text-accent" />
          <span className="eyebrow">Data input · Alpha</span>
          {rows.length > 0 && (
            <Badge tone="positive" className="animate-scale-in">
              <CheckIcon size={11} strokeWidth={2.5} />
              {rows.length} subnets
            </Badge>
          )}
        </div>
        <span className={cn('text-[11px]', status === 'error' ? 'text-negative' : 'text-fg-faint')}>
          Tự tải từ TaoMarketCap — không cần dán JSON
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
              <Button
                variant="accent"
                icon={<SparklesIcon size={14} animated />}
                onClick={handleLoadSample}
                disabled={loading}
                title="Nạp 40 subnet mẫu (dữ liệu hư cấu) để dùng thử ngay"
              >
                Load sample data
              </Button>
              {rows.length > 0 && (
                <Button
                  variant="secondary"
                  icon={<XIcon size={13} />}
                  onClick={handleClear}
                  className="hover:text-negative hover:border-negative"
                >
                  Clear
                </Button>
              )}
              <span className={cn('text-xs', status === 'error' ? 'text-negative' : 'text-fg-muted')}>
                {statusText}
              </span>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="eyebrow">Dereg list</span>
                <span className="text-[11px] text-fg-faint">{deregHint}</span>
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
