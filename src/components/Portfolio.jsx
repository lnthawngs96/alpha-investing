import { useState, useEffect } from 'react';
import { generateLiquidityWeightedPortfolio, getMixedSubnetsGrouped } from '../utils/helpers';
import {
  TOP_N_MAX,
  CHANGE_OPTIONS, CHANGE_DEFAULT,
  LIQUIDITY_FIELD,
  validateTaoAlphaPortfolio,
  checkDedupe,
  DD_TRIGGER,
} from '../utils/portfolio';
import { usePortfolioTools } from '../webmcp/usePortfolioTools';
import ChipList from './ChipList';
import PortfolioResult from './PortfolioResult';

export default function Portfolio({ allData, savedPortfolios, onSavePortfolio }) {
  const [portfolio, setPortfolio] = useState(null);
  const [editMode, setEditMode] = useState(false);
  // Nhóm 1 (mặc định: thanh khoản – dùng làm nhóm neo) + Nhóm 2 (mặc định: tăng trưởng ngày)
  const [inputN, setInputN] = useState('30');
  const [changeKey, setChangeKey] = useState(LIQUIDITY_FIELD);
  const [inputN2, setInputN2] = useState('10');
  const [changeKey2, setChangeKey2] = useState(CHANGE_DEFAULT);
  const [topSubnets, setTopSubnets] = useState([]);
  // Membership theo từng nhóm generate — lưu cùng danh mục để UI xoá cả cụm.
  const [selectionGroups, setSelectionGroups] = useState([]);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    setTopSubnets([]);
    setSelectionGroups([]);
    setPortfolio(null);
    setEditMode(false);
  }, [allData]);

  const poolSize = allData.filter((r) => Number(r.netuid) !== 0).length;

  function parseCount(str) {
    const v = parseInt(str, 10);
    if (isNaN(v) || v < 1) return 1;
    return Math.min(v, TOP_N_MAX, poolSize || TOP_N_MAX);
  }

  function resetResult() {
    setTopSubnets([]);
    setSelectionGroups([]);
    setPortfolio(null);
  }

  // Tách phần dựng danh mục khỏi phần đọc state của form, để cả nút bấm lẫn
  // tool WebMCP dùng chung một đường. Trả về danh mục vừa dựng cho phía gọi.
  function generateWith(selections) {
    // Gộp subnet từ 2 điều kiện (đã loại trùng), rồi sắp xếp theo thanh khoản giảm dần
    // để danh mục cuối vẫn ưu tiên trọng số cho subnet thanh khoản cao.
    const { subnets: combined, groups } = getMixedSubnetsGrouped(allData, selections);
    const byLiquidity = [...combined].sort((a, b) => {
      const av = parseFloat(a[LIQUIDITY_FIELD]);
      const bv = parseFloat(b[LIQUIDITY_FIELD]);
      return (isNaN(bv) ? -Infinity : bv) - (isNaN(av) ? -Infinity : av);
    });
    const next = generateLiquidityWeightedPortfolio(byLiquidity);
    setTopSubnets(byLiquidity);
    setSelectionGroups(
      groups.map((g) => ({
        changeKey: g.changeKey,
        n: g.n,
        netuids: [...g.netuids],
        label: CHANGE_OPTIONS.find((o) => o.value === g.changeKey)?.label || g.changeKey,
      }))
    );
    setEditMode(false);
    setPortfolio(next);
    return next;
  }

  function handleGenerate() {
    return generateWith([
      { changeKey, n: parseCount(inputN) },
      { changeKey: changeKey2, n: parseCount(inputN2) },
    ]);
  }

  // Agent dựng danh mục: đồng bộ luôn hai ô input để người dùng nhìn thấy đúng
  // tiêu chí mà agent đã chọn, chứ không chỉ thấy kết quả rơi từ trên trời.
  function generateFromAgent(selections) {
    const [g1, g2] = selections;
    const n1 = parseCount(String(g1.n));
    const n2 = parseCount(String(g2.n));
    setChangeKey(g1.changeKey);
    setInputN(String(n1));
    setChangeKey2(g2.changeKey);
    setInputN2(String(n2));
    return generateWith([
      { changeKey: g1.changeKey, n: n1 },
      { changeKey: g2.changeKey, n: n2 },
    ]);
  }

  function handleToggleEdit() {
    setEditMode(!editMode);
  }

  function handleApplyEdit(newPortfolio) {
    setPortfolio(newPortfolio);
    setEditMode(false);
  }

  // Lưu danh mục, trả về { ok, message } thay vì tự set thông báo — nhờ vậy tool
  // WebMCP nhận được đúng lý do bị từ chối và có thể tự xử lý (ví dụ gặp trùng
  // lặp thì gọi escape_dedupe rồi lưu lại), còn nút bấm chỉ việc hiển thị.
  function saveWithName(name) {
    if (!portfolio) return { ok: false, message: 'Chưa có danh mục để lưu.' };

    const { valid, errors } = validateTaoAlphaPortfolio(portfolio);
    if (!valid) {
      return { ok: false, message: `Danh mục không hợp lệ: ${errors[0]}` };
    }

    // Chặn lưu nếu danh mục mới trùng lặp (sẽ bị dedupe) với một danh mục đã lưu.
    const dup = checkDedupe(portfolio, savedPortfolios);
    if (!dup.ok) {
      const c = dup.conflicts[0];
      return {
        ok: false,
        message: `Trùng lặp với "${c.name || 'danh mục đã lưu'}" (d=${c.dist} < ${DD_TRIGGER}) → sẽ bị dedupe. Chưa lưu.`,
      };
    }

    const entries = Object.entries(portfolio).filter(([k]) => k !== '_');
    const prices = {};
    const names = {};
    entries.forEach(([netuid]) => {
      const subnet = allData.find((r) => String(r.netuid) === netuid);
      if (subnet) {
        const p = parseFloat(subnet.price);
        if (!isNaN(p)) prices[netuid] = p;
        names[netuid] = subnet.name || 'Unknown';
      }
    });

    const g1Label = CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label || changeKey;
    const g2Label = CHANGE_OPTIONS.find((o) => o.value === changeKey2)?.label || changeKey2;

    const record = {
      savedAt: new Date().toISOString(),
      selections: [
        { changeKey, n: parseCount(inputN) },
        { changeKey: changeKey2, n: parseCount(inputN2) },
      ],
      // Membership từng nhóm generate — dùng để chia section + xoá cả cụm khi rebalance ngày.
      groups: selectionGroups.length
        ? selectionGroups
        : [
            { changeKey, n: parseCount(inputN), netuids: [], label: g1Label },
            { changeKey: changeKey2, n: parseCount(inputN2), netuids: [], label: g2Label },
          ],
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
    setTimeout(() => setSaveMsg(''), result.ok ? 2500 : 4000);
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

  const label1 = CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label || changeKey;
  const label2 = CHANGE_OPTIONS.find((o) => o.value === changeKey2)?.label || changeKey2;

  return (
    <div className="flex-1 min-h-0 pt-4">
      <div className="grid grid-cols-[1fr_2fr] gap-6 max-md:grid-cols-1 h-full">
        {/* Left Panel */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col gap-4 min-h-0 overflow-hidden">

          {/* Nhóm 1 */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-xs font-bold tracking-wider text-slate-500">
              NHÓM 1 · SỐ SUBNET + ĐIỀU KIỆN (TỐI ĐA {TOP_N_MAX})
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={TOP_N_MAX}
                value={inputN}
                onChange={(e) => { setInputN(e.target.value); resetResult(); }}
                onBlur={() => setInputN(String(parseCount(inputN)))}
                className="w-24 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs px-3 py-3 outline-none focus:border-violet-500 transition-colors"
              />
              <select
                value={changeKey}
                onChange={(e) => { setChangeKey(e.target.value); resetResult(); }}
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs px-3 py-3 outline-none focus:border-violet-500 transition-colors cursor-pointer"
              >
                {CHANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === changeKey2}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nhóm 2 */}
          <div className="flex flex-col gap-2 shrink-0">
            <div className="text-xs font-bold tracking-wider text-slate-500">
              NHÓM 2 · SỐ SUBNET + ĐIỀU KIỆN (TỐI ĐA {TOP_N_MAX})
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max={TOP_N_MAX}
                value={inputN2}
                onChange={(e) => { setInputN2(e.target.value); resetResult(); }}
                onBlur={() => setInputN2(String(parseCount(inputN2)))}
                className="w-24 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs px-3 py-3 outline-none focus:border-violet-500 transition-colors"
              />
              <select
                value={changeKey2}
                onChange={(e) => { setChangeKey2(e.target.value); resetResult(); }}
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded-lg text-slate-100 font-mono text-xs px-3 py-3 outline-none focus:border-violet-500 transition-colors cursor-pointer"
              >
                {CHANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.value === changeKey}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 shrink-0">
            Gộp top {parseCount(inputN)} theo {label1} + top {parseCount(inputN2)} theo {label2}
            {' '}(loại subnet trùng — lấy tiếp theo trong list — và bỏ subnet 0).
            Danh mục cuối sắp xếp theo thanh khoản giảm dần.
          </div>

          <div className="flex items-center justify-between shrink-0">
            <div className="text-xs font-bold tracking-wider text-slate-400">
              DANH SÁCH ĐÃ CHỌN
            </div>
            <div className="text-xs font-bold text-emerald-400">
              {topSubnets.length}
            </div>
          </div>
          {selectionGroups.length > 0 ? (
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
              {selectionGroups.map((g) => {
                const ids = new Set(g.netuids.map(String));
                const chips = topSubnets.filter((s) => ids.has(String(s.netuid)));
                return (
                  <div key={g.changeKey} className="flex flex-col gap-2 shrink-0">
                    <div className="text-[10px] font-bold tracking-wider text-slate-500">
                      {g.label || g.changeKey} · {chips.length}
                    </div>
                    <ChipList subnets={chips} metricField={LIQUIDITY_FIELD} className="flex flex-col gap-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <ChipList subnets={topSubnets} metricField={LIQUIDITY_FIELD} />
          )}
          <button
            className="px-6 py-3 bg-violet-500 border-none rounded-lg text-white font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-200 mt-auto shrink-0 hover:bg-violet-400 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleGenerate}
            disabled={poolSize === 0}
          >
            ⟳ GENERATE PORTFOLIO
          </button>
        </div>

        {/* Right Panel */}
        <div className="min-w-0 flex flex-col gap-4 min-h-0 overflow-hidden">
          {saveMsg && (
            <div
              className={`rounded-lg px-4 py-2 text-xs font-bold tracking-wider text-center shrink-0 ${
                saveMsg.startsWith('✕')
                  ? 'bg-red-400/10 border border-red-400 text-red-400'
                  : 'bg-emerald-400/10 border border-emerald-400 text-emerald-400'
              }`}
            >
              {saveMsg}
            </div>
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
            <div className="flex flex-col items-center justify-center flex-1 gap-4 bg-slate-900 border border-dashed border-slate-600 rounded-lg text-slate-400 text-xs text-center p-8">
              <div className="text-xs text-slate-600">◎</div>
              <div>
                Chọn 2 điều kiện lọc và click &quot;Generate&quot;
                <br />
                Gộp top {parseCount(inputN)} {label1} + top {parseCount(inputN2)} {label2} từ {poolSize} subnet
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
