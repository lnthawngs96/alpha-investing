import { useState } from 'react';
import type {
  AssetProfile,
  MetricKey,
  MetricOption,
  Portfolio,
  SaveResult,
  SavedPortfolioRecord,
  Selection,
  SelectionGroup,
  SubnetRow,
} from '@/types';
import { DD_TRIGGER, TOP_N_MAX } from '@/constants/portfolio';
import {
  DEFAULT_EXTRA_GROUP_COUNT,
  MAX_SELECTION_GROUPS,
  MIN_SELECTION_GROUPS,
  TOAST_ERROR_MS,
  TOAST_SUCCESS_MS,
} from '@/constants/editor';
import { generateLiquidityWeightedPortfolio } from '@/utils/portfolioMath';
import {
  ensureMetricKeys,
  getMixedSubnetsGrouped,
  metricsLabel,
  primaryChangeKey,
  selectionKeys,
} from '@/utils/portfolioGroups';
import { checkDedupe, portfolioEntries, validatePortfolio } from '@/utils/portfolioValidation';
import { compareByMetricDesc, findSubnet, getSubnetPool } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';
import { usePortfolioTools } from '@/webmcp/usePortfolioTools';
import { useAssetProfile } from '@/store/asset/context';
import { tt, unitLabel, useLocale, weightLabel } from '@/i18n';
import { Badge, Button, Card, EmptyState, Eyebrow, Notice } from '@/components/ui';
import { PlusIcon, RefreshIcon, TargetIcon } from '@/components/icons';
import { SelectionGroupFields } from './SelectionGroupFields';
import { SubnetChipList } from './SubnetChipList';
import { PortfolioResult } from './PortfolioResult';

export interface PortfolioBuilderProps {
  allData: SubnetRow[];
  savedPortfolios: SavedPortfolioRecord[];
  onSavePortfolio: (record: SavedPortfolioRecord) => void;
  /**
   * Đăng ký bộ tool WebMCP cấp danh mục. App mount một builder cho mỗi mục đầu tư
   * và chỉ bật tool ở builder đang xem (tên tool trùng nhau). Mặc định true.
   */
  toolsEnabled?: boolean;
}

/** Trạng thái form của một nhóm tiêu chí (chưa generate). */
interface GroupDraft {
  id: string;
  count: string;
  changeKeys: MetricKey[];
}

function toSelection(keys: MetricKey[], n: number, fallback: MetricKey): Selection {
  const changeKeys = ensureMetricKeys(keys, fallback);
  return { changeKey: changeKeys[0], changeKeys, n };
}

function newGroupId(): string {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultDrafts(profile: AssetProfile): GroupDraft[] {
  return profile.defaultGroups.map((g) => ({ id: newGroupId(), count: g.count, changeKeys: [...g.keys] }));
}

function firstUnusedMetric(used: ReadonlySet<MetricKey>, options: readonly MetricOption[]): MetricKey | null {
  for (const opt of options) {
    if (!used.has(opt.value)) return opt.value;
  }
  return null;
}

/**
 * Tab "Portfolio gen": chọn N nhóm tiêu chí (động) → gộp subnet (loại trùng) → phân
 * bổ giảm dần theo thanh khoản → xem / sửa / lưu. Component này cũng đăng ký
 * bộ tool WebMCP cấp danh mục, nên phải luôn được mount (App ẩn bằng CSS).
 */
export function PortfolioBuilder({ allData, savedPortfolios, onSavePortfolio, toolsEnabled = true }: PortfolioBuilderProps) {
  const profile = useAssetProfile();
  const { t, locale } = useLocale();
  const { metricOptions, weightField, unit } = profile;
  const unitText = unitLabel(unit);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<GroupDraft[]>(() => defaultDrafts(profile));
  const [topSubnets, setTopSubnets] = useState<SubnetRow[]>([]);
  // Membership theo từng nhóm generate — lưu cùng danh mục để UI xoá cả cụm.
  const [selectionGroups, setSelectionGroups] = useState<SelectionGroup[]>([]);
  const [saveMsg, setSaveMsg] = useState('');

  // Đổi data table → kết quả cũ không còn ý nghĩa. Reset ngay trong lượt render
  // (pattern "adjust state on prop change" của React) thay vì trong effect để
  // không có khung hình nào hiển thị danh mục cũ trên dữ liệu mới.
  const [prevAllData, setPrevAllData] = useState(allData);
  if (prevAllData !== allData) {
    setPrevAllData(allData);
    setTopSubnets([]);
    setSelectionGroups([]);
    setPortfolio(null);
    setEditMode(false);
  }

  const poolSize = getSubnetPool(allData).length;
  const usedMetrics = new Set(drafts.flatMap((d) => d.changeKeys));
  const canAddGroup =
    drafts.length < Math.min(MAX_SELECTION_GROUPS, metricOptions.length) &&
    firstUnusedMetric(usedMetrics, metricOptions) != null;

  /** Chuẩn hoá số subnet nhập vào: ≥ 1, ≤ TOP_N_MAX và ≤ số subnet có trong pool. */
  function parseCount(str: string): number {
    const v = parseInt(str, 10);
    if (isNaN(v) || v < 1) return 1;
    return Math.min(v, TOP_N_MAX, poolSize || TOP_N_MAX);
  }

  function resetResult() {
    setTopSubnets([]);
    setSelectionGroups([]);
    setPortfolio(null);
  }

  function updateDraft(id: string, patch: Partial<Pick<GroupDraft, 'count' | 'changeKeys'>>) {
    setDrafts((list) => list.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    resetResult();
  }

  function addGroup() {
    const metric = firstUnusedMetric(usedMetrics, metricOptions);
    if (!metric || !canAddGroup) return;
    setDrafts((list) => [
      ...list,
      { id: newGroupId(), count: DEFAULT_EXTRA_GROUP_COUNT, changeKeys: [metric] },
    ]);
    resetResult();
  }

  function removeGroup(id: string) {
    setDrafts((list) => {
      if (list.length <= MIN_SELECTION_GROUPS) return list;
      return list.filter((d) => d.id !== id);
    });
    resetResult();
  }

  function draftsToSelections(list: GroupDraft[]): Selection[] {
    return list.map((d) => toSelection(d.changeKeys, parseCount(d.count), weightField));
  }

  /**
   * Tách phần dựng danh mục khỏi phần đọc state của form, để cả nút bấm lẫn
   * tool WebMCP dùng chung một đường. Trả về danh mục vừa dựng cho phía gọi.
   */
  function generateWith(selections: Selection[]): Portfolio | null {
    if (!selections.length) return null;
    const { subnets: combined, groups } = getMixedSubnetsGrouped(allData, selections);
    // Alpha: theo thanh khoản; cổ phiếu Mỹ: theo vốn hoá (profile.weightField).
    const byLiquidity = [...combined].sort(compareByMetricDesc(weightField));
    const next = generateLiquidityWeightedPortfolio(byLiquidity, profile.maxWeight, profile.assetClass);
    setTopSubnets(byLiquidity);
    setSelectionGroups(
      groups.map((g) => {
        const keys = selectionKeys(g);
        return {
          changeKey: primaryChangeKey(g),
          changeKeys: keys.length ? keys : undefined,
          n: g.n,
          netuids: [...g.netuids],
          label: g.label || metricsLabel(keys),
        };
      })
    );
    setEditMode(false);
    setPortfolio(next);
    return next;
  }

  function handleGenerate(): Portfolio | null {
    return generateWith(draftsToSelections(drafts));
  }

  /**
   * Agent dựng danh mục: đồng bộ form theo đúng số nhóm agent chọn.
   */
  function generateFromAgent(selections: Selection[]): Portfolio | null {
    if (!selections.length) return null;
    const nextDrafts: GroupDraft[] = selections.map((s) => {
      const keys = ensureMetricKeys(selectionKeys(s) as MetricKey[], weightField);
      return {
        id: newGroupId(),
        count: String(parseCount(String(s.n))),
        changeKeys: keys,
      };
    });
    setDrafts(nextDrafts);
    return generateWith(draftsToSelections(nextDrafts));
  }

  function handleToggleEdit() {
    setEditMode(!editMode);
  }

  function handleApplyEdit(newPortfolio: Portfolio) {
    setPortfolio(newPortfolio);
    setEditMode(false);
  }

  function saveWithName(name?: string): SaveResult {
    if (!portfolio) return { ok: false, message: tt('portfolio.noPortfolio') };

    const { valid, errors } = validatePortfolio(portfolio);
    if (!valid) {
      return { ok: false, message: tt('portfolio.invalidPortfolio', { error: errors[0] }) };
    }

    const dup = checkDedupe(portfolio, savedPortfolios);
    if (!dup.ok) {
      const c = dup.conflicts[0];
      return {
        ok: false,
        message: tt('portfolio.dedupeBlocked', {
          name: c.name || tt('portfolio.unnamedSaved'),
          dist: c.dist,
          threshold: DD_TRIGGER,
        }),
      };
    }

    const prices: Record<string, number> = {};
    const names: Record<string, string> = {};
    portfolioEntries(portfolio).forEach(([netuid]) => {
      const subnet = findSubnet(allData, netuid);
      if (subnet) {
        const p = toNumber(subnet.price);
        if (!isNaN(p)) prices[netuid] = p;
        names[netuid] = subnet.name || tt('common.unknown');
      }
    });

    const selections = draftsToSelections(drafts);

    const record: SavedPortfolioRecord = {
      savedAt: new Date().toISOString(),
      selections,
      groups: selectionGroups.length
        ? selectionGroups
        : selections.map((s) => ({
            ...s,
            netuids: [],
            label: metricsLabel(selectionKeys(s)),
          })),
      portfolio: { ...portfolio },
      prices,
      names,
    };
    if (name && String(name).trim()) record.name = String(name).trim();

    onSavePortfolio(record);
    return { ok: true, name: record.name || tt('portfolio.unnamed'), total: savedPortfolios.length + 1 };
  }

  function handleSave() {
    const result = saveWithName();
    setSaveMsg(result.ok ? tt('portfolio.savedOk') : `✕ ${result.message}`);
    setTimeout(() => setSaveMsg(''), result.ok ? TOAST_SUCCESS_MS : TOAST_ERROR_MS);
  }

  usePortfolioTools({
    enabled: toolsEnabled,
    profile,
    allData,
    savedPortfolios,
    portfolio,
    applyPortfolio: (next) => {
      setPortfolio(next);
      setEditMode(false);
    },
    generate: generateFromAgent,
    save: saveWithName,
  });

  // Phụ thuộc locale để nhãn metricsLabel đổi khi đổi ngôn ngữ.
  void locale;
  const summaryParts = drafts.map((d) => `top ${parseCount(d.count)} ${metricsLabel(d.changeKeys)}`);
  const summaryText = summaryParts.join(' + ');

  return (
    <div className="min-h-0 flex-1 pt-4">
      <div className="grid h-full grid-cols-[1fr_2fr] gap-5 max-md:grid-cols-1">
        {/* Left panel — cấu hình */}
        <Card className="flex min-h-0 flex-col gap-4 overflow-hidden p-5 animate-slide-up">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Eyebrow>{t('portfolio.criteriaGroups', { count: drafts.length })}</Eyebrow>
            <Button
              size="xs"
              variant="secondary"
              icon={<PlusIcon size={12} strokeWidth={2.5} />}
              onClick={addGroup}
              disabled={!canAddGroup}
              title={canAddGroup ? t('portfolio.addGroupTitle') : t('portfolio.addGroupDisabled')}
              className="hover:border-accent hover:text-accent"
            >
              {t('portfolio.addGroup')}
            </Button>
          </div>

          <div className="show-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto pr-1">
            {drafts.map((draft, index) => {
              const disabledKeys = drafts
                .filter((d) => d.id !== draft.id)
                .flatMap((d) => d.changeKeys);
              return (
                <SelectionGroupFields
                  key={draft.id}
                  title={t('portfolio.groupTitle', { n: index + 1 })}
                  count={draft.count}
                  onCountChange={(v) => updateDraft(draft.id, { count: v })}
                  onCountBlur={() => updateDraft(draft.id, { count: String(parseCount(draft.count)) })}
                  changeKeys={draft.changeKeys}
                  onChangeKeys={(keys) => updateDraft(draft.id, { changeKeys: keys })}
                  disabledKeys={disabledKeys}
                  canRemove={drafts.length > MIN_SELECTION_GROUPS}
                  onRemove={() => removeGroup(draft.id)}
                />
              );
            })}
          </div>

          <p className="shrink-0 text-[11px] leading-relaxed text-fg-faint">
            {t('portfolio.mergeHint', {
              summary: summaryText || '…',
              unit: unitText,
              alphaExtra: profile.key === 'alpha' ? t('portfolio.alphaExtra') : '',
              weight: weightLabel(profile.key),
              stockExtra: profile.key === 'stock' ? t('portfolio.stockExtra') : '',
            })}
          </p>

          <div className="flex shrink-0 items-center justify-between">
            <Eyebrow>{t('portfolio.selectedList')}</Eyebrow>
            <Badge tone="positive">{topSubnets.length}</Badge>
          </div>
          {selectionGroups.length > 0 ? (
            <div className="show-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {selectionGroups.map((g, i) => {
                const ids = new Set(g.netuids.map(String));
                const chips = topSubnets.filter((s) => ids.has(String(s.netuid)));
                const key = `${selectionKeys(g).join('|')}-${i}`;
                return (
                  <div key={key} className="flex shrink-0 flex-col gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
                      {g.label || metricsLabel(selectionKeys(g))} · {chips.length}
                    </div>
                    <SubnetChipList subnets={chips} metricField={weightField} className="flex flex-col gap-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <SubnetChipList subnets={topSubnets} metricField={weightField} />
          )}
          <Button
            variant="primary"
            icon={<RefreshIcon size={14} />}
            onClick={handleGenerate}
            disabled={poolSize === 0 || drafts.length === 0}
            className="mt-auto shrink-0"
          >
            {t('portfolio.generate')}
          </Button>
        </Card>

        {/* Right panel — kết quả */}
        <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
          {saveMsg && (
            <Notice tone={saveMsg.startsWith('✕') ? 'error' : 'success'} hideIcon className="justify-center text-center font-bold shrink-0">
              {saveMsg}
            </Notice>
          )}
          {portfolio ? (
            <PortfolioResult
              portfolio={portfolio}
              filteredSubnets={topSubnets}
              metricField={weightField}
              editMode={editMode}
              onToggleEdit={handleToggleEdit}
              onRegenerate={handleGenerate}
              onApplyEdit={handleApplyEdit}
              onSave={handleSave}
            />
          ) : (
            <EmptyState
              className="flex-1"
              icon={<TargetIcon size={26} />}
              title={t('portfolio.emptyTitle')}
              description={
                <>
                  {t('portfolio.emptyDesc', {
                    groups: drafts.length,
                    summary: summaryText || '…',
                    pool: poolSize,
                    unit: unitText,
                  })}
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
