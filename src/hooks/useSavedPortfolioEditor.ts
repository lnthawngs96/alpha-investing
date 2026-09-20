import { useMemo, useState } from 'react';
import type {
  MetricKey,
  Portfolio,
  SavedPortfolioRecord,
  SelectionGroup,
  StatusMessage,
  SubnetRow,
  WeightMap,
} from '@/types';
import { DD_TRIGGER, DEDUPE_SAFE_MARGIN, OTHER_GROUP_KEY, OTHER_GROUP_LABEL, CHANGE_DEFAULT } from '@/constants/portfolio';
import {
  DEFAULT_ADD_TAKE_PCT,
  DEFAULT_ADD_TOP_N,
  DEFAULT_CANDIDATE_LIMIT,
  TOAST_COPY_MS,
  type ReceiveMode,
  type SplitMode,
} from '@/constants/editor';
import type { UpdateSavedExtra } from '@/store/savedPortfolios/context';
import { formatCompactPercent } from '@/utils/format';
import { toNumber } from '@/utils/numeric';
import {
  allocateWeightsForNewSubnets,
  buildNormalizedPortfolio,
  rebalancePortfolioSafe,
  redistributeRemovedWeights,
  type AllocateResult,
  type RedistributeResult,
} from '@/utils/portfolioMath';
import { checkDedupe, dedupeDistance, validateTaoAlphaPortfolio } from '@/utils/portfolioValidation';
import {
  bestMetricValue,
  cloneGroupWithLabel,
  ensureMetricKeys,
  groupLabel,
  metricsLabel,
  primaryChangeKey,
  resolvePortfolioGroups,
  sameMetricSet,
  selectionKeys,
} from '@/utils/portfolioGroups';
import { formatPortfolioJson, parseRelaxedPortfolioJson } from '@/utils/portfolioJson';
import { findSubnet, isRootSubnet } from '@/utils/subnetData';

/** Ứng viên để thêm vào danh mục đang sửa. */
export interface AddCandidate {
  netuid: string;
  name: string;
  /** Giá trị tiêu chí xếp hạng (NaN nếu thiếu). */
  change: number;
}

/** Bản nháp đã tính qua 3 tầng (xem `computeDraft`). */
export interface DraftComputation {
  removal: RedistributeResult;
  addition: AllocateResult;
  weights: WeightMap;
}

/** Các mảnh trạng thái nháp có thể ghi đè khi gọi `applyDraft`. */
export interface DraftPatch {
  base?: WeightMap;
  removed?: string[];
  mode?: ReceiveMode;
  recv?: string[];
  added?: string[];
  overrides?: WeightMap;
  topN?: number;
  takePct?: number;
  splitMode?: SplitMode;
}

export interface SavedPortfolioEditorDeps {
  savedList: SavedPortfolioRecord[];
  currentData: SubnetRow[];
  /** Tiêu chí mặc định để xếp hạng ứng viên khi thêm subnet. */
  filterKey: MetricKey;
  onUpdate: (idx: number, portfolio: Portfolio, extra?: UpdateSavedExtra | null) => void;
  onRename: (idx: number, name: string) => void;
}

/**
 * Toàn bộ trạng thái và thao tác chỉnh sửa của tab "Danh mục đã lưu".
 * Mỗi lần chỉ sửa MỘT danh mục (theo index), ba chế độ loại trừ nhau:
 * đổi tên (editingIdx), sửa tỷ trọng (editingWeightsIdx), sửa JSON (editingJsonIdx).
 */
export function useSavedPortfolioEditor({ savedList, currentData, filterKey, onUpdate, onRename }: SavedPortfolioEditorDeps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [rebalanceMsgs, setRebalanceMsgs] = useState<Record<number, StatusMessage>>({});
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  // Chỉnh sửa tỷ trọng của một danh mục đã lưu (mỗi lần chỉ sửa 1 danh mục).
  const [editingWeightsIdx, setEditingWeightsIdx] = useState<number | null>(null);
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({}); // { netuid: chuỗi phần trăm }
  // Trạng thái phân bổ lại khi bỏ subnet khỏi danh mục đang sửa:
  // baseWeights = tỷ trọng gốc (%) TRƯỚC khi chia lại của mọi subnet (kể cả subnet đã bỏ),
  // removedIds = subnet đã bỏ (chưa lưu, có thể khôi phục),
  // receiveMode = 'all' (chia đều cho tất cả subnet còn lại — mặc định) | 'pick' (chỉ subnet được tick),
  // receivers = danh sách netuid được tick nhận khi receiveMode = 'pick'.
  const [baseWeights, setBaseWeights] = useState<WeightMap>({});
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [receiveMode, setReceiveMode] = useState<ReceiveMode>('all');
  const [receivers, setReceivers] = useState<string[]>([]);
  // Thêm subnet MỚI vào danh mục đang sửa (không có trong danh mục gốc):
  // addedIds = netuid đã tick (luôn giữ thứ tự theo tiêu chí tăng trưởng, cao nhất trước),
  // addOverrides = tỷ trọng người dùng gõ tay đè lên phần được cấp tự động,
  // addTakePct / addTopN = lấy bao nhiêu % tỷ trọng của mỗi subnet trong top mấy subnet lớn nhất,
  // addSplitMode = 'decreasing' (chia giảm dần theo thứ tự) | 'equal' (chia đều),
  // addChangeKeys = tiêu chí xếp hạng ứng viên (có thể nhiều; mặc định filterKey).
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [addOverrides, setAddOverrides] = useState<WeightMap>({});
  const [addTopN, setAddTopN] = useState(DEFAULT_ADD_TOP_N);
  const [addTakePct, setAddTakePct] = useState(DEFAULT_ADD_TAKE_PCT);
  const [addSplitMode, setAddSplitMode] = useState<SplitMode>('decreasing');
  const [addChangeKeys, setAddChangeKeys] = useState<MetricKey[]>([filterKey]);
  const [candidateLimit, setCandidateLimit] = useState(DEFAULT_CANDIDATE_LIMIT);
  // Membership nhóm generate khi đang sửa (để xoá cả cụm / gắn subnet mới vào đúng nhóm).
  const [draftGroups, setDraftGroups] = useState<SelectionGroup[]>([]);
  // Chỉnh sửa trực tiếp JSON của danh mục đã lưu.
  const [editingJsonIdx, setEditingJsonIdx] = useState<number | null>(null);
  const [jsonDraft, setJsonDraft] = useState('');

  /**
   * Ứng viên để thêm vào danh mục đang sửa: mọi subnet trong data table KHÔNG có sẵn
   * trong danh mục đó (kể cả subnet vừa bị bỏ — muốn lấy lại thì bấm ↩ khôi phục),
   * sắp xếp theo tiêu chí tăng trưởng giảm dần. Subnet thiếu số liệu bị đẩy xuống cuối.
   */
  const candidates = useMemo<AddCandidate[]>(() => {
    if (editingWeightsIdx == null) return [];
    const inPortfolio = new Set(Object.keys(baseWeights));
    const keys = addChangeKeys.length ? addChangeKeys : [filterKey];
    return (currentData || [])
      .filter((r) => !isRootSubnet(r) && !inPortfolio.has(String(r.netuid)))
      .map((r) => ({
        netuid: String(r.netuid),
        name: r.name || 'Unknown',
        change: bestMetricValue(r, keys),
      }))
      .sort((a, b) => (isNaN(b.change) ? -Infinity : b.change) - (isNaN(a.change) ? -Infinity : a.change));
  }, [currentData, baseWeights, addChangeKeys, filterKey, editingWeightsIdx]);

  /** Hiện thông báo kết quả cho danh mục `idx` rồi tự ẩn sau `ms`. */
  function flashMessage(idx: number, message: StatusMessage, ms: number) {
    setRebalanceMsgs((m) => ({ ...m, [idx]: message }));
    setTimeout(
      () =>
        setRebalanceMsgs((m) => {
          const n = { ...m };
          delete n[idx];
          return n;
        }),
      ms
    );
  }

  /**
   * Xếp netuid theo một tiêu chí tăng trưởng giảm dần (thiếu số liệu → xuống cuối).
   * Dùng để addedIds luôn đi từ subnet tăng mạnh nhất xuống thấp — subnet đầu danh sách
   * nhận phần tỷ trọng lớn nhất khi chia giảm dần.
   */
  function sortIdsByChange(ids: string[], keys: MetricKey[]): string[] {
    const keyList = keys.length ? keys : [filterKey];
    const valueOf = (id: string) => {
      const row = findSubnet(currentData, id);
      const v = row ? bestMetricValue(row, keyList) : NaN;
      return isNaN(v) ? -Infinity : v;
    };
    return [...ids].sort((a, b) => valueOf(b) - valueOf(a));
  }

  /** Các danh mục đã lưu khác (bỏ danh mục đang sửa ở vị trí idx) để so trùng lặp dedupe. */
  function othersExcept(idx: number): SavedPortfolioRecord[] {
    return savedList.filter((_, i) => i !== idx);
  }

  // ── Sửa tỷ trọng ─────────────────────────────────────────────────────────

  function startEditWeights(idx: number, entries: Array<[string, number]>) {
    setEditingIdx(null);
    setEditingJsonIdx(null);
    setEditingWeightsIdx(idx);
    const base: WeightMap = Object.fromEntries(entries.map(([netuid, w]) => [netuid, w * 100]));
    setBaseWeights(base);
    setRemovedIds([]);
    setReceiveMode('all');
    setReceivers([]);
    setAddedIds([]);
    setAddOverrides({});
    setAddTopN(DEFAULT_ADD_TOP_N);
    setAddTakePct(DEFAULT_ADD_TAKE_PCT);
    setAddSplitMode('decreasing');
    setAddChangeKeys([filterKey]);
    setCandidateLimit(DEFAULT_CANDIDATE_LIMIT);
    setWeightDrafts(Object.fromEntries(Object.entries(base).map(([id, v]) => [id, formatCompactPercent(v)])));
    const saved = savedList[idx];
    setDraftGroups(resolvePortfolioGroups(saved, currentData).map(cloneGroupWithLabel));
  }

  function cancelEditWeights() {
    setEditingWeightsIdx(null);
    setWeightDrafts({});
    setBaseWeights({});
    setRemovedIds([]);
    setReceiveMode('all');
    setReceivers([]);
    setAddedIds([]);
    setAddOverrides({});
    setDraftGroups([]);
  }

  /**
   * Toàn bộ tỷ trọng hiển thị được suy ra từ trạng thái nháp qua 3 tầng, theo đúng thứ tự:
   *   1. removal  — bỏ subnet, chia phần giải phóng cho các subnet nhận
   *      (mode 'all' → chia đều tất cả; 'pick' → đúng danh sách đã tick, rỗng = không ai nhận);
   *   2. addition — trích takePct% tỷ trọng của mỗi subnet trong top N lớn nhất (sau bước 1)
   *      rồi chia cho các subnet mới thêm;
   *   3. overrides — tỷ trọng người dùng gõ tay cho subnet mới, đè lên phần được cấp.
   * Nhờ suy ra từ đầu mỗi lần nên mọi thao tác (bỏ / thêm / đổi tham số) đều tính lại nhất quán.
   */
  function computeDraft(
    base: WeightMap = baseWeights,
    removed: string[] = removedIds,
    mode: ReceiveMode = receiveMode,
    recv: string[] = receivers,
    added: string[] = addedIds,
    overrides: WeightMap = addOverrides,
    topN: number = addTopN,
    takePct: number = addTakePct,
    splitMode: SplitMode = addSplitMode
  ): DraftComputation {
    const removal = redistributeRemovedWeights(base, removed, mode === 'pick' ? recv : null);
    const addition = allocateWeightsForNewSubnets(removal.weights, added, {
      topN,
      takeRatio: takePct / 100,
      mode: splitMode,
    });
    const weights: WeightMap = { ...addition.weights };
    for (const [id, v] of Object.entries(overrides)) {
      if (id in weights) weights[id] = v;
    }
    return { removal, addition, weights };
  }

  /**
   * Đồng bộ trạng thái nháp + tính lại tỷ trọng hiển thị. Chỉ truyền phần thay đổi,
   * các mảnh còn lại giữ nguyên giá trị hiện tại.
   */
  function applyDraft(next: DraftPatch = {}) {
    const s = {
      base: baseWeights,
      removed: removedIds,
      mode: receiveMode,
      recv: receivers,
      added: addedIds,
      overrides: addOverrides,
      topN: addTopN,
      takePct: addTakePct,
      splitMode: addSplitMode,
      ...next,
    };
    setBaseWeights(s.base);
    setRemovedIds(s.removed);
    setReceiveMode(s.mode);
    setReceivers(s.recv);
    setAddedIds(s.added);
    setAddOverrides(s.overrides);
    setAddTopN(s.topN);
    setAddTakePct(s.takePct);
    setAddSplitMode(s.splitMode);
    const { weights } = computeDraft(
      s.base,
      s.removed,
      s.mode,
      s.recv,
      s.added,
      s.overrides,
      s.topN,
      s.takePct,
      s.splitMode
    );
    setWeightDrafts(Object.fromEntries(Object.entries(weights).map(([id, v]) => [id, formatCompactPercent(v)])));
  }

  function updateWeightDraft(netuid: string, value: string) {
    // Giữ nguyên chuỗi người dùng đang gõ (ô trống vẫn rỗng); giá trị tính toán của ô trống là 0.
    setWeightDrafts((d) => ({ ...d, [netuid]: value }));
    const v = parseFloat(value);
    const num = value === '' || value === '.' || isNaN(v) ? 0 : Math.max(0, v);
    // Subnet mới thêm không có tỷ trọng gốc → lưu thẳng thành override.
    if (addedIds.includes(netuid)) {
      setAddOverrides((o) => ({ ...o, [netuid]: num }));
      return;
    }
    const { removal, addition } = computeDraft();
    const received = removal.targets.includes(netuid) ? removal.share : 0;
    // Subnet đang bị trích cho các subnet mới → gỡ hệ số trích trước khi trừ phần được chia.
    const factor = addition.taken[netuid] != null ? Math.max(0.01, 1 - addTakePct / 100) : 1;
    setBaseWeights((b) => ({ ...b, [netuid]: Math.max(0, num / factor - received) }));
  }

  /**
   * Bỏ subnet khỏi bản nháp: subnet mới thêm thì gỡ khỏi danh sách thêm (trả lại tỷ trọng
   * đã trích cho các subnet lớn), subnet có sẵn thì đánh dấu đã bỏ để chia lại.
   */
  function removeSubnetFromDraft(netuid: string | number) {
    const id = String(netuid);
    setDraftGroups((gs) => gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => x !== id) })));
    if (addedIds.includes(id)) {
      unpickCandidate(id);
      return;
    }
    applyDraft({
      removed: [...removedIds, id],
      recv: receivers.filter((x) => x !== id),
    });
  }

  /** Xoá cả một nhóm generate (vd cả 10 subnet tăng trưởng 1 ngày) trong một thao tác. */
  function removeGroupFromDraft(netuids: Array<string | number> | null | undefined) {
    const ids = [...new Set((netuids || []).map(String))];
    if (!ids.length) return;
    const idSet = new Set(ids);
    setDraftGroups((gs) => gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => !idSet.has(x)) })));
    const toUnpick = ids.filter((id) => addedIds.includes(id));
    const toRemove = ids.filter((id) => !addedIds.includes(id) && !removedIds.includes(id));
    if (toUnpick.length) {
      const overrides = { ...addOverrides };
      toUnpick.forEach((id) => {
        delete overrides[id];
      });
      applyDraft({
        added: addedIds.filter((x) => !idSet.has(x)),
        overrides,
        removed: [...removedIds, ...toRemove],
        recv: receivers.filter((x) => !idSet.has(x)),
      });
      return;
    }
    if (toRemove.length) {
      applyDraft({
        removed: [...removedIds, ...toRemove],
        recv: receivers.filter((x) => !idSet.has(x)),
      });
    }
  }

  /** Khôi phục subnet đã bỏ (trả lại tỷ trọng gốc, pool chia lại cho ít subnet hơn). */
  function restoreSubnet(netuid: string | number) {
    const id = String(netuid);
    // Đưa lại vào nhóm gốc nếu còn nhớ; nếu không thì nhóm "other".
    setDraftGroups((gs) => {
      const already = gs.some((g) => g.netuids.includes(id));
      if (already) return gs;
      const other = gs.find((g) => g.changeKey === OTHER_GROUP_KEY);
      if (other) {
        return gs.map((g) => (g.changeKey === OTHER_GROUP_KEY ? { ...g, netuids: [...g.netuids, id] } : g));
      }
      return [...gs, { changeKey: OTHER_GROUP_KEY, n: 1, netuids: [id], label: OTHER_GROUP_LABEL }];
    });
    applyDraft({ removed: removedIds.filter((x) => x !== id) });
  }

  /**
   * Tick/bỏ tick subnet nhận phần tỷ trọng giải phóng (mọi thao tác tick = chọn thủ công).
   * Đang ở chế độ chia đều cho tất cả → bỏ tick 1 subnet nghĩa là giữ lại tất cả subnet còn lại
   * trừ subnet vừa bỏ tick.
   */
  function toggleReceiver(netuid: string) {
    const { removal } = computeDraft();
    const next = removal.targets.includes(netuid)
      ? removal.targets.filter((id) => id !== netuid)
      : [...removal.targets, netuid];
    applyDraft({ mode: 'pick', recv: next });
  }

  /** Chọn tất cả = quay về chế độ chia đều cho mọi subnet còn lại. */
  function selectAllReceivers() {
    applyDraft({ mode: 'all', recv: [] });
  }

  /**
   * Bỏ chọn tất cả = không subnet nào nhận thêm; tổng nhập sẽ < 100% và được
   * chuẩn hoá lại theo đúng tỷ lệ hiện tại khi bấm ÁP DỤNG.
   */
  function clearReceivers() {
    applyDraft({ mode: 'pick', recv: [] });
  }

  function changeReceiveMode(mode: ReceiveMode) {
    applyDraft({ mode });
  }

  // ── Thêm subnet mới ───────────────────────────────────────────────────────

  /** Gắn subnet mới vào nhóm khớp bộ tiêu chí đang chọn. */
  function assignIdsToDraftGroup(ids: string[], keys: MetricKey[]) {
    const incoming = [...new Set(ids.map(String))];
    if (!incoming.length) return;
    const changeKeys = ensureMetricKeys(keys, CHANGE_DEFAULT);
    setDraftGroups((gs) => {
      const without = gs.map((g) => ({
        ...g,
        netuids: g.netuids.filter((id) => !incoming.includes(id)),
      }));
      const idx = without.findIndex((g) => sameMetricSet(selectionKeys(g), changeKeys));
      if (idx >= 0) {
        return without.map((g, i) => (i === idx ? { ...g, netuids: [...g.netuids, ...incoming] } : g));
      }
      return [
        ...without,
        {
          changeKey: changeKeys[0],
          changeKeys,
          n: incoming.length,
          netuids: incoming,
          label: metricsLabel(changeKeys),
        },
      ];
    });
  }

  function pickCandidates(ids: Array<string | number>) {
    const merged = [...new Set([...addedIds, ...ids.map(String)])];
    const sorted = sortIdsByChange(merged, addChangeKeys);
    const newly = sorted.filter((id) => !addedIds.includes(id));
    assignIdsToDraftGroup(newly, addChangeKeys);
    applyDraft({ added: sorted });
  }

  /**
   * Đổi tiêu chí xếp hạng → xếp lại cả danh sách đã chọn để thứ tự nhận tỷ trọng
   * luôn khớp với tiêu chí đang xem.
   */
  function changeAddChangeKeys(keys: MetricKey[]) {
    const next = ensureMetricKeys(keys, CHANGE_DEFAULT);
    setAddChangeKeys(next);
    applyDraft({ added: sortIdsByChange(addedIds, next) });
  }

  function unpickCandidate(netuid: string | number) {
    const id = String(netuid);
    const overrides = { ...addOverrides };
    delete overrides[id];
    setDraftGroups((gs) => gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => x !== id) })));
    applyDraft({ added: addedIds.filter((x) => x !== id), overrides });
  }

  function toggleCandidate(netuid: string | number) {
    const id = String(netuid);
    if (addedIds.includes(id)) unpickCandidate(id);
    else pickCandidates([id]);
  }

  function clearCandidates() {
    const clearing = new Set(addedIds);
    setDraftGroups((gs) => gs.map((g) => ({ ...g, netuids: g.netuids.filter((id) => !clearing.has(id)) })));
    applyDraft({ added: [], overrides: {} });
  }

  /** Áp bản nháp tỷ trọng: chuẩn hoá về 1.0, kiểm tra hợp lệ + dedupe rồi lưu. */
  function applyWeightEdits(idx: number, saved: SavedPortfolioRecord) {
    const netuids = Object.keys(weightDrafts);
    if (!netuids.length) {
      flashMessage(idx, { ok: false, text: 'Danh mục phải có ít nhất 1 subnet' }, 2500);
      return;
    }
    // Chuẩn hoá tổng về 1.0 (giống editor khi generate) để luôn hợp lệ Tao/Alpha.
    const vals = netuids.map((id) => {
      const v = parseFloat(weightDrafts[id]);
      return isNaN(v) ? 0 : Math.max(0, v);
    });
    const newPortfolio = buildNormalizedPortfolio(netuids, vals);

    const { valid, errors } = validateTaoAlphaPortfolio(newPortfolio);
    if (!valid) {
      flashMessage(idx, { ok: false, text: errors[0] }, 2500);
      return;
    }
    // Cảnh báo nếu tỷ trọng mới trùng lặp (sẽ bị dedupe) với danh mục khác đã lưu.
    const dup = checkDedupe(newPortfolio, othersExcept(idx));
    if (!dup.ok) {
      const c = dup.conflicts[0];
      flashMessage(
        idx,
        {
          ok: false,
          text: `⚠ Trùng lặp với "${c.name || 'danh mục khác'}" (d=${c.dist} < ${DD_TRIGGER}) → sẽ bị dedupe. Chưa lưu.`,
        },
        4000
      );
      return;
    }
    // Subnet mới thêm chưa có giá/tên lưu → ghi giá hiện tại làm giá mua vào, nếu không
    // cột "Biến động" của chúng sẽ mãi hiện "—".
    const extra: UpdateSavedExtra = { prices: {}, names: {} };
    netuids.forEach((id) => {
      const row = findSubnet(currentData, id);
      if (!row) return;
      const p = toNumber(row.price);
      if (saved?.prices?.[id] == null && !isNaN(p)) extra.prices![id] = p;
      if (saved?.names?.[id] == null && row.name) extra.names![id] = row.name;
    });

    // Persist membership nhóm (chỉ giữ netuid còn trong danh mục sau khi áp dụng).
    const keep = new Set(netuids);
    const seen = new Set<string>();
    extra.groups = draftGroups
      .map((g) => {
        const ids = g.netuids.filter((id) => keep.has(id) && !seen.has(id));
        ids.forEach((id) => seen.add(id));
        return {
          changeKey: primaryChangeKey(g),
          changeKeys: selectionKeys(g),
          n: ids.length,
          netuids: ids,
          label: groupLabel(g, g.label),
        };
      })
      .filter((g) => g.netuids.length > 0);
    const orphan = netuids.filter((id) => !seen.has(id));
    if (orphan.length) {
      extra.groups.push({
        changeKey: OTHER_GROUP_KEY,
        n: orphan.length,
        netuids: orphan,
        label: OTHER_GROUP_LABEL,
      });
    }

    const addedCount = addedIds.length;
    onUpdate(idx, newPortfolio, extra);
    cancelEditWeights();
    flashMessage(
      idx,
      {
        ok: true,
        text: `✓ Đã cập nhật tỷ trọng${addedCount ? ` · thêm ${addedCount} subnet mới` : ''} (d=${dup.minDist ?? '—'})`,
      },
      2500
    );
  }

  // ── Sửa JSON ──────────────────────────────────────────────────────────────

  function startEditJson(idx: number, portfolio: Portfolio) {
    setEditingIdx(null);
    setEditingWeightsIdx(null);
    setEditingJsonIdx(idx);
    setJsonDraft(formatPortfolioJson(portfolio));
  }

  function cancelEditJson() {
    setEditingJsonIdx(null);
    setJsonDraft('');
  }

  function applyJsonEdits(idx: number) {
    const setErr = (text: string) => flashMessage(idx, { ok: false, text }, 3000);

    const parsed = parseRelaxedPortfolioJson(jsonDraft);
    if (!parsed.ok) {
      setErr(parsed.error);
      return;
    }
    const { portfolio } = parsed;

    const { valid, errors } = validateTaoAlphaPortfolio(portfolio);
    if (!valid) {
      setErr(errors[0]);
      return;
    }
    // Cảnh báo nếu JSON mới trùng lặp (sẽ bị dedupe) với danh mục khác đã lưu.
    const dup = checkDedupe(portfolio, othersExcept(idx));
    if (!dup.ok) {
      const c = dup.conflicts[0];
      setErr(`⚠ Trùng lặp với "${c.name || 'danh mục khác'}" (d=${c.dist} < ${DD_TRIGGER}) → sẽ bị dedupe. Chưa lưu.`);
      return;
    }
    onUpdate(idx, portfolio);
    cancelEditJson();
    flashMessage(idx, { ok: true, text: `✓ Đã cập nhật JSON (d=${dup.minDist ?? '—'})` }, 2500);
  }

  // ── Copy / đổi tên / rebalance ────────────────────────────────────────────

  function handleCopyJson(idx: number, portfolio: Portfolio) {
    const json = formatPortfolioJson(portfolio);
    navigator.clipboard.writeText(json).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), TOAST_COPY_MS);
    });
  }

  function startRename(idx: number, currentName: string | undefined) {
    setEditingIdx(idx);
    setNameDraft(currentName || '');
  }

  function commitRename(idx: number) {
    onRename(idx, nameDraft.trim());
    setEditingIdx(null);
    setNameDraft('');
  }

  function cancelRename() {
    setEditingIdx(null);
    setNameDraft('');
  }

  /**
   * Rebalance đảm bảo khoảng cách tới các danh mục khác ≥ ngưỡng + biên an toàn
   * để không bị mạng dedupe (tăng dần biên độ nhiễu nếu cần).
   */
  function handleRebalance(idx: number, portfolio: Portfolio) {
    const target = DD_TRIGGER + DEDUPE_SAFE_MARGIN;
    const { portfolio: newPortfolio, ok: safe, minDist } = rebalancePortfolioSafe(
      portfolio,
      othersExcept(idx),
      target,
      dedupeDistance
    );
    const { valid, errors } = validateTaoAlphaPortfolio(newPortfolio);
    let message: StatusMessage;
    if (!valid) {
      message = { ok: false, text: errors[0] };
    } else if (!safe) {
      // Không tách đủ xa (thường do danh mục chỉ 1 subnet, luôn chuẩn hoá về cùng vector).
      message = {
        ok: false,
        text:
          `⚠ Không tách đủ xa khỏi danh mục khác (d=${minDist ?? '—'} < ${target.toFixed(3)}). ` +
          `Danh mục 1 subnet không thể thoát dedupe bằng đổi tỷ trọng — hãy đổi/thêm subnet. Chưa lưu.`,
      };
    } else {
      onUpdate(idx, newPortfolio);
      message = { ok: true, text: `✓ Đã rebalance an toàn (d=${minDist ?? '—'} ≥ ${DD_TRIGGER})` };
    }
    flashMessage(idx, message, 3500);
  }

  /** Header card chỉ toggle mở rộng khi danh mục đó KHÔNG đang ở chế độ sửa nào. */
  function isEditingAny(idx: number): boolean {
    return editingIdx === idx || editingWeightsIdx === idx || editingJsonIdx === idx;
  }

  function toggleExpanded(idx: number) {
    if (isEditingAny(idx)) return;
    setExpandedIdx(expandedIdx === idx ? null : idx);
  }

  return {
    // trạng thái đọc
    expandedIdx,
    rebalanceMsgs,
    editingIdx,
    nameDraft,
    copiedIdx,
    editingWeightsIdx,
    weightDrafts,
    baseWeights,
    removedIds,
    receiveMode,
    addedIds,
    addOverrides,
    addTopN,
    addTakePct,
    addSplitMode,
    addChangeKeys,
    candidateLimit,
    draftGroups,
    editingJsonIdx,
    jsonDraft,
    candidates,
    // thao tác
    toggleExpanded,
    setNameDraft,
    setJsonDraft,
    setCandidateLimit,
    computeDraft,
    applyDraft,
    startEditWeights,
    cancelEditWeights,
    updateWeightDraft,
    removeSubnetFromDraft,
    removeGroupFromDraft,
    restoreSubnet,
    toggleReceiver,
    selectAllReceivers,
    clearReceivers,
    changeReceiveMode,
    pickCandidates,
    changeAddChangeKeys,
    toggleCandidate,
    clearCandidates,
    applyWeightEdits,
    startEditJson,
    cancelEditJson,
    applyJsonEdits,
    handleCopyJson,
    startRename,
    commitRename,
    cancelRename,
    handleRebalance,
  };
}

export type SavedPortfolioEditor = ReturnType<typeof useSavedPortfolioEditor>;
