import { useState } from 'react';
import type { MetricKey, Portfolio, SaveResult, SavedPortfolioRecord, Selection, SelectionGroup, SubnetRow } from '@/types';
import { CHANGE_DEFAULT, DD_TRIGGER, LIQUIDITY_FIELD, TOP_N_MAX } from '@/constants/portfolio';
import { DEFAULT_GROUP1_COUNT, DEFAULT_GROUP2_COUNT, TOAST_ERROR_MS, TOAST_SUCCESS_MS } from '@/constants/editor';
import { generateLiquidityWeightedPortfolio } from '@/utils/portfolioMath';
import { getMixedSubnetsGrouped, metricLabel } from '@/utils/portfolioGroups';
import { checkDedupe, portfolioEntries, validateTaoAlphaPortfolio } from '@/utils/portfolioValidation';
import { compareByMetricDesc, findSubnet, getSubnetPool } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';
import { usePortfolioTools } from '@/webmcp/usePortfolioTools';
import { Badge, Button, Card, EmptyState, Eyebrow, Notice } from '@/components/ui';
import { RefreshIcon, TargetIcon } from '@/components/icons';
import { SelectionGroupFields } from './SelectionGroupFields';
import { SubnetChipList } from './SubnetChipList';
import { PortfolioResult } from './PortfolioResult';

export interface PortfolioBuilderProps {
  allData: SubnetRow[];
  savedPortfolios: SavedPortfolioRecord[];
  onSavePortfolio: (record: SavedPortfolioRecord) => void;
}

/**
 * Tab "Portfolio gen": chọn hai nhóm tiêu chí → gộp subnet (loại trùng) → phân
 * bổ giảm dần theo thanh khoản → xem / sửa / lưu. Component này cũng đăng ký
 * bộ tool WebMCP cấp danh mục, nên phải luôn được mount (App ẩn bằng CSS).
 */
export function PortfolioBuilder({ allData, savedPortfolios, onSavePortfolio }: PortfolioBuilderProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [editMode, setEditMode] = useState(false);
  // Nhóm 1 (mặc định: thanh khoản – dùng làm nhóm neo) + Nhóm 2 (mặc định: tăng trưởng ngày)
  const [inputN, setInputN] = useState(DEFAULT_GROUP1_COUNT);
  const [changeKey, setChangeKey] = useState<MetricKey>(LIQUIDITY_FIELD);
  const [inputN2, setInputN2] = useState(DEFAULT_GROUP2_COUNT);
  const [changeKey2, setChangeKey2] = useState<MetricKey>(CHANGE_DEFAULT);
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

  /**
   * Tách phần dựng danh mục khỏi phần đọc state của form, để cả nút bấm lẫn
   * tool WebMCP dùng chung một đường. Trả về danh mục vừa dựng cho phía gọi.
   */
  function generateWith(selections: Selection[]): Portfolio | null {
    // Gộp subnet từ 2 điều kiện (đã loại trùng), rồi sắp xếp theo thanh khoản giảm dần
    // để danh mục cuối vẫn ưu tiên trọng số cho subnet thanh khoản cao.
    const { subnets: combined, groups } = getMixedSubnetsGrouped(allData, selections);
    const byLiquidity = [...combined].sort(compareByMetricDesc(LIQUIDITY_FIELD));
    const next = generateLiquidityWeightedPortfolio(byLiquidity);
    setTopSubnets(byLiquidity);
    setSelectionGroups(
      groups.map((g) => ({
        changeKey: g.changeKey,
        n: g.n,
        netuids: [...g.netuids],
        label: metricLabel(g.changeKey),
      }))
    );
    setEditMode(false);
    setPortfolio(next);
    return next;
  }

  function handleGenerate(): Portfolio | null {
    return generateWith([
      { changeKey, n: parseCount(inputN) },
      { changeKey: changeKey2, n: parseCount(inputN2) },
    ]);
  }

  /**
   * Agent dựng danh mục: đồng bộ luôn hai ô input để người dùng nhìn thấy đúng
   * tiêu chí mà agent đã chọn, chứ không chỉ thấy kết quả rơi từ trên trời.
   */
  function generateFromAgent(selections: [Selection, Selection]): Portfolio | null {
    const [g1, g2] = selections;
    const n1 = parseCount(String(g1.n));
    const n2 = parseCount(String(g2.n));
    setChangeKey(g1.changeKey as MetricKey);
    setInputN(String(n1));
    setChangeKey2(g2.changeKey as MetricKey);
    setInputN2(String(n2));
    return generateWith([
      { changeKey: g1.changeKey, n: n1 },
      { changeKey: g2.changeKey, n: n2 },
    ]);
  }

  function handleToggleEdit() {
    setEditMode(!editMode);
  }

  function handleApplyEdit(newPortfolio: Portfolio) {
    setPortfolio(newPortfolio);
    setEditMode(false);
  }

  /**
   * Lưu danh mục, trả về { ok, message } thay vì tự set thông báo — nhờ vậy tool
   * WebMCP nhận được đúng lý do bị từ chối và có thể tự xử lý (ví dụ gặp trùng
   * lặp thì gọi escape_dedupe rồi lưu lại), còn nút bấm chỉ việc hiển thị.
   */
  function saveWithName(name?: string): SaveResult {
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

    // Ghi kèm giá + tên lúc lưu để sau này tính biến động và hiển thị tên khi thiếu data.
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

    const record: SavedPortfolioRecord = {
      savedAt: new Date().toISOString(),
      selections: [
        { changeKey, n: parseCount(inputN) },
        { changeKey: changeKey2, n: parseCount(inputN2) },
      ],
      // Membership từng nhóm generate — dùng để chia section + xoá cả cụm khi rebalance ngày.
      groups: selectionGroups.length
        ? selectionGroups
        : [
            { changeKey, n: parseCount(inputN), netuids: [], label: metricLabel(changeKey) },
            { changeKey: changeKey2, n: parseCount(inputN2), netuids: [], label: metricLabel(changeKey2) },
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

  const label1 = metricLabel(changeKey);
  const label2 = metricLabel(changeKey2);

  return (
    <div className="min-h-0 flex-1 pt-4">
      <div className="grid h-full grid-cols-[1fr_2fr] gap-5 max-md:grid-cols-1">
        {/* Left panel — cấu hình */}
        <Card className="flex min-h-0 flex-col gap-4 overflow-hidden p-5 animate-slide-up">
          <SelectionGroupFields
            title="Nhóm 1"
            count={inputN}
            onCountChange={(v) => {
              setInputN(v);
              resetResult();
            }}
            onCountBlur={() => setInputN(String(parseCount(inputN)))}
            changeKey={changeKey}
            onChangeKey={(k) => {
              setChangeKey(k);
              resetResult();
            }}
            disabledKey={changeKey2}
          />
          <SelectionGroupFields
            title="Nhóm 2"
            count={inputN2}
            onCountChange={(v) => {
              setInputN2(v);
              resetResult();
            }}
            onCountBlur={() => setInputN2(String(parseCount(inputN2)))}
            changeKey={changeKey2}
            onChangeKey={(k) => {
              setChangeKey2(k);
              resetResult();
            }}
            disabledKey={changeKey}
          />

          <p className="shrink-0 text-[11px] leading-relaxed text-fg-faint">
            Gộp top {parseCount(inputN)} theo {label1} + top {parseCount(inputN2)} theo {label2} (loại subnet trùng —
            lấy tiếp theo trong list — và bỏ subnet 0). Danh mục cuối sắp xếp theo thanh khoản giảm dần.
          </p>

          <div className="flex shrink-0 items-center justify-between">
            <Eyebrow>Danh sách đã chọn</Eyebrow>
            <Badge tone="positive">{topSubnets.length}</Badge>
          </div>
          {selectionGroups.length > 0 ? (
            <div className="show-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              {selectionGroups.map((g) => {
                const ids = new Set(g.netuids.map(String));
                const chips = topSubnets.filter((s) => ids.has(String(s.netuid)));
                return (
                  <div key={g.changeKey} className="flex shrink-0 flex-col gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-fg-faint">
                      {g.label || g.changeKey} · {chips.length}
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
            disabled={poolSize === 0}
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
              title='Chọn 2 điều kiện lọc và click "Generate"'
              description={
                <>
                  Gộp top {parseCount(inputN)} {label1} + top {parseCount(inputN2)} {label2} từ {poolSize} subnet
                </>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
