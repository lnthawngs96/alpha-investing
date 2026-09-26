import { Fragment } from 'react';
import type { MetricKey, WeightMap } from '@/types';
import { formatAssetId } from '@/constants/assets';
import { MAX_ADD_TAKE_PCT, type SplitMode } from '@/constants/editor';
import type { AllocateResult } from '@/utils/portfolioMath';
import type { AddCandidate, DraftPatch } from '@/hooks/useSavedPortfolioEditor';
import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { cn } from '@/utils/classNames';
import { formatMetric } from '@/utils/format';
import { ensureMetricKeys, metricsLabel } from '@/utils/portfolioGroups';
import { localizedMetricLabel, useLocale } from '@/i18n';
import { Button, NumericTextInput, Select } from '@/components/ui';
import { PlusIcon } from '@/components/icons';
import { useAssetProfile } from '@/store/asset/context';
import { TierCell } from './TierBadge';

export interface AddSubnetsPanelProps {
  candidates: AddCandidate[];
  candidateLimit: number;
  addedIds: string[];
  addOverrides: WeightMap;
  addTopN: number;
  addTakePct: number;
  addSplitMode: SplitMode;
  addChangeKeys: MetricKey[];
  /** Kết quả tầng "addition" của bản nháp. */
  addition: AllocateResult;
  /** true khi có data table (để phân biệt "không còn ứng viên" với "chưa nạp data"). */
  hasData: boolean;
  tiers: SubnetTiers;
  onApplyDraft: (patch: DraftPatch) => void;
  onChangeAddChangeKeys: (keys: MetricKey[]) => void;
  onCandidateLimit: (n: number) => void;
  onPickCandidates: (ids: string[]) => void;
  onToggleCandidate: (id: string) => void;
  onClearCandidates: () => void;
}

/**
 * Bảng "Thêm subnet tăng trưởng": chọn một hoặc nhiều tiêu chí xếp hạng ứng viên,
 * tham số trích tỷ trọng và danh sách ứng viên để tick.
 */
export function AddSubnetsPanel({
  candidates,
  candidateLimit,
  addedIds,
  addOverrides,
  addTopN,
  addTakePct,
  addSplitMode,
  addChangeKeys,
  addition,
  hasData,
  tiers,
  onApplyDraft,
  onChangeAddChangeKeys,
  onCandidateLimit,
  onPickCandidates,
  onToggleCandidate,
  onClearCandidates,
}: AddSubnetsPanelProps) {
  const profile = useAssetProfile();
  const { t, locale } = useLocale();
  void locale;
  const unit = tiers.unit;
  const overrideCount = Object.keys(addOverrides).length;
  const visible = candidates.slice(0, candidateLimit);
  const displayKey = addChangeKeys[0];

  function toggleKey(key: MetricKey) {
    if (addChangeKeys.includes(key)) {
      if (addChangeKeys.length <= 1) return;
      onChangeAddChangeKeys(addChangeKeys.filter((k) => k !== key));
      return;
    }
    onChangeAddChangeKeys(ensureMetricKeys([...addChangeKeys, key], key));
  }

  return (
    <div className="mb-3 flex flex-col gap-2 rounded-lg border border-info/60 bg-info/10 p-3 text-xs animate-slide-down">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-info">
          <PlusIcon size={13} strokeWidth={2.5} />{' '}
          {profile.key === 'alpha' ? t('saved.addGrowth', { unit }) : t('saved.addUnit', { unit })}
        </span>
        <label className="flex items-center gap-1 text-fg" title={t('saved.takeTitle', { unit })}>
          {t('saved.takeLabel')}
          <NumericTextInput
            value={addTakePct}
            onValue={(n) => onApplyDraft({ takePct: Math.min(MAX_ADD_TAKE_PCT, Math.max(0, n)) })}
            className="w-14 px-1.5 py-1 text-right focus:border-info"
          />
          {t('saved.ofTop')}
          <NumericTextInput
            integer
            value={addTopN}
            onValue={(n) => onApplyDraft({ topN: Math.max(0, n) })}
            className="w-14 px-1.5 py-1 text-right focus:border-info"
          />
          {t('saved.largest', { unit })}
        </label>
        <label className="flex items-center gap-1 text-fg" title={t('saved.splitTitle', { unit })}>
          {t('saved.split')}
          <Select value={addSplitMode} onChange={(e) => onApplyDraft({ splitMode: e.target.value as SplitMode })}>
            <option value="decreasing">{t('saved.splitDecreasing')}</option>
            <option value="equal">{t('saved.splitEqual')}</option>
          </Select>
        </label>
      </div>

      <div className="rounded border border-info/40 bg-surface/40 p-2">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-info">
          {t('saved.rankCriteria', { label: metricsLabel(addChangeKeys) })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {profile.metricOptions.map((opt) => {
            const checked = addChangeKeys.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  'inline-flex cursor-pointer items-center gap-1.5 text-[11px] text-fg',
                  checked && 'font-semibold text-info'
                )}
              >
                <input
                  type="checkbox"
                  className="accent-info"
                  checked={checked}
                  onChange={() => toggleKey(opt.value)}
                />
                {localizedMetricLabel(opt.value)}
              </label>
            );
          })}
        </div>
      </div>

      {addedIds.length > 0 ? (
        <div className="text-fg">
          {t('saved.selectedNew', {
            count: addedIds.length,
            unit,
            pool: addition.pool.toFixed(4),
            donors: Object.keys(addition.taken).length,
          })}
          {addSplitMode === 'decreasing'
            ? t('saved.splitDecreasingDesc', {
                from: (addition.shares[addedIds[0]] ?? 0).toFixed(4),
                to: (addition.shares[addedIds[addedIds.length - 1]] ?? 0).toFixed(4),
              })
            : t('saved.splitEqualDesc', {
                unit,
                share: (addition.shares[addedIds[0]] ?? 0).toFixed(4),
              })}
          {overrideCount > 0 && t('saved.overrideNote', { count: overrideCount, unit })}
        </div>
      ) : (
        <div className="text-fg-muted">
          {t('saved.tickHint', { unit, take: addTakePct, top: addTopN })}
        </div>
      )}

      {!candidates.length ? (
        <div className="text-warning">
          {hasData ? t('saved.allAlreadyIn', { unit }) : t('saved.noCandidates')}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-fg-muted">
              {t('saved.candidatesHeader', { count: candidates.length, unit })}
            </span>
            <NumericTextInput
              integer
              value={candidateLimit}
              onValue={(n) => onCandidateLimit(Math.max(0, n))}
              className="w-16 px-1.5 py-1 text-right focus:border-info"
            />
            <Button
              size="xs"
              variant="secondary"
              icon={<PlusIcon size={11} strokeWidth={2.5} />}
              title={t('saved.addTopTitle', {
                count: candidateLimit,
                unit,
                rank: profile.key === 'alpha' ? t('saved.rankGrowth') : t('saved.rankLeaders'),
              })}
              onClick={() => onPickCandidates(visible.map((c) => c.netuid))}
              className="hover:border-info hover:text-info"
            >
              {t('saved.addTopBtn', {
                count: Math.min(candidateLimit, candidates.length),
                unit,
              })}
            </Button>
            <Button
              size="xs"
              variant="secondary"
              disabled={!addedIds.length}
              onClick={onClearCandidates}
              className="hover:border-warning hover:text-warning"
            >
              {t('saved.deselectAll')}
            </Button>
          </div>
          <div className="show-scrollbar max-h-56 overflow-y-auto rounded border border-line bg-surface-sunken/60">
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-x-3 gap-y-1 p-2">
              {visible.map((c) => {
                const picked = addedIds.includes(c.netuid);
                return (
                  <Fragment key={c.netuid}>
                    <input
                      type="checkbox"
                      className="cursor-pointer accent-info"
                      checked={picked}
                      onChange={() => onToggleCandidate(c.netuid)}
                    />
                    <span className="font-mono font-bold text-accent">{formatAssetId(profile, c.netuid)}</span>
                    <span className="truncate text-fg" title={c.name}>
                      {c.name}
                    </span>
                    <span
                      className={cn(
                        'text-right font-bold tabular-nums',
                        isNaN(c.change)
                          ? 'text-fg-faint'
                          : c.change > 0
                            ? 'text-positive'
                            : c.change < 0
                              ? 'text-negative'
                              : 'text-fg-muted'
                      )}
                    >
                      {isNaN(c.change) ? '—' : formatMetric(c.change, displayKey)}
                    </span>
                    <span>
                      <TierCell netuid={c.netuid} tiers={tiers} />
                    </span>
                    <span className="w-16 text-right tabular-nums">
                      {picked ? (
                        <b className="text-info">{(addition.shares[c.netuid] ?? 0).toFixed(4)}%</b>
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </span>
                  </Fragment>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
