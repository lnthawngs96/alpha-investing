import { Fragment } from 'react';
import type { SavedPortfolioRecord } from '@/types';
import type { DraftComputation } from '@/hooks/useSavedPortfolioEditor';
import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { Button, NumericTextInput, SignedValue } from '@/components/ui';
import { XIcon } from '@/components/icons';
import { TierCell } from './TierBadge';
import type { DetailSection } from './types';

export interface PortfolioDetailTableProps {
  saved: SavedPortfolioRecord;
  sections: DetailSection[];
  /** Tổng số dòng (để chặn xoá dòng cuối / xoá cả nhóm khi không còn gì). */
  rowCount: number;
  isEditingWeights: boolean;
  /** Bản nháp (chỉ khi đang sửa). */
  draft: DraftComputation | null;
  hasRemoved: boolean;
  addedIds: string[];
  addTakePct: number;
  weightDrafts: Record<string, string>;
  /** Tổng % người dùng nhập (trước khi chuẩn hoá về 100%). */
  draftSum: number;
  /** Lợi nhuận danh mục theo tỷ trọng (null nếu thiếu giá). */
  portfolioReturn: number | null;
  tiers: SubnetTiers;
  onUpdateWeightDraft: (netuid: string, value: string) => void;
  onRemoveSubnet: (netuid: string) => void;
  onRemoveGroup: (netuids: string[]) => void;
  onToggleReceiver: (netuid: string) => void;
}

/**
 * Bảng chi tiết một danh mục đã lưu, chia section theo nhóm generate.
 * Ở chế độ sửa: ô nhập tỷ trọng, cột "Nhận" (khi có subnet bị bỏ), nút xoá.
 */
export function PortfolioDetailTable({
  saved,
  sections,
  rowCount,
  isEditingWeights,
  draft,
  hasRemoved,
  addedIds,
  addTakePct,
  weightDrafts,
  draftSum,
  portfolioReturn,
  tiers,
  onUpdateWeightDraft,
  onRemoveSubnet,
  onRemoveGroup,
  onToggleReceiver,
}: PortfolioDetailTableProps) {
  const gridCols = isEditingWeights
    ? hasRemoved
      ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto]'
      : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto]'
    : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]';
  const headerCls = 'text-[11px] font-bold uppercase tracking-wider text-fg-faint';

  return (
    <div className={cn('grid gap-x-3 gap-y-2 text-xs', gridCols)}>
      <div className={headerCls}>ID</div>
      <div className={headerCls}>Tên</div>
      <div className={headerCls} title="⚡#n = hạng emission · 💧#n = hạng thanh khoản trong data table hiện tại">
        Nhóm
      </div>
      <div className={cn(headerCls, 'text-right')}>Tỷ trọng</div>
      <div className={cn(headerCls, 'text-right')}>Giá lưu</div>
      <div className={cn(headerCls, 'text-right')}>Giá hiện tại</div>
      <div className={cn(headerCls, 'text-right')}>Biến động</div>
      {hasRemoved && (
        <div className={cn(headerCls, 'text-center')} title="Subnet nhận phần tỷ trọng của các subnet đã bỏ">
          Nhận
        </div>
      )}
      {isEditingWeights && <div className={cn(headerCls, 'text-center')}>Xoá</div>}

      {sections.map((section, sectionIdx) => (
        <Fragment key={`${section.changeKey}-${sectionIdx}`}>
          {/* Tiêu đề section */}
          <div className="col-span-full mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface-raised/80 px-3 py-2 first:mt-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-bold tracking-wider text-fg">{section.label}</span>
              <span className="tabular-nums text-fg-muted">
                {section.rows.length} subnet ·{' '}
                {(section.rows.reduce((a, r) => a + (Number(r.weight) || 0), 0) * 100).toFixed(2)}%
              </span>
            </div>
            {isEditingWeights && section.netuids.length > 0 && (
              <Button
                size="xs"
                variant="danger"
                icon={<XIcon size={11} strokeWidth={2.5} />}
                title={`Xoá cả ${section.rows.length} subnet trong nhóm "${section.label}" — tỷ trọng giải phóng chia cho subnet còn lại`}
                disabled={rowCount <= section.netuids.length}
                onClick={() => onRemoveGroup(section.netuids)}
              >
                Xoá cả nhóm ({section.rows.length})
              </Button>
            )}
          </div>

          {section.rows.map(({ netuid, weight, savedPrice, currentSubnet, currentPrice, priceChange }) => {
            const isAdded = isEditingWeights && addedIds.includes(netuid);
            const isReceiver = hasRemoved && !!draft && draft.removal.targets.includes(netuid);
            return (
              <Fragment key={netuid}>
                <div className="font-mono font-bold text-accent">#{netuid}</div>
                <div className="truncate text-fg">
                  {currentSubnet?.name || saved.names?.[netuid] || 'Unknown'}
                  {isAdded && (
                    <span
                      className="shimmer ml-1.5 rounded border border-info/60 bg-info/10 px-1 py-0.5 text-[10px] font-bold text-info"
                      title="Subnet mới thêm — tỷ trọng trích từ các subnet lớn nhất"
                    >
                      MỚI
                    </span>
                  )}
                </div>
                <div>
                  <TierCell netuid={netuid} tiers={tiers} />
                </div>
                {isEditingWeights && draft ? (
                  <div className="flex items-center justify-end gap-1">
                    {draft.addition.taken[netuid] != null && (
                      <span
                        className="text-[10px] tabular-nums text-warning"
                        title={`Đã trích ${addTakePct}% tỷ trọng của subnet này cho ${addedIds.length} subnet mới`}
                      >
                        −{draft.addition.taken[netuid].toFixed(2)}
                      </span>
                    )}
                    <NumericTextInput
                      value={weightDrafts[netuid] ?? ''}
                      onChange={(v) => onUpdateWeightDraft(netuid, v)}
                      className={cn(
                        'w-20 px-2 py-1 text-right',
                        isAdded ? 'border-info' : isReceiver ? 'border-positive' : 'border-accent'
                      )}
                    />
                  </div>
                ) : (
                  <div className="text-right tabular-nums text-fg">{(weight * 100).toFixed(2)}%</div>
                )}
                <div className="text-right tabular-nums text-fg-muted">
                  {savedPrice != null ? savedPrice.toFixed(6) : '—'}
                </div>
                <div className="text-right tabular-nums text-fg">
                  {currentPrice != null ? currentPrice.toFixed(6) : <span className="text-fg-faint">—</span>}
                </div>
                <div className="text-right">
                  <SignedValue value={priceChange} />
                </div>
                {hasRemoved && (
                  <div className="text-center">
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-positive"
                      checked={isReceiver}
                      title="Nhận phần tỷ trọng của các subnet đã bỏ"
                      onChange={() => onToggleReceiver(netuid)}
                    />
                  </div>
                )}
                {isEditingWeights && (
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-fg-faint transition-colors hover:text-negative disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-fg-faint"
                      title={
                        rowCount <= 1
                          ? 'Danh mục phải còn ít nhất 1 subnet'
                          : isAdded
                            ? 'Bỏ subnet vừa thêm (trả lại tỷ trọng đã trích)'
                            : 'Bỏ subnet khỏi danh mục'
                      }
                      disabled={rowCount <= 1}
                      onClick={() => onRemoveSubnet(netuid)}
                    >
                      <XIcon size={13} />
                    </button>
                  </div>
                )}
              </Fragment>
            );
          })}
        </Fragment>
      ))}

      {/* Summary row */}
      {isEditingWeights ? (
        <>
          <div
            className={cn(
              hasRemoved ? 'col-span-8' : 'col-span-7',
              'mt-1 border-t border-line pt-2 text-right font-bold text-fg-muted'
            )}
          >
            Tổng nhập (sẽ chuẩn hoá về 100%)
          </div>
          <div className="mt-1 border-t border-line pt-2 text-right font-bold tabular-nums text-fg">
            {draftSum.toFixed(2)}%
          </div>
        </>
      ) : (
        <>
          <div className="col-span-6 mt-1 border-t border-line pt-2 text-right font-bold text-fg-muted">Tổng danh mục</div>
          <div className="mt-1 border-t border-line pt-2 text-right font-bold">
            <SignedValue value={portfolioReturn} bold />
          </div>
        </>
      )}
    </div>
  );
}
