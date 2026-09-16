import { useRef, useState, type ChangeEvent } from 'react';
import type { MetricKey, Portfolio, SavedPortfolioRecord, StatusMessage, SubnetRow } from '@/types';
import { CHANGE_DEFAULT, DD_TRIGGER } from '@/constants/portfolio';
import { DEFAULT_TOP_EMISSION, DEFAULT_TOP_LIQUIDITY, TOAST_FILE_MS } from '@/constants/editor';
import type { ImportResult, UpdateSavedExtra } from '@/store/savedPortfolios/context';
import { useSubnetTiers } from '@/hooks/useSubnetTiers';
import { useSavedPortfolioEditor } from '@/hooks/useSavedPortfolioEditor';
import { dedupeDistance } from '@/utils/portfolioValidation';
import { downloadPortfolios, parseImportedPortfolios, readFileAsText } from '@/utils/portfolioFile';
import { formatSavedAt } from '@/utils/format';
import { cn } from '@/utils/classNames';
import { Button, Card, EmptyState, Eyebrow } from '@/components/ui';
import { BookmarkIcon, DownloadIcon, DropletIcon, ScaleIcon, UploadIcon, ZapIcon } from '@/components/icons';
import { DedupeReportPanel, type DedupePair, type DedupeReport } from './DedupeReportPanel';
import { SavedPortfolioCard } from './SavedPortfolioCard';

export interface SavedPortfoliosProps {
  savedList: SavedPortfolioRecord[];
  currentData: SubnetRow[];
  /** Tiêu chí mặc định để xếp hạng ứng viên khi thêm subnet. */
  filterKey?: MetricKey;
  onDelete: (idx: number) => void;
  onUpdate: (idx: number, portfolio: Portfolio, extra?: UpdateSavedExtra | null) => void;
  onRename: (idx: number, name: string) => void;
  onImport: (records: SavedPortfolioRecord[]) => ImportResult;
}

/**
 * Tab "Danh mục đã lưu": toolbar (ngưỡng top, xuất / nhập file, kiểm tra dedupe),
 * các banner trạng thái và danh sách card. Logic chỉnh sửa nằm trong
 * useSavedPortfolioEditor; xếp hạng / phân loại nằm trong useSubnetTiers.
 */
export function SavedPortfolios({
  savedList,
  currentData,
  filterKey = CHANGE_DEFAULT,
  onDelete,
  onUpdate,
  onRename,
  onImport,
}: SavedPortfoliosProps) {
  // Kết quả xuất/nhập file.
  const [fileMsg, setFileMsg] = useState<StatusMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Kết quả kiểm tra dedupe toàn bộ danh mục với nhau (null = chưa chạy).
  const [dedupeReport, setDedupeReport] = useState<DedupeReport | null>(null);
  // Ngưỡng "top" để phân loại subnet trong danh mục theo data table hiện tại.
  const [topEmissionN, setTopEmissionN] = useState(DEFAULT_TOP_EMISSION);
  const [topLiquidityN, setTopLiquidityN] = useState(DEFAULT_TOP_LIQUIDITY);

  const tiers = useSubnetTiers(currentData, topEmissionN, topLiquidityN);
  const editor = useSavedPortfolioEditor({ savedList, currentData, filterKey, onUpdate, onRename });

  /** Tên hiển thị của một danh mục đã lưu (fallback theo thời điểm lưu). */
  function displayName(saved: SavedPortfolioRecord | undefined): string {
    return saved?.name || (saved?.savedAt ? formatSavedAt(saved.savedAt) : 'Danh mục');
  }

  /**
   * Duyệt tất cả cặp danh mục đã lưu (cùng asset class), tính khoảng cách dedupe.
   * Cặp có d < DD_TRIGGER sẽ bị mạng coi là trùng → danh mục nộp sau bị phạt điểm.
   */
  function runDedupeCheck() {
    const pairs: DedupePair[] = [];
    let minPair: DedupePair | null = null;
    for (let i = 0; i < savedList.length; i++) {
      for (let j = i + 1; j < savedList.length; j++) {
        const a = savedList[i].portfolio;
        const b = savedList[j].portfolio;
        if ((a?._ ?? 0) !== (b?._ ?? 0)) continue; // khác asset class → mạng không so
        const dist = +dedupeDistance(a, b).toFixed(6);
        const rec: DedupePair = { i, j, dist, ni: displayName(savedList[i]), nj: displayName(savedList[j]) };
        pairs.push(rec);
        if (!minPair || dist < minPair.dist) minPair = rec;
      }
    }
    const conflicts = pairs.filter((p) => p.dist < DD_TRIGGER).sort((a, b) => a.dist - b.dist);
    setDedupeReport({ count: savedList.length, pairs: pairs.length, minPair, conflicts });
  }

  function showFileMsg(ok: boolean, text: string) {
    setFileMsg({ ok, text });
    setTimeout(() => setFileMsg(null), TOAST_FILE_MS);
  }

  function handleExport() {
    try {
      const name = downloadPortfolios(savedList);
      showFileMsg(true, `✓ Đã xuất ${savedList.length} danh mục → ${name}`);
    } catch {
      showFileMsg(false, '⚠ Không xuất được file');
    }
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset ngay để chọn lại đúng file đó lần nữa vẫn bắn onChange.
    e.target.value = '';
    if (!file) return;

    let text: string;
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
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
      <Button
        size="sm"
        variant="secondary"
        icon={<UploadIcon size={13} />}
        onClick={handleExport}
        disabled={!savedList.length}
        title="Tải toàn bộ danh mục đã lưu về máy dưới dạng file JSON"
      >
        Xuất JSON
      </Button>
      <Button
        size="sm"
        variant="secondary"
        icon={<DownloadIcon size={13} />}
        onClick={() => fileInputRef.current?.click()}
        title="Nhập danh mục từ file JSON đã xuất — gộp vào danh sách hiện tại, không ghi đè"
      >
        Nhập JSON
      </Button>
    </>
  );

  const fileBanner = fileMsg && (
    <div className={cn('shrink-0 px-5 pb-3 text-xs animate-slide-down', fileMsg.ok ? 'text-positive' : 'text-negative')}>
      {fileMsg.text}
    </div>
  );

  if (!savedList.length) {
    return (
      <EmptyState
        className="flex-1"
        icon={<BookmarkIcon size={26} />}
        title="Chưa có danh mục nào được lưu"
        description="Dựng danh mục ở tab Portfolio gen rồi bấm Lưu, hoặc nhập lại từ file JSON đã xuất."
        actions={
          <>
            {fileButtons}
            {fileMsg && (
              <div className={cn('basis-full text-xs', fileMsg.ok ? 'text-positive' : 'text-negative')}>{fileMsg.text}</div>
            )}
          </>
        }
      />
    );
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col animate-fade-in">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
        <Eyebrow>Danh mục đã lưu ({savedList.length})</Eyebrow>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-lg border border-line bg-surface-raised/60 px-3 py-1.5 text-xs text-fg-muted"
            title="Ngưỡng xếp hạng lấy từ DATA TABLE đang nạp: subnet nằm trong top N emission / top N thanh khoản mới được coi là 'top'"
          >
            <span className="font-bold tracking-wider">TOP</span>
            <label className="flex cursor-pointer items-center gap-1" title="Top N theo emission">
              <ZapIcon size={13} className="text-warning" animated />
              <input
                type="number"
                min="1"
                value={topEmissionN}
                onChange={(e) => setTopEmissionN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="field w-14 px-1.5 py-1 text-right font-mono focus:border-warning"
              />
            </label>
            <label className="flex cursor-pointer items-center gap-1" title="Top N theo thanh khoản">
              <DropletIcon size={13} className="text-info" animated />
              <input
                type="number"
                min="1"
                value={topLiquidityN}
                onChange={(e) => setTopLiquidityN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="field w-14 px-1.5 py-1 text-right font-mono focus:border-info"
              />
            </label>
          </div>
          {fileButtons}
          <Button
            size="sm"
            variant="accent"
            icon={<ScaleIcon size={13} />}
            onClick={runDedupeCheck}
            disabled={savedList.length < 2}
            title="So khoảng cách dedupe của tất cả danh mục đã lưu với nhau (ngưỡng 0.01)"
          >
            Kiểm tra dedupe
          </Button>
        </div>
      </div>
      {fileBanner}
      {!tiers.canRank && (
        <div className="shrink-0 px-5 pb-3 text-xs text-warning">
          ⚠ Chưa nạp DATA TABLE → không phân loại được top emission / top thanh khoản. Paste data ở ô DATA INPUT để
          bật phân loại.
        </div>
      )}
      {dedupeReport && <DedupeReportPanel report={dedupeReport} onClose={() => setDedupeReport(null)} />}

      {/* Danh sách */}
      <div className="relative min-h-0 flex-1">
        <div className="show-scrollbar absolute inset-0 overflow-y-auto px-5 pb-5">
          <div className="flex flex-col gap-3">
            {savedList.map((saved, idx) => (
              <SavedPortfolioCard
                key={saved.savedAt}
                idx={idx}
                order={idx}
                saved={saved}
                currentData={currentData}
                tiers={tiers}
                editor={editor}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
