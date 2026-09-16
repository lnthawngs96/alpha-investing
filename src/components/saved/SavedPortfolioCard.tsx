import type { SavedPortfolioRecord, SubnetRow } from '@/types';
import { TIER_ORDER, TIERS } from '@/constants/tiers';
import type { SavedPortfolioEditor } from '@/hooks/useSavedPortfolioEditor';
import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { formatSavedAt } from '@/utils/format';
import { portfolioEntriesDesc } from '@/utils/portfolioValidation';
import { cn } from '@/utils/classNames';
import { IconButton } from '@/components/ui';
import { CheckIcon, ChevronIcon, PencilIcon, XIcon } from '@/components/icons';
import { SavedPortfolioDetail } from './SavedPortfolioDetail';

export interface SavedPortfolioCardProps {
  idx: number;
  saved: SavedPortfolioRecord;
  currentData: SubnetRow[];
  tiers: SubnetTiers;
  editor: SavedPortfolioEditor;
  onDelete: (idx: number) => void;
  /** Thứ tự trong danh sách — để trễ animation xuất hiện. */
  order: number;
}

/**
 * Một danh mục đã lưu: header (tên / đổi tên, số subnet, badge phân loại,
 * xoá) và phần chi tiết khi mở rộng.
 */
export function SavedPortfolioCard({ idx, saved, currentData, tiers, editor, onDelete, order }: SavedPortfolioCardProps) {
  const isExpanded = editor.expandedIdx === idx;
  const isRenaming = editor.editingIdx === idx;
  const entries = portfolioEntriesDesc(saved.portfolio); // cùng thứ tự JSON: tỷ trọng cao → thấp
  // Tổng hợp phân loại của danh mục đã lưu (dùng cho badge ở header).
  const savedStats = tiers.canRank ? tiers.summarize(entries) : null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-surface-raised/60 transition-all duration-300 animate-slide-up',
        isExpanded ? 'border-accent/50 shadow-card' : 'border-line hover:border-line-strong'
      )}
      style={{ animationDelay: `${Math.min(order, 8) * 40}ms` }}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-raised"
        onClick={() => editor.toggleExpanded(idx)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ChevronIcon size={15} open={isExpanded} className="text-accent" />
          {isRenaming ? (
            <input
              autoFocus
              value={editor.nameDraft}
              placeholder="Tên danh mục…"
              className="field w-48 border-accent px-2 py-1 font-bold"
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => editor.setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') editor.commitRename(idx);
                if (e.key === 'Escape') editor.cancelRename();
              }}
            />
          ) : (
            <span className="truncate text-xs font-bold text-fg" title={saved.name || undefined}>
              {saved.name || formatSavedAt(saved.savedAt)}
            </span>
          )}
          <span className="shrink-0 text-xs tabular-nums text-fg-muted">{entries.length} subnets</span>
          {savedStats && (
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold">
              {TIER_ORDER.map((tier) =>
                savedStats[tier].count ? (
                  <span
                    key={tier}
                    className={cn('rounded border px-1.5 py-0.5 tabular-nums', TIERS[tier].box)}
                    title={`${TIERS[tier].label}: ${savedStats[tier].count} subnet · ${savedStats[tier].weight.toFixed(2)}% tỷ trọng — ${TIERS[tier].hint}`}
                  >
                    {TIERS[tier].chip} {savedStats[tier].count}
                  </span>
                ) : null
              )}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isRenaming ? (
            <>
              <IconButton
                label="Lưu tên"
                tone="positive"
                className="text-positive"
                onClick={(e) => {
                  e.stopPropagation();
                  editor.commitRename(idx);
                }}
              >
                <CheckIcon size={15} strokeWidth={2.5} />
              </IconButton>
              <IconButton
                label="Huỷ"
                onClick={(e) => {
                  e.stopPropagation();
                  editor.cancelRename();
                }}
              >
                <XIcon size={15} />
              </IconButton>
            </>
          ) : (
            <IconButton
              label="Đặt tên danh mục"
              tone="accent"
              onClick={(e) => {
                e.stopPropagation();
                editor.startRename(idx, saved.name);
              }}
            >
              <PencilIcon size={14} />
            </IconButton>
          )}
          <IconButton
            label="Xoá danh mục"
            tone="negative"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(idx);
            }}
          >
            <XIcon size={15} />
          </IconButton>
        </div>
      </div>

      {isExpanded && (
        <SavedPortfolioDetail
          idx={idx}
          saved={saved}
          entries={entries}
          currentData={currentData}
          tiers={tiers}
          editor={editor}
        />
      )}
    </div>
  );
}
