import { useState, useRef, useMemo, Fragment } from 'react';
import {
  validateTaoAlphaPortfolio,
  checkDedupe,
  dedupeDistance,
  DD_TRIGGER,
  DEDUPE_SAFE_MARGIN,
  EMISSION_FIELD,
  LIQUIDITY_FIELD,
  CHANGE_OPTIONS,
  CHANGE_DEFAULT,
} from '../utils/portfolio';
import {
  downloadPortfolios,
  parseImportedPortfolios,
  readFileAsText,
} from '../utils/portfolioFile';
import {
  rebalancePortfolioSafe,
  normalize,
  redistributeRemovedWeights,
  allocateWeightsForNewSubnets,
  buildRankIndex,
  resolvePortfolioGroups,
} from '../utils/helpers';
import NumericTextInput from './NumericTextInput';

// Hiển thị % gọn: tối đa 4 chữ số thập phân, bỏ số 0 thừa (5 → "5", 2.040816 → "2.0408").
function fmtPct(v) {
  return String(+Math.max(0, v).toFixed(4));
}

// Label hiển thị cho nhóm generate (thanh khoản / tăng trưởng 1 ngày / …).
function groupLabel(changeKey, fallback) {
  if (fallback) return fallback;
  if (changeKey === 'other') return 'Khác / chưa phân nhóm';
  return CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label || changeKey || 'Nhóm';
}

// Ngưỡng mặc định "top" cho hai tiêu chí đánh giá subnet trong danh mục.
const DEFAULT_TOP_EMISSION = 50;
const DEFAULT_TOP_LIQUIDITY = 50;

// Mặc định khi thêm subnet mới vào danh mục đã lưu: lấy 10% tỷ trọng của mỗi subnet
// trong top 10 subnet lớn nhất, rồi chia giảm dần cho các subnet mới thêm.
const DEFAULT_ADD_TOP_N = 10;
const DEFAULT_ADD_TAKE_PCT = 10;
const DEFAULT_CANDIDATE_LIMIT = 20;
// Trần % lấy khỏi mỗi subnet lớn — trên mức này danh mục gốc bị bào quá sâu.
const MAX_ADD_TAKE_PCT = 90;

// Bốn nhóm phân loại một subnet, xếp theo mức độ nên giữ / nên cashout.
const TIERS = {
  both: {
    label: 'Cả hai',
    chip: '⚡💧',
    hint: 'Vừa top emission vừa top thanh khoản — nên giữ / gia tăng',
    text: 'text-emerald-300',
    box: 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300',
  },
  emission: {
    label: 'Chỉ emission',
    chip: '⚡',
    hint: 'Top emission nhưng thanh khoản thấp — vào/ra dễ bị slippage',
    text: 'text-amber-300',
    box: 'border-amber-400/60 bg-amber-400/10 text-amber-300',
  },
  liquidity: {
    label: 'Chỉ thanh khoản',
    chip: '💧',
    hint: 'Thanh khoản cao (dễ cashout) nhưng emission ngoài top',
    text: 'text-cyan-300',
    box: 'border-cyan-400/60 bg-cyan-400/10 text-cyan-300',
  },
  none: {
    label: 'Ngoài top',
    chip: '✕',
    hint: 'Không thuộc top emission lẫn top thanh khoản — ưu tiên cashout',
    text: 'text-red-300',
    box: 'border-red-400/60 bg-red-400/10 text-red-300',
  },
};

export default function SavedPortfolios({
  savedList,
  currentData,
  filterKey = CHANGE_DEFAULT,
  onDelete,
  onUpdate,
  onRename,
  onImport,
}) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  // Kết quả xuất/nhập file: { ok, text }.
  const [fileMsg, setFileMsg] = useState(null);
  const fileInputRef = useRef(null);
  const [rebalanceMsgs, setRebalanceMsgs] = useState({});
  const [editingIdx, setEditingIdx] = useState(null);
  const [nameDraft, setNameDraft] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  // Chỉnh sửa tỷ trọng của một danh mục đã lưu (mỗi lần chỉ sửa 1 danh mục).
  const [editingWeightsIdx, setEditingWeightsIdx] = useState(null);
  const [weightDrafts, setWeightDrafts] = useState({}); // { netuid: chuỗi phần trăm }
  // Trạng thái phân bổ lại khi bỏ subnet khỏi danh mục đang sửa:
  // baseWeights = tỷ trọng gốc (%) TRƯỚC khi chia lại của mọi subnet (kể cả subnet đã bỏ),
  // removedIds = subnet đã bỏ (chưa lưu, có thể khôi phục),
  // receiveMode = 'all' (chia đều cho tất cả subnet còn lại — mặc định) | 'pick' (chỉ subnet được tick),
  // receivers = danh sách netuid được tick nhận khi receiveMode = 'pick'.
  const [baseWeights, setBaseWeights] = useState({});
  const [removedIds, setRemovedIds] = useState([]);
  const [receiveMode, setReceiveMode] = useState('all');
  const [receivers, setReceivers] = useState([]);
  // Thêm subnet MỚI vào danh mục đang sửa (không có trong danh mục gốc):
  // addedIds = netuid đã tick (luôn giữ thứ tự theo tiêu chí tăng trưởng, cao nhất trước),
  // addOverrides = tỷ trọng người dùng gõ tay đè lên phần được cấp tự động,
  // addTakePct / addTopN = lấy bao nhiêu % tỷ trọng của mỗi subnet trong top mấy subnet lớn nhất,
  // addSplitMode = 'decreasing' (chia giảm dần theo thứ tự) | 'equal' (chia đều),
  // addChangeKey = tiêu chí xếp hạng ứng viên (mặc định tăng trưởng 1 ngày).
  const [addedIds, setAddedIds] = useState([]);
  const [addOverrides, setAddOverrides] = useState({});
  const [addTopN, setAddTopN] = useState(DEFAULT_ADD_TOP_N);
  const [addTakePct, setAddTakePct] = useState(DEFAULT_ADD_TAKE_PCT);
  const [addSplitMode, setAddSplitMode] = useState('decreasing');
  const [addChangeKey, setAddChangeKey] = useState(filterKey);
  const [candidateLimit, setCandidateLimit] = useState(DEFAULT_CANDIDATE_LIMIT);
  // Membership nhóm generate khi đang sửa (để xoá cả cụm / gắn subnet mới vào đúng nhóm).
  const [draftGroups, setDraftGroups] = useState([]);
  // Chỉnh sửa trực tiếp JSON của danh mục đã lưu.
  const [editingJsonIdx, setEditingJsonIdx] = useState(null);
  const [jsonDraft, setJsonDraft] = useState('');
  // Kết quả kiểm tra dedupe toàn bộ danh mục với nhau (null = chưa chạy).
  const [dedupeReport, setDedupeReport] = useState(null);
  // Ngưỡng "top" để phân loại subnet trong danh mục theo data table hiện tại.
  const [topEmissionN, setTopEmissionN] = useState(DEFAULT_TOP_EMISSION);
  const [topLiquidityN, setTopLiquidityN] = useState(DEFAULT_TOP_LIQUIDITY);

  // Bảng xếp hạng lấy từ data table đang nạp (không phải từ giá lúc lưu danh mục).
  const emissionRanks = useMemo(
    () => buildRankIndex(currentData, EMISSION_FIELD),
    [currentData]
  );
  const liquidityRanks = useMemo(
    () => buildRankIndex(currentData, LIQUIDITY_FIELD),
    [currentData]
  );
  // Không có data table → không xếp hạng được, mọi badge hiển thị "—".
  const canRank = emissionRanks.size > 0 || liquidityRanks.size > 0;

  // Ứng viên để thêm vào danh mục đang sửa: mọi subnet trong data table KHÔNG có sẵn
  // trong danh mục đó (kể cả subnet vừa bị bỏ — muốn lấy lại thì bấm ↩ khôi phục),
  // sắp xếp theo tiêu chí tăng trưởng giảm dần. Subnet thiếu số liệu bị đẩy xuống cuối.
  const candidates = useMemo(() => {
    if (editingWeightsIdx == null) return [];
    const inPortfolio = new Set(Object.keys(baseWeights));
    return (currentData || [])
      .filter((r) => Number(r.netuid) !== 0 && !inPortfolio.has(String(r.netuid)))
      .map((r) => ({
        netuid: String(r.netuid),
        name: r.name || 'Unknown',
        change: parseFloat(r[addChangeKey]),
      }))
      .sort(
        (a, b) =>
          (isNaN(b.change) ? -Infinity : b.change) - (isNaN(a.change) ? -Infinity : a.change)
      );
  }, [currentData, baseWeights, addChangeKey, editingWeightsIdx]);

  // Xếp netuid theo một tiêu chí tăng trưởng giảm dần (thiếu số liệu → xuống cuối).
  // Dùng để addedIds luôn đi từ subnet tăng mạnh nhất xuống thấp — subnet đầu danh sách
  // nhận phần tỷ trọng lớn nhất khi chia giảm dần.
  function sortIdsByChange(ids, key) {
    const valueOf = (id) => {
      const v = parseFloat(currentData.find((r) => String(r.netuid) === id)?.[key]);
      return isNaN(v) ? -Infinity : v;
    };
    return [...ids].sort((a, b) => valueOf(b) - valueOf(a));
  }

  // Phân loại một subnet: thứ hạng emission / thanh khoản + nhóm (both | emission | liquidity | none).
  function classify(netuid) {
    const id = String(netuid);
    const eRank = emissionRanks.get(id) ?? null;
    const lRank = liquidityRanks.get(id) ?? null;
    const topE = eRank != null && eRank <= topEmissionN;
    const topL = lRank != null && lRank <= topLiquidityN;
    const tier = topE && topL ? 'both' : topE ? 'emission' : topL ? 'liquidity' : 'none';
    return { eRank, lRank, topE, topL, tier };
  }

  // Tổng hợp một danh mục: số subnet + tổng tỷ trọng theo từng nhóm.
  function summarize(entries) {
    const stats = {
      both: { count: 0, weight: 0 },
      emission: { count: 0, weight: 0 },
      liquidity: { count: 0, weight: 0 },
      none: { count: 0, weight: 0 },
    };
    for (const [netuid, weight] of entries) {
      const { tier } = classify(netuid);
      stats[tier].count += 1;
      stats[tier].weight += (Number(weight) || 0) * 100;
    }
    return stats;
  }

  // Ô "Nhóm" trong bảng chi tiết: badge thứ hạng ⚡ emission và 💧 thanh khoản.
  function tierCell(netuid) {
    if (!canRank) return <span className="text-slate-600">—</span>;
    const { eRank, lRank, topE, topL, tier } = classify(netuid);
    const title =
      `${TIERS[tier].hint}\n` +
      `Emission: ${eRank != null ? `hạng #${eRank}` : 'không có trong data table'} (top ${topEmissionN})\n` +
      `Thanh khoản: ${lRank != null ? `hạng #${lRank}` : 'không có trong data table'} (top ${topLiquidityN})`;

    if (tier === 'none') {
      return (
        <span
          className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${TIERS.none.box}`}
          title={title}
        >
          ✕ NGOÀI TOP
          {(eRank != null || lRank != null) && (
            <span className="ml-1 font-normal text-slate-400 tabular-nums">
              ⚡{eRank ?? '–'}/💧{lRank ?? '–'}
            </span>
          )}
        </span>
      );
    }
    return (
      <span className="inline-flex gap-1 whitespace-nowrap" title={title}>
        {topE && (
          <span className="rounded border border-amber-400/60 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 tabular-nums">
            ⚡#{eRank}
          </span>
        )}
        {topL && (
          <span className="rounded border border-cyan-400/60 bg-cyan-400/10 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 tabular-nums">
            💧#{lRank}
          </span>
        )}
      </span>
    );
  }

  // Tên hiển thị của một danh mục đã lưu (fallback theo thời điểm lưu).
  function displayName(saved) {
    return saved?.name || (saved?.savedAt ? new Date(saved.savedAt).toLocaleString('vi-VN') : 'Danh mục');
  }

  // Duyệt tất cả cặp danh mục đã lưu (cùng asset class), tính khoảng cách dedupe.
  // Cặp có d < DD_TRIGGER sẽ bị mạng coi là trùng → danh mục nộp sau bị phạt điểm.
  function runDedupeCheck() {
    const pairs = [];
    let minPair = null;
    for (let i = 0; i < savedList.length; i++) {
      for (let j = i + 1; j < savedList.length; j++) {
        const a = savedList[i].portfolio, b = savedList[j].portfolio;
        if ((a?._ ?? 0) !== (b?._ ?? 0)) continue; // khác asset class → mạng không so
        const dist = +dedupeDistance(a, b).toFixed(6);
        const rec = { i, j, dist, ni: displayName(savedList[i]), nj: displayName(savedList[j]) };
        pairs.push(rec);
        if (!minPair || dist < minPair.dist) minPair = rec;
      }
    }
    const conflicts = pairs.filter((p) => p.dist < DD_TRIGGER).sort((a, b) => a.dist - b.dist);
    setDedupeReport({ count: savedList.length, pairs: pairs.length, minPair, conflicts });
  }

  function showFileMsg(ok, text) {
    setFileMsg({ ok, text });
    setTimeout(() => setFileMsg(null), 5000);
  }

  function handleExport() {
    try {
      const name = downloadPortfolios(savedList);
      showFileMsg(true, `✓ Đã xuất ${savedList.length} danh mục → ${name}`);
    } catch {
      showFileMsg(false, '⚠ Không xuất được file');
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    // Reset ngay để chọn lại đúng file đó lần nữa vẫn bắn onChange.
    e.target.value = '';
    if (!file) return;

    let text;
    try {
      text = await readFileAsText(file);
    } catch {
      showFileMsg(false, '⚠ Không đọc được file');
      return;
    }

    const { records, error, skipped } = parseImportedPortfolios(text);
    if (error) {
      showFileMsg(false, `⚠ ${error}`);
      return;
    }

    const { added, duplicates } = onImport(records);
    const parts = [`✓ Đã nhập ${added} danh mục mới`];
    if (duplicates) parts.push(`${duplicates} đã có sẵn (giữ nguyên bản hiện tại)`);
    if (skipped) parts.push(`${skipped} bản ghi hỏng bị bỏ qua`);
    showFileMsg(true, parts.join(' · '));
  }

  // Toolbar dùng chung cho cả trạng thái rỗng — nút NHẬP phải bấm được đúng lúc
  // chưa có danh mục nào (khôi phục sau khi mất dữ liệu).
  const fileButtons = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />
      <button
        className="px-3 py-2 bg-slate-700/40 border border-slate-600 rounded-lg text-slate-300 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-slate-600 hover:text-white whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={handleExport}
        disabled={!savedList.length}
        title="Tải toàn bộ danh mục đã lưu về máy dưới dạng file JSON"
      >
        ⬆ XUẤT JSON
      </button>
      <button
        className="px-3 py-2 bg-slate-700/40 border border-slate-600 rounded-lg text-slate-300 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-slate-600 hover:text-white whitespace-nowrap"
        onClick={() => fileInputRef.current?.click()}
        title="Nhập danh mục từ file JSON đã xuất — gộp vào danh sách hiện tại, không ghi đè"
      >
        ⬇ NHẬP JSON
      </button>
    </>
  );

  const fileBanner = fileMsg && (
    <div
      className={`shrink-0 px-6 pb-3 text-xs ${fileMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}
    >
      {fileMsg.text}
    </div>
  );

  // JSON hiển thị: key netuid không có ngoặc kép (vd `1: 0.05`) và sắp xếp theo trọng số giảm dần
  // (subnet trọng số cao nhất lên đầu). Dựng chuỗi thủ công vì JSON.stringify luôn xếp key số tăng dần.
  // Các danh mục đã lưu khác (bỏ danh mục đang sửa ở vị trí idx) để so trùng lặp dedupe.
  function othersExcept(idx) {
    return savedList.filter((_, i) => i !== idx);
  }

  function relaxedJson(portfolio) {
    const sorted = Object.entries(portfolio)
      .filter(([k]) => k !== '_')
      .sort((a, b) => b[1] - a[1]);
    const lines = [
      `  "_": ${portfolio._ ?? 0}`,
      ...sorted.map(([k, v]) => `  ${k}: ${v}`),
    ];
    return `{\n${lines.join(',\n')}\n}`;
  }

  function startEditWeights(idx, entries) {
    setEditingIdx(null);
    setEditingJsonIdx(null);
    setEditingWeightsIdx(idx);
    const base = Object.fromEntries(entries.map(([netuid, w]) => [netuid, w * 100]));
    setBaseWeights(base);
    setRemovedIds([]);
    setReceiveMode('all');
    setReceivers([]);
    setAddedIds([]);
    setAddOverrides({});
    setAddTopN(DEFAULT_ADD_TOP_N);
    setAddTakePct(DEFAULT_ADD_TAKE_PCT);
    setAddSplitMode('decreasing');
    setAddChangeKey(filterKey);
    setCandidateLimit(DEFAULT_CANDIDATE_LIMIT);
    setWeightDrafts(Object.fromEntries(Object.entries(base).map(([id, v]) => [id, fmtPct(v)])));
    const saved = savedList[idx];
    setDraftGroups(
      resolvePortfolioGroups(saved, currentData).map((g) => ({
        changeKey: g.changeKey,
        n: g.n,
        netuids: [...g.netuids],
        label: groupLabel(g.changeKey, g.label),
      }))
    );
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

  // Toàn bộ tỷ trọng hiển thị được suy ra từ trạng thái nháp qua 3 tầng, theo đúng thứ tự:
  //   1. removal  — bỏ subnet, chia phần giải phóng cho các subnet nhận
  //      (mode 'all' → chia đều tất cả; 'pick' → đúng danh sách đã tick, rỗng = không ai nhận);
  //   2. addition — trích takePct% tỷ trọng của mỗi subnet trong top N lớn nhất (sau bước 1)
  //      rồi chia cho các subnet mới thêm;
  //   3. overrides — tỷ trọng người dùng gõ tay cho subnet mới, đè lên phần được cấp.
  // Nhờ suy ra từ đầu mỗi lần nên mọi thao tác (bỏ / thêm / đổi tham số) đều tính lại nhất quán.
  function computeDraft(
    base = baseWeights,
    removed = removedIds,
    mode = receiveMode,
    recv = receivers,
    added = addedIds,
    overrides = addOverrides,
    topN = addTopN,
    takePct = addTakePct,
    splitMode = addSplitMode
  ) {
    const removal = redistributeRemovedWeights(base, removed, mode === 'pick' ? recv : null);
    const addition = allocateWeightsForNewSubnets(removal.weights, added, {
      topN,
      takeRatio: takePct / 100,
      mode: splitMode,
    });
    const weights = { ...addition.weights };
    for (const [id, v] of Object.entries(overrides)) {
      if (id in weights) weights[id] = v;
    }
    return { removal, addition, weights };
  }

  // Đồng bộ trạng thái nháp + tính lại tỷ trọng hiển thị. Chỉ truyền phần thay đổi,
  // các mảnh còn lại giữ nguyên giá trị hiện tại.
  function applyDraft(next = {}) {
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
      s.base, s.removed, s.mode, s.recv, s.added, s.overrides, s.topN, s.takePct, s.splitMode
    );
    setWeightDrafts(Object.fromEntries(Object.entries(weights).map(([id, v]) => [id, fmtPct(v)])));
  }

  function updateWeightDraft(netuid, value) {
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
    const factor = addition.taken[netuid] != null
      ? Math.max(0.01, 1 - addTakePct / 100)
      : 1;
    setBaseWeights((b) => ({ ...b, [netuid]: Math.max(0, num / factor - received) }));
  }

  // Bỏ subnet khỏi bản nháp: subnet mới thêm thì gỡ khỏi danh sách thêm (trả lại tỷ trọng
  // đã trích cho các subnet lớn), subnet có sẵn thì đánh dấu đã bỏ để chia lại.
  function removeSubnetFromDraft(netuid) {
    const id = String(netuid);
    setDraftGroups((gs) =>
      gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => x !== id) }))
    );
    if (addedIds.includes(id)) {
      unpickCandidate(id);
      return;
    }
    applyDraft({
      removed: [...removedIds, id],
      recv: receivers.filter((x) => x !== id),
    });
  }

  // Xoá cả một nhóm generate (vd cả 10 subnet tăng trưởng 1 ngày) trong một thao tác.
  function removeGroupFromDraft(netuids) {
    const ids = [...new Set((netuids || []).map(String))];
    if (!ids.length) return;
    const idSet = new Set(ids);
    setDraftGroups((gs) =>
      gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => !idSet.has(x)) }))
    );
    const toUnpick = ids.filter((id) => addedIds.includes(id));
    const toRemove = ids.filter((id) => !addedIds.includes(id) && !removedIds.includes(id));
    if (toUnpick.length) {
      const overrides = { ...addOverrides };
      toUnpick.forEach((id) => { delete overrides[id]; });
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

  // Khôi phục subnet đã bỏ (trả lại tỷ trọng gốc, pool chia lại cho ít subnet hơn).
  function restoreSubnet(netuid) {
    const id = String(netuid);
    // Đưa lại vào nhóm gốc nếu còn nhớ; nếu không thì nhóm "other".
    setDraftGroups((gs) => {
      const already = gs.some((g) => g.netuids.includes(id));
      if (already) return gs;
      const other = gs.find((g) => g.changeKey === 'other');
      if (other) {
        return gs.map((g) =>
          g.changeKey === 'other' ? { ...g, netuids: [...g.netuids, id] } : g
        );
      }
      return [
        ...gs,
        { changeKey: 'other', n: 1, netuids: [id], label: 'Khác / chưa phân nhóm' },
      ];
    });
    applyDraft({ removed: removedIds.filter((x) => x !== id) });
  }

  // Tick/bỏ tick subnet nhận phần tỷ trọng giải phóng (mọi thao tác tick = chọn thủ công).
  // Đang ở chế độ chia đều cho tất cả → bỏ tick 1 subnet nghĩa là giữ lại tất cả subnet còn lại
  // trừ subnet vừa bỏ tick.
  function toggleReceiver(netuid) {
    const { removal } = computeDraft();
    const next = removal.targets.includes(netuid)
      ? removal.targets.filter((id) => id !== netuid)
      : [...removal.targets, netuid];
    applyDraft({ mode: 'pick', recv: next });
  }

  // Chọn tất cả = quay về chế độ chia đều cho mọi subnet còn lại.
  function selectAllReceivers() {
    applyDraft({ mode: 'all', recv: [] });
  }

  // Bỏ chọn tất cả = không subnet nào nhận thêm; tổng nhập sẽ < 100% và được
  // chuẩn hoá lại theo đúng tỷ lệ hiện tại khi bấm ÁP DỤNG.
  function clearReceivers() {
    applyDraft({ mode: 'pick', recv: [] });
  }

  function changeReceiveMode(mode) {
    applyDraft({ mode });
  }

  // ── Thêm subnet mới ───────────────────────────────────────────────────────
  // Gắn subnet mới vào nhóm khớp tiêu chí đang chọn (thường = tăng trưởng 1 ngày).
  function assignIdsToDraftGroup(ids, changeKey) {
    const incoming = [...new Set(ids.map(String))];
    if (!incoming.length) return;
    setDraftGroups((gs) => {
      const without = gs.map((g) => ({
        ...g,
        netuids: g.netuids.filter((id) => !incoming.includes(id)),
      }));
      const idx = without.findIndex((g) => g.changeKey === changeKey);
      if (idx >= 0) {
        return without.map((g, i) =>
          i === idx ? { ...g, netuids: [...g.netuids, ...incoming] } : g
        );
      }
      return [
        ...without,
        {
          changeKey,
          n: incoming.length,
          netuids: incoming,
          label: groupLabel(changeKey),
        },
      ];
    });
  }

  function pickCandidates(ids) {
    const merged = [...new Set([...addedIds, ...ids.map(String)])];
    const sorted = sortIdsByChange(merged, addChangeKey);
    const newly = sorted.filter((id) => !addedIds.includes(id));
    assignIdsToDraftGroup(newly, addChangeKey);
    applyDraft({ added: sorted });
  }

  // Đổi tiêu chí xếp hạng → xếp lại cả danh sách đã chọn để thứ tự nhận tỷ trọng
  // luôn khớp với tiêu chí đang xem.
  function changeAddChangeKey(key) {
    setAddChangeKey(key);
    applyDraft({ added: sortIdsByChange(addedIds, key) });
  }

  function unpickCandidate(netuid) {
    const id = String(netuid);
    const overrides = { ...addOverrides };
    delete overrides[id];
    setDraftGroups((gs) =>
      gs.map((g) => ({ ...g, netuids: g.netuids.filter((x) => x !== id) }))
    );
    applyDraft({ added: addedIds.filter((x) => x !== id), overrides });
  }

  function toggleCandidate(netuid) {
    const id = String(netuid);
    if (addedIds.includes(id)) unpickCandidate(id);
    else pickCandidates([id]);
  }

  function clearCandidates() {
    const clearing = new Set(addedIds);
    setDraftGroups((gs) =>
      gs.map((g) => ({ ...g, netuids: g.netuids.filter((id) => !clearing.has(id)) }))
    );
    applyDraft({ added: [], overrides: {} });
  }

  function applyWeightEdits(idx, saved) {
    const netuids = Object.keys(weightDrafts);
    if (!netuids.length) {
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text: 'Danh mục phải có ít nhất 1 subnet' } }));
      setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 2500);
      return;
    }
    // Chuẩn hoá tổng về 1.0 (giống editor khi generate) để luôn hợp lệ Tao/Alpha.
    const vals = netuids.map((id) => {
      const v = parseFloat(weightDrafts[id]);
      return isNaN(v) ? 0 : Math.max(0, v);
    });
    const norm = normalize(vals);
    const newPortfolio = { _: 0 };
    netuids.forEach((id, i) => { newPortfolio[id] = norm[i]; });

    const { valid, errors } = validateTaoAlphaPortfolio(newPortfolio);
    if (!valid) {
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text: errors[0] } }));
      setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 2500);
      return;
    }
    // Cảnh báo nếu tỷ trọng mới trùng lặp (sẽ bị dedupe) với danh mục khác đã lưu.
    const dup = checkDedupe(newPortfolio, othersExcept(idx));
    if (!dup.ok) {
      const c = dup.conflicts[0];
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text:
        `⚠ Trùng lặp với "${c.name || 'danh mục khác'}" (d=${c.dist} < ${DD_TRIGGER}) → sẽ bị dedupe. Chưa lưu.` } }));
      setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 4000);
      return;
    }
    // Subnet mới thêm chưa có giá/tên lưu → ghi giá hiện tại làm giá mua vào, nếu không
    // cột "Biến động" của chúng sẽ mãi hiện "—".
    const extra = { prices: {}, names: {} };
    netuids.forEach((id) => {
      const row = currentData.find((r) => String(r.netuid) === id);
      if (!row) return;
      const p = parseFloat(row.price);
      if (saved?.prices?.[id] == null && !isNaN(p)) extra.prices[id] = p;
      if (saved?.names?.[id] == null && row.name) extra.names[id] = row.name;
    });

    // Persist membership nhóm (chỉ giữ netuid còn trong danh mục sau khi áp dụng).
    const keep = new Set(netuids);
    const seen = new Set();
    extra.groups = draftGroups
      .map((g) => {
        const ids = g.netuids.filter((id) => keep.has(id) && !seen.has(id));
        ids.forEach((id) => seen.add(id));
        return {
          changeKey: g.changeKey,
          n: ids.length,
          netuids: ids,
          label: groupLabel(g.changeKey, g.label),
        };
      })
      .filter((g) => g.netuids.length > 0);
    const orphan = netuids.filter((id) => !seen.has(id));
    if (orphan.length) {
      extra.groups.push({
        changeKey: 'other',
        n: orphan.length,
        netuids: orphan,
        label: 'Khác / chưa phân nhóm',
      });
    }

    const addedCount = addedIds.length;
    onUpdate(idx, newPortfolio, extra);
    cancelEditWeights();
    setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: true, text:
      `✓ Đã cập nhật tỷ trọng${addedCount ? ` · thêm ${addedCount} subnet mới` : ''} (d=${dup.minDist ?? '—'})` } }));
    setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 2500);
  }

  function startEditJson(idx, portfolio) {
    setEditingIdx(null);
    setEditingWeightsIdx(null);
    setEditingJsonIdx(idx);
    setJsonDraft(relaxedJson(portfolio));
  }

  function cancelEditJson() {
    setEditingJsonIdx(null);
    setJsonDraft('');
  }

  function applyJsonEdits(idx) {
    const setErr = (text) => {
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text } }));
      setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 3000);
    };

    let parsed;
    try {
      // Thêm lại ngoặc kép cho key số nguyên (định dạng thoáng) trước khi JSON.parse.
      parsed = JSON.parse(jsonDraft.replace(/(\d+)\s*:/g, '"$1":'));
    } catch {
      setErr('JSON sai cú pháp');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      setErr('JSON phải là một object');
      return;
    }

    // Chuẩn hoá về portfolio: đảm bảo có '_' và mọi value là number.
    const portfolio = { _: parsed._ ?? 0 };
    for (const [k, v] of Object.entries(parsed)) {
      if (k === '_') continue;
      const num = typeof v === 'number' ? v : parseFloat(v);
      portfolio[k] = num;
    }

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
    setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: true, text: `✓ Đã cập nhật JSON (d=${dup.minDist ?? '—'})` } }));
    setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 2500);
  }

  function handleCopyJson(idx, portfolio) {
    const json = relaxedJson(portfolio);
    navigator.clipboard.writeText(json).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 2000);
    });
  }

  function startRename(idx, currentName) {
    setEditingIdx(idx);
    setNameDraft(currentName || '');
  }

  function commitRename(idx) {
    onRename(idx, nameDraft.trim());
    setEditingIdx(null);
    setNameDraft('');
  }

  function cancelRename() {
    setEditingIdx(null);
    setNameDraft('');
  }

  function handleRebalance(idx, portfolio) {
    // Rebalance đảm bảo khoảng cách tới các danh mục khác ≥ ngưỡng + biên an toàn
    // để không bị mạng dedupe (tăng dần biên độ nhiễu nếu cần).
    const target = DD_TRIGGER + DEDUPE_SAFE_MARGIN;
    const { portfolio: newPortfolio, ok: safe, minDist } = rebalancePortfolioSafe(
      portfolio, othersExcept(idx), target, dedupeDistance
    );
    const { valid, errors } = validateTaoAlphaPortfolio(newPortfolio);
    if (!valid) {
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text: errors[0] } }));
    } else if (!safe) {
      // Không tách đủ xa (thường do danh mục chỉ 1 subnet, luôn chuẩn hoá về cùng vector).
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: false, text:
        `⚠ Không tách đủ xa khỏi danh mục khác (d=${minDist ?? '—'} < ${target.toFixed(3)}). ` +
        `Danh mục 1 subnet không thể thoát dedupe bằng đổi tỷ trọng — hãy đổi/thêm subnet. Chưa lưu.` } }));
    } else {
      onUpdate(idx, newPortfolio);
      setRebalanceMsgs((m) => ({ ...m, [idx]: { ok: true, text: `✓ Đã rebalance an toàn (d=${minDist ?? '—'} ≥ ${DD_TRIGGER})` } }));
    }
    setTimeout(() => setRebalanceMsgs((m) => { const n = { ...m }; delete n[idx]; return n; }), 3500);
  }

  if (!savedList.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 bg-slate-900 border border-dashed border-slate-600 rounded-lg text-slate-400 text-xs text-center p-8">
        <div className="text-xs text-slate-600">⬇</div>
        <div>Chưa có danh mục nào được lưu</div>
        <div className="flex items-center gap-3">{fileButtons}</div>
        {fileMsg && (
          <div className={fileMsg.ok ? 'text-emerald-400' : 'text-red-400'}>{fileMsg.text}</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0 px-6 pt-6 pb-2 gap-3">
        <div className="text-xs font-bold tracking-wider text-slate-400">
          DANH MỤC ĐÃ LƯU ({savedList.length})
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400"
            title="Ngưỡng xếp hạng lấy từ DATA TABLE đang nạp: subnet nằm trong top N emission / top N thanh khoản mới được coi là 'top'"
          >
            <span className="font-bold tracking-wider">TOP</span>
            <label className="flex items-center gap-1 cursor-pointer" title="Top N theo emission">
              <span className="text-amber-300">⚡</span>
              <input
                type="number"
                min="1"
                value={topEmissionN}
                onChange={(e) => setTopEmissionN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-right outline-none focus:border-amber-400"
              />
            </label>
            <label className="flex items-center gap-1 cursor-pointer" title="Top N theo thanh khoản">
              <span className="text-cyan-300">💧</span>
              <input
                type="number"
                min="1"
                value={topLiquidityN}
                onChange={(e) => setTopLiquidityN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-14 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-right outline-none focus:border-cyan-400"
              />
            </label>
          </div>
          {fileButtons}
          <button
            className="px-3 py-2 bg-violet-500/10 border border-violet-500 rounded-lg text-violet-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-violet-500 hover:text-white whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={runDedupeCheck}
            disabled={savedList.length < 2}
            title="So khoảng cách dedupe của tất cả danh mục đã lưu với nhau (ngưỡng 0.01)"
          >
            ⚖ KIỂM TRA DEDUPE
          </button>
        </div>
      </div>
      {fileBanner}
      {!canRank && (
        <div className="shrink-0 px-6 pb-3 text-xs text-amber-300">
          ⚠ Chưa nạp DATA TABLE → không phân loại được top emission / top thanh khoản.
          Paste data ở ô DATA INPUT để bật phân loại.
        </div>
      )}
      {dedupeReport && (
        <div className="shrink-0 px-6 pb-3">
          <div className={`rounded-lg border p-3 text-xs ${
            dedupeReport.conflicts.length
              ? 'border-red-400 bg-red-400/10'
              : 'border-emerald-400 bg-emerald-400/10'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`font-bold ${dedupeReport.conflicts.length ? 'text-red-400' : 'text-emerald-400'}`}>
                {dedupeReport.conflicts.length
                  ? `⚠ ${dedupeReport.conflicts.length} cặp trùng lặp (d < ${DD_TRIGGER}) → sẽ bị dedupe`
                  : `✓ Không có cặp nào trùng lặp — tất cả ${dedupeReport.count} danh mục an toàn với nhau`}
              </div>
              <button
                className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                title="Đóng"
                onClick={() => setDedupeReport(null)}
              >
                ✕
              </button>
            </div>
            <div className="text-slate-400 mt-1">
              Đã so {dedupeReport.pairs} cặp.
              {dedupeReport.minPair && (
                <> Khoảng cách nhỏ nhất: <span className="text-slate-100 font-bold tabular-nums">{dedupeReport.minPair.dist}</span>
                {' '}(giữa <span className="text-slate-100">{dedupeReport.minPair.ni}</span> ↔ <span className="text-slate-100">{dedupeReport.minPair.nj}</span>).</>
              )}
            </div>
            {dedupeReport.conflicts.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {dedupeReport.conflicts.map((c) => (
                  <div key={`${c.i}-${c.j}`} className="flex items-center gap-2 text-red-300">
                    <span className="tabular-nums font-bold w-16 shrink-0">d={c.dist}</span>
                    <span className="truncate">{c.ni}</span>
                    <span className="text-slate-500">↔</span>
                    <span className="truncate">{c.nj}</span>
                  </div>
                ))}
                <div className="text-slate-400 mt-1">
                  Danh mục nộp <b>sau</b> trong mỗi cặp sẽ bị phạt điểm. Hãy đổi tỷ trọng / thêm-bớt subnet
                  (hoặc bấm ⟳ REBALANCE) để tách khoảng cách ≥ {DD_TRIGGER}.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-y-auto px-6 pb-6 show-scrollbar">
          <div className="flex flex-col gap-4">
        {savedList.map((saved, idx) => {
          const isExpanded = expandedIdx === idx;
          const entries = Object.entries(saved.portfolio)
            .filter(([k]) => k !== '_')
            .sort((a, b) => b[1] - a[1]); // cùng thứ tự JSON: tỷ trọng cao → thấp
          // Tổng hợp phân loại của danh mục đã lưu (dùng cho badge ở header).
          const savedStats = canRank ? summarize(entries) : null;

          return (
            <div
              key={saved.savedAt}
              className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden"
            >
              {/* Saved item header */}
              <div
                className="flex items-center justify-between px-4 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => (editingIdx === idx || editingWeightsIdx === idx || editingJsonIdx === idx) ? null : setExpandedIdx(isExpanded ? null : idx)}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-violet-500 text-xs">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                  {editingIdx === idx ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      placeholder="Tên danh mục…"
                      className="bg-slate-900 border border-violet-500 rounded px-2 py-1 text-xs text-slate-100 font-bold outline-none w-48"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(idx);
                        if (e.key === 'Escape') cancelRename();
                      }}
                    />
                  ) : (
                    <span
                      className="text-xs text-slate-100 font-bold truncate"
                      title={saved.name || undefined}
                    >
                      {saved.name || new Date(saved.savedAt).toLocaleString('vi-VN')}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 shrink-0">
                    {entries.length} subnets
                  </span>
                  {savedStats && (
                    <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold">
                      {['both', 'emission', 'liquidity', 'none'].map((tier) =>
                        savedStats[tier].count ? (
                          <span
                            key={tier}
                            className={`rounded border px-1.5 py-0.5 tabular-nums ${TIERS[tier].box}`}
                            title={`${TIERS[tier].label}: ${savedStats[tier].count} subnet · ${savedStats[tier].weight.toFixed(2)}% tỷ trọng — ${TIERS[tier].hint}`}
                          >
                            {TIERS[tier].chip} {savedStats[tier].count}
                          </span>
                        ) : null
                      )}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {editingIdx === idx ? (
                    <>
                      <button
                        className="text-lg leading-none text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1"
                        title="Lưu tên"
                        onClick={(e) => { e.stopPropagation(); commitRename(idx); }}
                      >
                        ✓
                      </button>
                      <button
                        className="text-lg leading-none text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
                        title="Huỷ"
                        onClick={(e) => { e.stopPropagation(); cancelRename(); }}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <button
                      className="text-lg leading-none text-slate-500 hover:text-violet-400 transition-colors px-2 py-1"
                      title="Đặt tên danh mục"
                      onClick={(e) => { e.stopPropagation(); startRename(idx, saved.name); }}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    className="text-lg leading-none text-slate-500 hover:text-red-400 transition-colors px-2 py-1"
                    title="Xoá danh mục"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(idx);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (() => {
                let totalWeightedChange = 0;
                let totalWeight = 0;

                const isEditingWeights = editingWeightsIdx === idx;
                const isEditingJson = editingJsonIdx === idx;
                // Khi đang sửa, bảng chạy theo bản nháp (đã trừ subnet bị xoá); ngược lại theo danh mục đã lưu.
                // Luôn sort tỷ trọng giảm dần — đồng bộ với JSON bên phải.
                const displayEntries = (isEditingWeights
                  ? Object.entries(weightDrafts).map(([k, v]) => {
                      const p = parseFloat(v);
                      return [k, isNaN(p) ? 0 : p / 100];
                    })
                  : entries
                ).sort((a, b) => b[1] - a[1]);

                const rowsData = displayEntries.map(([netuid, weight]) => {
                  const savedPrice = saved.prices?.[netuid];
                  const currentSubnet = currentData.find(
                    (r) => String(r.netuid) === netuid
                  );
                  const currentPrice = currentSubnet
                    ? parseFloat(currentSubnet.price)
                    : null;
                  const priceChange =
                    savedPrice && currentPrice
                      ? ((currentPrice - savedPrice) / savedPrice) * 100
                      : null;

                  if (priceChange != null) {
                    totalWeightedChange += priceChange * weight;
                    totalWeight += weight;
                  }

                  return { netuid, weight, savedPrice, currentSubnet, currentPrice, priceChange };
                });

                // Chia bảng theo nhóm generate (thanh khoản / tăng trưởng …) để xoá cả cụm.
                // Trong mỗi section vẫn xếp theo tỷ trọng giảm dần (không theo thứ tự netuid / generate).
                const byWeightDesc = (a, b) => b.weight - a.weight;
                const activeGroups = isEditingWeights
                  ? draftGroups
                  : resolvePortfolioGroups(saved, currentData);
                const rowById = new Map(rowsData.map((r) => [r.netuid, r]));
                const placed = new Set();
                const sections = activeGroups
                  .map((g) => {
                    const rows = g.netuids
                      .map((id) => rowById.get(String(id)))
                      .filter(Boolean)
                      .sort(byWeightDesc);
                    rows.forEach((r) => placed.add(r.netuid));
                    return {
                      changeKey: g.changeKey,
                      label: groupLabel(g.changeKey, g.label),
                      netuids: rows.map((r) => r.netuid),
                      rows,
                    };
                  })
                  .filter((s) => s.rows.length > 0);
                const leftover = rowsData.filter((r) => !placed.has(r.netuid)).sort(byWeightDesc);
                if (leftover.length) {
                  sections.push({
                    changeKey: 'other',
                    label: 'Khác / chưa phân nhóm',
                    netuids: leftover.map((r) => r.netuid),
                    rows: leftover,
                  });
                }
                // Fallback: không suy ra được nhóm → một section phẳng.
                if (!sections.length && rowsData.length) {
                  sections.push({
                    changeKey: 'other',
                    label: 'Tất cả subnet',
                    netuids: rowsData.map((r) => r.netuid),
                    rows: rowsData,
                  });
                }

                const portfolioReturn = totalWeight > 0 ? totalWeightedChange / totalWeight : null;
                // Phân loại theo bản nháp đang sửa (nếu có) để thấy ngay tác động của thay đổi.
                const tierStats = canRank ? summarize(displayEntries) : null;
                // Tổng % người dùng nhập (trước khi chuẩn hoá về 100%).
                const draftSum = Object.values(weightDrafts).reduce((a, v) => {
                  const p = parseFloat(v);
                  return a + (isNaN(p) ? 0 : p);
                }, 0);

                // Bản nháp hiện tại (chỉ khi đang sửa tỷ trọng): dist = phân bổ lại phần của
                // subnet vừa bỏ, add = phần trích từ top N cấp cho các subnet mới thêm.
                const draft = isEditingWeights ? computeDraft() : null;
                const dist = draft?.removal ?? null;
                const add = draft?.addition ?? null;
                const hasRemoved = isEditingWeights && removedIds.length > 0;
                const subnetName = (id) =>
                  currentData.find((r) => String(r.netuid) === id)?.name || saved.names?.[id] || 'Unknown';

                return (
                <div className="border-t border-slate-700 grid grid-cols-2 min-h-0">
                  {/* Left: detail table */}
                  <div className="p-4 overflow-y-auto border-r border-slate-700">
                    {tierStats && (
                      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-xs flex flex-col gap-2">
                        <div className="text-slate-500 font-bold tracking-wider">
                          PHÂN LOẠI THEO DATA TABLE · TOP ⚡{topEmissionN} EMISSION · TOP 💧{topLiquidityN} THANH KHOẢN
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['both', 'emission', 'liquidity', 'none'].map((tier) => (
                            <div
                              key={tier}
                              className={`rounded border p-2 flex flex-col gap-0.5 ${
                                tierStats[tier].count ? TIERS[tier].box : 'border-slate-700 text-slate-600'
                              }`}
                              title={TIERS[tier].hint}
                            >
                              <div className="font-bold whitespace-nowrap">
                                {TIERS[tier].chip} {TIERS[tier].label}
                              </div>
                              <div className="tabular-nums">
                                <b>{tierStats[tier].count}</b> subnet
                              </div>
                              <div className="tabular-nums opacity-80">
                                {tierStats[tier].weight.toFixed(2)}% tỷ trọng
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-slate-400">
                          {tierStats.none.count
                            ? <>→ <b className="text-red-300">{tierStats.none.count} subnet ngoài top</b> đang chiếm{' '}
                                <b className="text-red-300 tabular-nums">{tierStats.none.weight.toFixed(2)}%</b> —
                                cân nhắc cashout và dồn sang nhóm ⚡💧.</>
                            : <>→ Toàn bộ subnet đều thuộc top emission hoặc top thanh khoản.</>}
                          {tierStats.emission.count > 0 && (
                            <> Nhóm <span className="text-amber-300">⚡ chỉ emission</span> thanh khoản thấp — thoát hàng dễ bị slippage.</>
                          )}
                        </div>
                      </div>
                    )}
                    {hasRemoved && (
                      <div className="mb-3 rounded-lg border border-amber-400/60 bg-amber-400/10 p-3 text-xs flex flex-col gap-2">
                        <div className="font-bold text-amber-300">
                          Đã bỏ {removedIds.length} subnet · giải phóng{' '}
                          <span className="tabular-nums">{dist.pool.toFixed(2)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {removedIds.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-slate-300"
                            >
                              <span className="text-violet-400 font-bold">#{id}</span>
                              <span className="truncate max-w-[110px]">{subnetName(id)}</span>
                              <span className="tabular-nums text-slate-400">
                                {(baseWeights[id] ?? 0).toFixed(2)}%
                              </span>
                              <button
                                className="text-slate-500 hover:text-emerald-400 transition-colors"
                                title="Khôi phục subnet này vào danh mục"
                                onClick={() => restoreSubnet(id)}
                              >
                                ↩
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="text-slate-400 font-bold">Chia tỷ trọng đó vào:</span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              className="accent-violet-500"
                              checked={receiveMode === 'all'}
                              onChange={() => changeReceiveMode('all')}
                            />
                            Tất cả subnet còn lại (chia đều)
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                            <input
                              type="radio"
                              className="accent-violet-500"
                              checked={receiveMode === 'pick'}
                              onChange={() => changeReceiveMode('pick')}
                            />
                            Subnet tôi chọn (tick cột “Nhận”)
                          </label>
                          <button
                            className="px-2 py-1 rounded border border-slate-600 text-slate-300 font-bold hover:border-emerald-400 hover:text-emerald-400 transition-colors"
                            title="Chia đều cho tất cả subnet còn lại"
                            onClick={selectAllReceivers}
                          >
                            ☑ CHỌN TẤT CẢ
                          </button>
                          <button
                            className="px-2 py-1 rounded border border-slate-600 text-slate-300 font-bold hover:border-amber-400 hover:text-amber-400 transition-colors"
                            title="Không subnet nào nhận thêm — phần giải phóng sẽ được chuẩn hoá lại theo tỷ lệ hiện tại"
                            onClick={clearReceivers}
                          >
                            ☐ BỎ CHỌN TẤT CẢ
                          </button>
                        </div>
                        <div className="text-slate-400">
                          {!dist.remainingIds.length
                            ? 'Không còn subnet nào trong danh mục.'
                            : dist.targets.length
                              ? <>Mỗi subnet nhận thêm{' '}
                                  <b className="text-slate-100 tabular-nums">{dist.share.toFixed(4)}%</b>
                                  {' '}({dist.targets.length}/{dist.remainingIds.length} subnet nhận).</>
                              : <span className="text-amber-300">
                                  Không subnet nào nhận → giữ nguyên tỷ trọng hiện tại của{' '}
                                  {dist.remainingIds.length} subnet còn lại; {dist.pool.toFixed(2)}% giải phóng
                                  sẽ được chuẩn hoá lại theo đúng tỷ lệ giữa chúng khi bấm ÁP DỤNG.
                                </span>}
                        </div>
                      </div>
                    )}
                    {isEditingWeights && (
                      <div className="mb-3 rounded-lg border border-sky-400/60 bg-sky-400/10 p-3 text-xs flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <span className="font-bold text-sky-300">➕ THÊM SUBNET TĂNG TRƯỞNG</span>
                          <select
                            value={addChangeKey}
                            onChange={(e) => changeAddChangeKey(e.target.value)}
                            className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-slate-100 font-mono text-xs outline-none focus:border-sky-400 cursor-pointer"
                            title="Tiêu chí xếp hạng ứng viên (subnet chưa có trong danh mục này)"
                          >
                            {CHANGE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <label
                            className="flex items-center gap-1 text-slate-300"
                            title="Mỗi subnet trong top lớn nhất nhả ra bấy nhiêu % TỶ TRỌNG CỦA CHÍNH NÓ (vd 10% của 4% = 0.4%)"
                          >
                            lấy
                            <NumericTextInput
                              value={addTakePct}
                              onValue={(n) => applyDraft({
                                takePct: Math.min(MAX_ADD_TAKE_PCT, Math.max(0, n)),
                              })}
                              className="w-14 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-right outline-none focus:border-sky-400"
                            />
                            % của top
                            <NumericTextInput
                              integer
                              value={addTopN}
                              onValue={(n) => applyDraft({ topN: Math.max(0, n) })}
                              className="w-14 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-right outline-none focus:border-sky-400"
                            />
                            subnet lớn nhất
                          </label>
                          <label className="flex items-center gap-1 text-slate-300" title="Cách chia phần lấy được cho các subnet mới">
                            chia
                            <select
                              value={addSplitMode}
                              onChange={(e) => applyDraft({ splitMode: e.target.value })}
                              className="bg-slate-950 border border-slate-600 rounded px-2 py-1 text-slate-100 font-mono text-xs outline-none focus:border-sky-400 cursor-pointer"
                            >
                              <option value="decreasing">giảm dần (cao → thấp)</option>
                              <option value="equal">đều nhau</option>
                            </select>
                          </label>
                        </div>

                        {addedIds.length > 0 ? (
                          <div className="text-slate-300">
                            Đã chọn <b className="text-sky-300">{addedIds.length} subnet mới</b> · lấy{' '}
                            <b className="text-sky-300 tabular-nums">{add.pool.toFixed(4)}%</b> từ{' '}
                            {Object.keys(add.taken).length} subnet lớn nhất
                            {addSplitMode === 'decreasing' ? (
                              <> · chia giảm dần từ{' '}
                                <b className="text-slate-100 tabular-nums">
                                  {(add.shares[addedIds[0]] ?? 0).toFixed(4)}%
                                </b>{' '}xuống{' '}
                                <b className="text-slate-100 tabular-nums">
                                  {(add.shares[addedIds[addedIds.length - 1]] ?? 0).toFixed(4)}%
                                </b>.</>
                            ) : (
                              <> · mỗi subnet{' '}
                                <b className="text-slate-100 tabular-nums">
                                  {(add.shares[addedIds[0]] ?? 0).toFixed(4)}%
                                </b>.</>
                            )}
                            {Object.keys(addOverrides).length > 0 && (
                              <span className="text-amber-300"> ({Object.keys(addOverrides).length} subnet đã sửa tay — giữ nguyên số bạn nhập.)</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400">
                            Tick subnet bên dưới để thêm vào danh mục — tỷ trọng của chúng được trích từ{' '}
                            {addTakePct}% tỷ trọng của mỗi subnet trong top {addTopN} lớn nhất, phần còn lại
                            của danh mục giữ nguyên tỷ lệ.
                          </div>
                        )}

                        {!candidates.length ? (
                          <div className="text-amber-300">
                            {currentData.length
                              ? 'Mọi subnet trong data table đều đã có trong danh mục này.'
                              : '⚠ Chưa nạp DATA TABLE → không có ứng viên để thêm.'}
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-400">
                                {candidates.length} subnet chưa có trong danh mục · hiện
                              </span>
                              <NumericTextInput
                                integer
                                value={candidateLimit}
                                onValue={(n) => setCandidateLimit(Math.max(0, n))}
                                className="w-16 bg-slate-950 border border-slate-600 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-right outline-none focus:border-sky-400"
                              />
                              <button
                                className="px-2 py-1 rounded border border-slate-600 text-slate-300 font-bold hover:border-sky-400 hover:text-sky-400 transition-colors"
                                title={`Thêm nhanh ${candidateLimit} subnet tăng mạnh nhất đang hiển thị`}
                                onClick={() => pickCandidates(
                                  candidates.slice(0, candidateLimit).map((c) => c.netuid)
                                )}
                              >
                                ➕ THÊM {Math.min(candidateLimit, candidates.length)} SUBNET ĐẦU
                              </button>
                              <button
                                className="px-2 py-1 rounded border border-slate-600 text-slate-300 font-bold hover:border-amber-400 hover:text-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={!addedIds.length}
                                onClick={clearCandidates}
                              >
                                ☐ BỎ CHỌN TẤT CẢ
                              </button>
                            </div>
                            <div className="max-h-56 overflow-y-auto rounded border border-slate-700 bg-slate-950/60 show-scrollbar">
                              <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-x-3 gap-y-1 p-2 items-center">
                                {candidates.slice(0, candidateLimit).map((c) => {
                                  const picked = addedIds.includes(c.netuid);
                                  return (
                                    <Fragment key={c.netuid}>
                                      <input
                                        type="checkbox"
                                        className="accent-sky-400 cursor-pointer"
                                        checked={picked}
                                        onChange={() => toggleCandidate(c.netuid)}
                                      />
                                      <span className="text-violet-500 font-bold">#{c.netuid}</span>
                                      <span className="text-slate-200 truncate" title={c.name}>{c.name}</span>
                                      <span className={`tabular-nums font-bold text-right ${
                                        isNaN(c.change) ? 'text-slate-600'
                                          : c.change > 0 ? 'text-emerald-400'
                                          : c.change < 0 ? 'text-red-400' : 'text-slate-500'
                                      }`}>
                                        {isNaN(c.change) ? '—' : `${c.change > 0 ? '+' : ''}${c.change.toFixed(2)}%`}
                                      </span>
                                      <span>{tierCell(c.netuid)}</span>
                                      <span className="tabular-nums text-right w-16">
                                        {picked
                                          ? <b className="text-sky-300">{(add.shares[c.netuid] ?? 0).toFixed(4)}%</b>
                                          : <span className="text-slate-700">—</span>}
                                      </span>
                                    </Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className={`grid ${isEditingWeights ? (hasRemoved ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto_auto]' : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto]') : 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]'} gap-x-3 gap-y-2 text-xs`}>
                      <div className="text-slate-500 font-bold">ID</div>
                      <div className="text-slate-500 font-bold">Tên</div>
                      <div
                        className="text-slate-500 font-bold"
                        title="⚡#n = hạng emission · 💧#n = hạng thanh khoản trong data table hiện tại"
                      >
                        Nhóm
                      </div>
                      <div className="text-slate-500 font-bold text-right">Tỷ trọng</div>
                      <div className="text-slate-500 font-bold text-right">Giá lưu</div>
                      <div className="text-slate-500 font-bold text-right">Giá hiện tại</div>
                      <div className="text-slate-500 font-bold text-right">Biến động</div>
                      {hasRemoved && (
                        <div className="text-slate-500 font-bold text-center" title="Subnet nhận phần tỷ trọng của các subnet đã bỏ">
                          Nhận
                        </div>
                      )}
                      {isEditingWeights && <div className="text-slate-500 font-bold text-center">Xoá</div>}
                      {sections.map((section, sectionIdx) => (
                        <Fragment key={`${section.changeKey}-${sectionIdx}`}>
                          <div className="col-span-full mt-2 first:mt-0 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900/80 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold tracking-wider text-slate-200">
                                {section.label}
                              </span>
                              <span className="tabular-nums text-slate-400">
                                {section.rows.length} subnet ·{' '}
                                {(section.rows.reduce((a, r) => a + (Number(r.weight) || 0), 0) * 100).toFixed(2)}%
                              </span>
                            </div>
                            {isEditingWeights && section.netuids.length > 0 && (
                              <button
                                className="px-2 py-1 rounded border border-red-400/50 text-red-300 font-bold hover:bg-red-400 hover:text-slate-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title={`Xoá cả ${section.rows.length} subnet trong nhóm "${section.label}" — tỷ trọng giải phóng chia cho subnet còn lại`}
                                disabled={rowsData.length <= section.netuids.length}
                                onClick={() => removeGroupFromDraft(section.netuids)}
                              >
                                ✕ XOÁ CẢ NHÓM ({section.rows.length})
                              </button>
                            )}
                          </div>
                          {section.rows.map(({ netuid, weight, savedPrice, currentSubnet, currentPrice, priceChange }) => (
                        <Fragment key={netuid}>
                          <div className="text-violet-500 font-bold">#{netuid}</div>
                          <div className="text-slate-100 overflow-hidden text-ellipsis whitespace-nowrap">
                            {currentSubnet?.name || saved.names?.[netuid] || 'Unknown'}
                            {isEditingWeights && addedIds.includes(netuid) && (
                              <span
                                className="ml-1.5 rounded border border-sky-400/60 bg-sky-400/10 px-1 py-0.5 text-[10px] font-bold text-sky-300"
                                title="Subnet mới thêm — tỷ trọng trích từ các subnet lớn nhất"
                              >
                                MỚI
                              </span>
                            )}
                          </div>
                          <div>{tierCell(netuid)}</div>
                          {isEditingWeights ? (
                            <div className="flex items-center justify-end gap-1">
                              {add.taken[netuid] != null && (
                                <span
                                  className="text-[10px] text-amber-400 tabular-nums"
                                  title={`Đã trích ${addTakePct}% tỷ trọng của subnet này cho ${addedIds.length} subnet mới`}
                                >
                                  −{add.taken[netuid].toFixed(2)}
                                </span>
                              )}
                              <NumericTextInput
                                value={weightDrafts[netuid] ?? ''}
                                onChange={(v) => updateWeightDraft(netuid, v)}
                                className={`w-20 bg-slate-950 border rounded px-2 py-1 text-slate-100 font-mono text-xs text-right outline-none ${
                                  addedIds.includes(netuid)
                                    ? 'border-sky-400'
                                    : hasRemoved && dist.targets.includes(netuid)
                                      ? 'border-emerald-400'
                                      : 'border-violet-500'
                                }`}
                              />
                            </div>
                          ) : (
                            <div className="text-slate-100 text-right tabular-nums">
                              {(weight * 100).toFixed(2)}%
                            </div>
                          )}
                          <div className="text-slate-400 text-right tabular-nums">
                            {savedPrice != null ? savedPrice.toFixed(6) : '—'}
                          </div>
                          <div className="text-slate-100 text-right tabular-nums">
                            {currentPrice != null ? currentPrice.toFixed(6) : <span className="text-slate-600">—</span>}
                          </div>
                          <div className="text-right tabular-nums">
                            {priceChange != null ? (
                              <span className={priceChange > 0 ? 'text-emerald-400' : priceChange < 0 ? 'text-red-400' : 'text-slate-500'}>
                                {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                          {hasRemoved && (
                            <div className="text-center">
                              <input
                                type="checkbox"
                                className="accent-emerald-400 cursor-pointer"
                                checked={dist.targets.includes(netuid)}
                                title="Nhận phần tỷ trọng của các subnet đã bỏ"
                                onChange={() => toggleReceiver(netuid)}
                              />
                            </div>
                          )}
                          {isEditingWeights && (
                            <div className="text-center">
                              <button
                                className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-500"
                                title={
                                  rowsData.length <= 1
                                    ? 'Danh mục phải còn ít nhất 1 subnet'
                                    : addedIds.includes(netuid)
                                      ? 'Bỏ subnet vừa thêm (trả lại tỷ trọng đã trích)'
                                      : 'Bỏ subnet khỏi danh mục'
                                }
                                disabled={rowsData.length <= 1}
                                onClick={() => removeSubnetFromDraft(netuid)}
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </Fragment>
                          ))}
                        </Fragment>
                      ))}
                      {/* Summary row */}
                      {isEditingWeights ? (
                        <>
                          <div className={`${hasRemoved ? 'col-span-8' : 'col-span-7'} border-t border-slate-700 pt-2 mt-1 text-slate-400 font-bold text-right`}>
                            Tổng nhập (sẽ chuẩn hoá về 100%)
                          </div>
                          <div className="border-t border-slate-700 pt-2 mt-1 text-right tabular-nums font-bold text-slate-100">
                            {draftSum.toFixed(2)}%
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-6 border-t border-slate-700 pt-2 mt-1 text-slate-400 font-bold text-right">
                            Tổng danh mục
                          </div>
                          <div className="border-t border-slate-700 pt-2 mt-1 text-right tabular-nums font-bold">
                            {portfolioReturn != null ? (
                              <span className={portfolioReturn > 0 ? 'text-emerald-400' : portfolioReturn < 0 ? 'text-red-400' : 'text-slate-500'}>
                                {portfolioReturn > 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Right: JSON portfolio + rebalance */}
                  <div className="p-4 overflow-y-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold tracking-wider text-slate-500">
                        JSON PORTFOLIO
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditingWeights ? (
                          <>
                            <button
                              className="px-3 py-2 bg-emerald-400/10 border border-emerald-400 rounded-lg text-emerald-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-emerald-400 hover:text-slate-950 whitespace-nowrap"
                              onClick={() => applyWeightEdits(idx, saved)}
                              title="Chuẩn hoá tổng về 1.0 rồi lưu danh mục"
                            >
                              ✓ ÁP DỤNG
                            </button>
                            <button
                              className="px-3 py-2 bg-transparent border border-slate-600 rounded-lg text-slate-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:text-slate-100 hover:border-slate-400 whitespace-nowrap"
                              onClick={cancelEditWeights}
                            >
                              ✕ HỦY
                            </button>
                          </>
                        ) : isEditingJson ? (
                          <>
                            <button
                              className="px-3 py-2 bg-emerald-400/10 border border-emerald-400 rounded-lg text-emerald-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-emerald-400 hover:text-slate-950 whitespace-nowrap"
                              onClick={() => applyJsonEdits(idx)}
                              title="Kiểm tra hợp lệ Tao/Alpha rồi lưu JSON"
                            >
                              ✓ ÁP DỤNG JSON
                            </button>
                            <button
                              className="px-3 py-2 bg-transparent border border-slate-600 rounded-lg text-slate-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:text-slate-100 hover:border-slate-400 whitespace-nowrap"
                              onClick={cancelEditJson}
                            >
                              ✕ HỦY
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="px-3 py-2 bg-emerald-500/10 border border-emerald-500 rounded-lg text-emerald-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-emerald-500 hover:text-white whitespace-nowrap"
                              onClick={() => handleCopyJson(idx, saved.portfolio)}
                              title="Copy JSON danh mục hiện tại"
                            >
                              {copiedIdx === idx ? '✓ ĐÃ COPY' : '⧉ COPY JSON'}
                            </button>
                            <button
                              className="px-3 py-2 bg-violet-500/10 border border-violet-500 rounded-lg text-violet-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-violet-500 hover:text-white whitespace-nowrap"
                              onClick={() => handleRebalance(idx, saved.portfolio)}
                              title="Rebalance random rồi normalize; tự tăng biên độ để khoảng cách tới danh mục khác ≥ ngưỡng dedupe"
                            >
                              ⟳ REBALANCE
                            </button>
                            <button
                              className="px-3 py-2 bg-transparent border border-slate-600 rounded-lg text-slate-300 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:border-violet-400 hover:text-violet-400 whitespace-nowrap"
                              onClick={() => startEditWeights(idx, entries)}
                              title={
                                'Sửa tỷ trọng / bỏ subnet — chọn subnet nhận lại phần tỷ trọng đã bỏ (mặc định chia đều cho tất cả subnet còn lại).\n' +
                                'Thêm subnet mới từ danh sách tăng trưởng cao nhất — tỷ trọng trích từ 10% của mỗi subnet trong top 10 lớn nhất.'
                              }
                            >
                              ✎ SỬA / THÊM SUBNET
                            </button>
                            <button
                              className="px-3 py-2 bg-transparent border border-slate-600 rounded-lg text-slate-300 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:border-violet-400 hover:text-violet-400 whitespace-nowrap"
                              onClick={() => startEditJson(idx, saved.portfolio)}
                              title="Sửa trực tiếp JSON danh mục"
                            >
                              ⟨⟩ SỬA JSON
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {rebalanceMsgs[idx] && (
                      <div className={`text-xs font-bold px-3 py-2 rounded-lg border ${
                        rebalanceMsgs[idx].ok
                          ? 'text-emerald-400 border-emerald-400 bg-emerald-400/10'
                          : 'text-red-400 border-red-400 bg-red-400/10'
                      }`}>
                        {rebalanceMsgs[idx].text}
                      </div>
                    )}
                    {isEditingJson ? (
                      <textarea
                        autoFocus
                        spellCheck={false}
                        value={jsonDraft}
                        onChange={(e) => setJsonDraft(e.target.value)}
                        className="w-full min-h-[240px] bg-slate-950 border border-violet-500 rounded-lg font-mono text-xs text-emerald-400 leading-relaxed p-3 outline-none resize-y whitespace-pre"
                      />
                    ) : (
                      <pre className="font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre">
                        {relaxedJson(saved.portfolio)}
                      </pre>
                    )}
                  </div>
                </div>
              );
              })()}
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}
