import { Fragment } from 'react';
import type { SavedPortfolioRecord } from '@/types';
import type { DraftComputation } from '@/hooks/useSavedPortfolioEditor';
import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { Button, NumericTextInput, SignedValue } from '@/components/ui';
import { XIcon } from '@/components/icons';
import { formatAssetId } from '@/constants/assets';
import { useAssetProfile } from '@/store/asset/context';
import { unitNoun, useLocale } from '@/i18n';
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
  const profile = useAssetProfile();
  const { t } = useLocale();
  const unit = tiers.unit;
  const noun = unitNoun(profile.unit);
  const gridCols = isEditingWeights
    ? hasRemoved
      ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto]'
      : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto]'
    : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]';
  const headerCls = 'text-[11px] font-bold uppercase tracking-wider text-fg-faint';

  return (
    <div className={cn('grid gap-x-3 gap-y-2 text-xs', gridCols)}>
      <div className={headerCls}>{profile.key === 'alpha' ? t('saved.colId') : t('saved.colTicker')}</div>
      <div className={headerCls}>{t('saved.colName')}</div>
      <div
        className={headerCls}
        title={t('saved.groupRankTitle', {
          primary: tiers.names.primary,
          secondary: tiers.names.secondary,
        })}
      >
        {t('saved.colGroup')}
      </div>
      <div className={cn(headerCls, 'text-right')}>{t('saved.colWeight')}</div>
      <div className={cn(headerCls, 'text-right')}>{t('saved.colSavedPrice')}</div>
      <div className={cn(headerCls, 'text-right')}>{t('saved.colCurrentPrice')}</div>
      <div className={cn(headerCls, 'text-right')}>{t('saved.colChange')}</div>
      {hasRemoved && (
        <div className={cn(headerCls, 'text-center')} title={t('saved.receiveTitle', { label: noun, unit })}>
          {t('saved.colReceive')}
        </div>
      )}
      {isEditingWeights && <div className={cn(headerCls, 'text-center')}>{t('saved.colDelete')}</div>}

      {sections.map((section, sectionIdx) => (
        <Fragment key={`${section.changeKey}-${sectionIdx}`}>
          {/* Tiêu đề section */}
          <div className="col-span-full mt-2 flex flex-wrap items-center justify-between gap-2 rounded border border-line bg-surface-raised/80 px-3 py-2 first:mt-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-bold tracking-wider text-fg">{section.label}</span>
              <span className="tabular-nums text-fg-muted">
                {section.rows.length} {unit} ·{' '}
                {(section.rows.reduce((a, r) => a + (Number(r.weight) || 0), 0) * 100).toFixed(2)}%
              </span>
            </div>
            {isEditingWeights && section.netuids.length > 0 && (
              <Button
                size="xs"
                variant="danger"
                icon={<XIcon size={11} strokeWidth={2.5} />}
                title={t('saved.removeGroupTitle', {
                  count: section.rows.length,
                  unit,
                  label: section.label,
                })}
                disabled={rowCount <= section.netuids.length}
                onClick={() => onRemoveGroup(section.netuids)}
              >
                {t('saved.removeGroupBtn', { count: section.rows.length })}
              </Button>
            )}
          </div>

          {section.rows.map(({ netuid, weight, savedPrice, currentSubnet, currentPrice, priceChange }) => {
            const isAdded = isEditingWeights && addedIds.includes(netuid);
            const isReceiver = hasRemoved && !!draft && draft.removal.targets.includes(netuid);
            return (
              <Fragment key={netuid}>
                <div className="font-mono font-bold text-accent">{formatAssetId(profile, netuid)}</div>
                <div className="truncate text-fg">
                  {currentSubnet?.name || saved.names?.[netuid] || t('common.unknown')}
                  {isAdded && (
                    <span
                      className="shimmer ml-1.5 rounded border border-info/60 bg-info/10 px-1 py-0.5 text-[10px] font-bold text-info"
                      title={t('saved.newBadgeTitle', { label: noun, unit })}
                    >
                      {t('saved.newBadge')}
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
                        title={t('saved.takenTitle', {
                          pct: addTakePct,
                          unit,
                          count: addedIds.length,
                        })}
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
                  {savedPrice != null ? savedPrice.toFixed(profile.priceDigits) : '—'}
                </div>
                <div className="text-right tabular-nums text-fg">
                  {currentPrice != null ? currentPrice.toFixed(profile.priceDigits) : <span className="text-fg-faint">—</span>}
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
                      title={t('saved.receiveRowTitle', { unit })}
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
                          ? t('saved.cannotRemoveLast', { unit })
                          : isAdded
                            ? t('saved.undoAdded', { unit })
                            : t('saved.removeUnit', { unit })
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
            {t('saved.draftSum')}
          </div>
          <div className="mt-1 border-t border-line pt-2 text-right font-bold tabular-nums text-fg">
            {draftSum.toFixed(2)}%
          </div>
        </>
      ) : (
        <>
          <div className="col-span-6 mt-1 border-t border-line pt-2 text-right font-bold text-fg-muted">
            {t('saved.portfolioTotal')}
          </div>
          <div className="mt-1 border-t border-line pt-2 text-right font-bold">
            <SignedValue value={portfolioReturn} bold />
          </div>
        </>
      )}
    </div>
  );
}
