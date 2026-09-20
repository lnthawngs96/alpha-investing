import { useState } from 'react';
import type { MetricKey, Portfolio, SaveResult, SavedPortfolioRecord, Selection, SelectionGroup, SubnetRow } from '@/types';
import { CHANGE_DEFAULT, CHANGE_OPTIONS, DD_TRIGGER, LIQUIDITY_FIELD, TOP_N_MAX } from '@/constants/portfolio';
import {
  DEFAULT_EXTRA_GROUP_COUNT,
  DEFAULT_GROUP1_COUNT,
  DEFAULT_GROUP2_COUNT,
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
import { checkDedupe, portfolioEntries, validateTaoAlphaPortfolio } from '@/utils/portfolioValidation';
import { compareByMetricDesc, findSubnet, getSubnetPool } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';
import { usePortfolioTools } from '@/webmcp/usePortfolioTools';
import { Badge, Button, Card, EmptyState, Eyebrow, Notice } from '@/components/ui';
import { PlusIcon, RefreshIcon, TargetIcon } from '@/components/icons';
import { SelectionGroupFields } from './SelectionGroupFields';
import { SubnetChipList } from './SubnetChipList';
import { PortfolioResult } from './PortfolioResult';

export interface PortfolioBuilderProps {
  allData: SubnetRow[];
  savedPortfolios: SavedPortfolioRecord[];
  onSavePortfolio: (record: SavedPortfolioRecord) => void;
}

/** Trạng thái form của một nhóm tiêu chí (chưa generate). */
interface GroupDraft {
  id: string;
  count: string;
  changeKeys: MetricKey[];
}

function toSelection(keys: MetricKey[], n: number): Selection {
  const changeKeys = ensureMetricKeys(keys, LIQUIDITY_FIELD);
  return { changeKey: changeKeys[0], changeKeys, n };
}

function newGroupId(): string {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultDrafts(): GroupDraft[] {
  return [
    { id: newGroupId(), count: DEFAULT_GROUP1_COUNT, changeKeys: [LIQUIDITY_FIELD] },
    { id: newGroupId(), count: DEFAULT_GROUP2_COUNT, changeKeys: [CHANGE_DEFAULT] },
  ];
}

function firstUnusedMetric(used: ReadonlySet<MetricKey>): MetricKey | null {
  for (const opt of CHANGE_OPTIONS) {
    if (!used.has(opt.value)) return opt.value;
  }
  return null;
}

/**
 * Tab "Portfolio gen": chọn N nhóm tiêu chí (động) → gộp subnet (loại trùng) → phân
 * bổ giảm dần theo thanh khoản → xem / sửa / lưu. Component này cũng đăng ký
 * bộ tool WebMCP cấp danh mục, nên phải luôn được mount (App ẩn bằng CSS).
 */
export function PortfolioBuilder({ allData, savedPortfolios, onSavePortfolio }: PortfolioBuilderProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<GroupDraft[]>(defaultDrafts);
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
    drafts.length < Math.min(MAX_SELECTION_GROUPS, CHANGE_OPTIONS.length) && firstUnusedMetric(usedMetrics) != null;

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
    const metric = firstUnusedMetric(usedMetrics);
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
    return list.map((d) => toSelection(d.changeKeys, parseCount(d.count)));
  }

  /**
   * Tách phần dựng danh mục khỏi phần đọc state của form, để cả nút bấm lẫn
   * tool WebMCP dùng chung một đường. Trả về danh mục vừa dựng cho phía gọi.
   */
  function generateWith(selections: Selection[]): Portfolio | null {
    if (!selections.length) return null;
    const { subnets: combined, groups } = getMixedSubnetsGrouped(allData, selections);
    const byLiquidity = [...combined].sort(compareByMetricDesc(LIQUIDITY_FIELD));
    const next = generateLiquidityWeightedPortfolio(byLiquidity);
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
      const keys = ensureMetricKeys(selectionKeys(s) as MetricKey[], LIQUIDITY_FIELD);
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
    if (!portfolio) return { ok: false, message: 'Chưa có danh mục để lưu.' };

    const { valid, errors } = validateTaoAlphaPortfolio(portfolio);
    if (!valid) {
      return { ok: false, message: `Danh mục không hợp lệ: ${errors[0]}` };
    }

    const dup = checkDedupe(portfolio, savedPortfolios);
    if (!dup.ok) {
      const c = dup.conflicts[0];
      return {
        ok: false,
        message: `Trùng lặp với "${c.name || 'danh mục đã lưu'}" (d=${c.dist} < ${DD_TRIGGER}) → sẽ bị dedupe. Chưa lưu.`,
      };
    }

    const prices: Record<string, number> = {};
    const names: Record<string, string> = {};
    portfolioEntries(portfolio).forEach(([netuid]) => {
      const subnet = findSubnet(allData, netuid);
      if (subnet) {
        const p = toNumber(subnet.price);
        if (!isNaN(p)) prices[netuid] = p;
        names[netuid] = subnet.name || 'Unknown';
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
    return { ok: true, name: record.name || '(chưa đặt tên)', total: savedPortfolios.length + 1 };
  }

  function handleSave() {
    const result = saveWithName();
    setSaveMsg(result.ok ? '✓ Đã lưu danh mục!' : `✕ ${result.message}`);
    setTimeout(() => setSaveMsg(''), result.ok ? TOAST_SUCCESS_MS : TOAST_ERROR_MS);
  }

  usePortfolioTools({
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

  const summaryParts = drafts.map((d) => `top ${parseCount(d.count)} ${metricsLabel(d.changeKeys)}`);
  const summaryText = summaryParts.join(' + ');

  return (
    <div className="min-h-0 flex-1 pt-4">
      <div className="grid h-full grid-cols-[1fr_2fr] gap-5 max-md:grid-cols-1">
        {/* Left panel — cấu hình */}
        <Card className="flex min-h-0 flex-col gap-4 overflow-hidden p-5 animate-slide-up">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Eyebrow>{drafts.length} nhóm tiêu chí</Eyebrow>
            <Button
              size="xs"
              variant="secondary"
              icon={<PlusIcon size={12} strokeWidth={2.5} />}
              onClick={addGroup}
              disabled={!canAddGroup}
              title={
                canAddGroup
                  ? 'Thêm nhóm tiêu chí'
                  : 'Hết chỉ số chưa dùng hoặc đã đạt số nhóm tối đa'
              }
              className="hover:border-accent hover:text-accent"
            >
              Thêm nhóm
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
                  title={`Nhóm ${index + 1}`}
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
            Gộp {summaryText || '…'} (nhiều tiêu chí trong một nhóm lấy xen kẽ; loại subnet trùng và bỏ subnet 0).
            Danh mục cuối sắp xếp theo thanh khoản giảm dần.
          </p>

          <div className="flex shrink-0 items-center justify-between">
            <Eyebrow>Danh sách đã chọn</Eyebrow>
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
                    <SubnetChipList subnets={chips} metricField={LIQUIDITY_FIELD} className="flex flex-col gap-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <SubnetChipList subnets={topSubnets} metricField={LIQUIDITY_FIELD} />
          )}
          <Button
            variant="primary"
            icon={<RefreshIcon size={14} />}
            onClick={handleGenerate}
            disabled={poolSize === 0 || drafts.length === 0}
            className="mt-auto shrink-0"
          >
            Generate portfolio
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
              metricField={LIQUIDITY_FIELD}
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
              title='Chọn nhóm tiêu chí và click "Generate"'
              description={
                <>
                  {drafts.length} nhóm · {summaryText || '…'} từ {poolSize} subnet
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
