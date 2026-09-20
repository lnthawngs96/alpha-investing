import type { SavedPortfolioRecord, SubnetRow } from '@/types';
import { OTHER_GROUP_KEY, OTHER_GROUP_LABEL } from '@/constants/portfolio';
import type { SavedPortfolioEditor } from '@/hooks/useSavedPortfolioEditor';
import type { SubnetTiers } from '@/hooks/useSubnetTiers';
import { groupLabel, primaryChangeKey, resolvePortfolioGroups } from '@/utils/portfolioGroups';
import { findSubnet } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';
import { TierSummaryPanel } from './TierSummaryPanel';
import { RemovedSubnetsPanel } from './RemovedSubnetsPanel';
import { AddSubnetsPanel } from './AddSubnetsPanel';
import { PortfolioDetailTable } from './PortfolioDetailTable';
import { PortfolioJsonPanel } from './PortfolioJsonPanel';
import type { DetailRow, DetailSection } from './types';

export interface SavedPortfolioDetailProps {
  idx: number;
  saved: SavedPortfolioRecord;
  /** Các cặp [netuid, tỷ trọng] đã lưu, sắp xếp giảm dần. */
  entries: Array<[string, number]>;
  currentData: SubnetRow[];
  tiers: SubnetTiers;
  editor: SavedPortfolioEditor;
}

/**
 * Phần mở rộng của một danh mục đã lưu: cột trái là bảng chi tiết (kèm các
 * bảng phụ khi đang sửa), cột phải là JSON + hành động.
 * Mọi số liệu hiển thị được suy ra ở đây từ bản nháp (khi sửa) hoặc bản đã lưu.
 */
export function SavedPortfolioDetail({ idx, saved, entries, currentData, tiers, editor }: SavedPortfolioDetailProps) {
  const isEditingWeights = editor.editingWeightsIdx === idx;
  const isEditingJson = editor.editingJsonIdx === idx;

  // Khi đang sửa, bảng chạy theo bản nháp (đã trừ subnet bị xoá); ngược lại theo danh mục đã lưu.
  // Luôn sort tỷ trọng giảm dần — đồng bộ với JSON bên phải.
  const displayEntries: Array<[string, number]> = (
    isEditingWeights
      ? Object.entries(editor.weightDrafts).map(([k, v]): [string, number] => {
          const p = parseFloat(v);
          return [k, isNaN(p) ? 0 : p / 100];
        })
      : entries
  ).sort((a, b) => b[1] - a[1]);

  const rowsData: DetailRow[] = displayEntries.map(([netuid, weight]) => {
    const savedPrice = saved.prices?.[netuid];
    const currentSubnet = findSubnet(currentData, netuid);
    const currentPrice = currentSubnet ? toNumber(currentSubnet.price) : null;
    const priceChange = savedPrice && currentPrice ? ((currentPrice - savedPrice) / savedPrice) * 100 : null;
    return { netuid, weight, savedPrice, currentSubnet, currentPrice, priceChange };
  });

  // Lợi nhuận danh mục = trung bình biến động giá theo tỷ trọng, chỉ tính subnet có đủ giá.
  const { totalWeightedChange, totalWeight } = rowsData.reduce(
    (acc, r) => {
      if (r.priceChange != null) {
        acc.totalWeightedChange += r.priceChange * r.weight;
        acc.totalWeight += r.weight;
      }
      return acc;
    },
    { totalWeightedChange: 0, totalWeight: 0 }
  );

  // Chia bảng theo nhóm generate (thanh khoản / tăng trưởng …) để xoá cả cụm.
  // Trong mỗi section vẫn xếp theo tỷ trọng giảm dần (không theo thứ tự netuid / generate).
  const byWeightDesc = (a: DetailRow, b: DetailRow) => b.weight - a.weight;
  const activeGroups = isEditingWeights ? editor.draftGroups : resolvePortfolioGroups(saved, currentData);
  const rowById = new Map(rowsData.map((r) => [r.netuid, r]));
  const placed = new Set<string>();
  const sections: DetailSection[] = activeGroups
    .map((g) => {
      const rows = g.netuids
        .map((id) => rowById.get(String(id)))
        .filter((r): r is DetailRow => Boolean(r))
        .sort(byWeightDesc);
      rows.forEach((r) => placed.add(r.netuid));
      return {
        changeKey: primaryChangeKey(g),
        label: groupLabel(g, g.label),
        netuids: rows.map((r) => r.netuid),
        rows,
      };
    })
    .filter((s) => s.rows.length > 0);
  const leftover = rowsData.filter((r) => !placed.has(r.netuid)).sort(byWeightDesc);
  if (leftover.length) {
    sections.push({
      changeKey: OTHER_GROUP_KEY,
      label: OTHER_GROUP_LABEL,
      netuids: leftover.map((r) => r.netuid),
      rows: leftover,
    });
  }
  // Fallback: không suy ra được nhóm → một section phẳng.
  if (!sections.length && rowsData.length) {
    sections.push({
      changeKey: OTHER_GROUP_KEY,
      label: 'Tất cả subnet',
      netuids: rowsData.map((r) => r.netuid),
      rows: rowsData,
    });
  }

  const portfolioReturn = totalWeight > 0 ? totalWeightedChange / totalWeight : null;
  // Phân loại theo bản nháp đang sửa (nếu có) để thấy ngay tác động của thay đổi.
  const tierStats = tiers.canRank ? tiers.summarize(displayEntries) : null;
  // Tổng % người dùng nhập (trước khi chuẩn hoá về 100%).
  const draftSum = Object.values(editor.weightDrafts).reduce((a, v) => {
    const p = parseFloat(v);
    return a + (isNaN(p) ? 0 : p);
  }, 0);

  // Bản nháp hiện tại (chỉ khi đang sửa tỷ trọng): removal = phân bổ lại phần của
  // subnet vừa bỏ, addition = phần trích từ top N cấp cho các subnet mới thêm.
  const draft = isEditingWeights ? editor.computeDraft() : null;
  const hasRemoved = isEditingWeights && editor.removedIds.length > 0;
  const subnetName = (id: string) => findSubnet(currentData, id)?.name || saved.names?.[id] || 'Unknown';

  return (
    <div className="grid min-h-0 grid-cols-2 border-t border-line animate-fade-in">
      {/* Left: detail table */}
      <div className="show-scrollbar overflow-y-auto border-r border-line p-4">
        {tierStats && (
          <TierSummaryPanel stats={tierStats} topEmissionN={tiers.topEmissionN} topLiquidityN={tiers.topLiquidityN} />
        )}
        {hasRemoved && draft && (
          <RemovedSubnetsPanel
            removedIds={editor.removedIds}
            baseWeights={editor.baseWeights}
            removal={draft.removal}
            receiveMode={editor.receiveMode}
            subnetName={subnetName}
            onRestore={editor.restoreSubnet}
            onChangeReceiveMode={editor.changeReceiveMode}
            onSelectAllReceivers={editor.selectAllReceivers}
            onClearReceivers={editor.clearReceivers}
          />
        )}
        {isEditingWeights && draft && (
          <AddSubnetsPanel
            candidates={editor.candidates}
            candidateLimit={editor.candidateLimit}
            addedIds={editor.addedIds}
            addOverrides={editor.addOverrides}
            addTopN={editor.addTopN}
            addTakePct={editor.addTakePct}
            addSplitMode={editor.addSplitMode}
            addChangeKeys={editor.addChangeKeys}
            addition={draft.addition}
            hasData={currentData.length > 0}
            tiers={tiers}
            onApplyDraft={editor.applyDraft}
            onChangeAddChangeKeys={editor.changeAddChangeKeys}
            onCandidateLimit={editor.setCandidateLimit}
            onPickCandidates={editor.pickCandidates}
            onToggleCandidate={editor.toggleCandidate}
            onClearCandidates={editor.clearCandidates}
          />
        )}
        <PortfolioDetailTable
          saved={saved}
          sections={sections}
          rowCount={rowsData.length}
          isEditingWeights={isEditingWeights}
          draft={draft}
          hasRemoved={hasRemoved}
          addedIds={editor.addedIds}
          addTakePct={editor.addTakePct}
          weightDrafts={editor.weightDrafts}
          draftSum={draftSum}
          portfolioReturn={portfolioReturn}
          tiers={tiers}
          onUpdateWeightDraft={editor.updateWeightDraft}
          onRemoveSubnet={editor.removeSubnetFromDraft}
          onRemoveGroup={editor.removeGroupFromDraft}
          onToggleReceiver={editor.toggleReceiver}
        />
      </div>

      {/* Right: JSON portfolio + rebalance */}
      <PortfolioJsonPanel
        portfolio={saved.portfolio}
        entries={entries}
        isEditingWeights={isEditingWeights}
        isEditingJson={isEditingJson}
        jsonDraft={editor.jsonDraft}
        copied={editor.copiedIdx === idx}
        message={editor.rebalanceMsgs[idx]}
        onJsonDraftChange={editor.setJsonDraft}
        onApplyWeights={() => editor.applyWeightEdits(idx, saved)}
        onCancelWeights={editor.cancelEditWeights}
        onApplyJson={() => editor.applyJsonEdits(idx)}
        onCancelJson={editor.cancelEditJson}
        onCopy={() => editor.handleCopyJson(idx, saved.portfolio)}
        onRebalance={() => editor.handleRebalance(idx, saved.portfolio)}
        onStartEditWeights={() => editor.startEditWeights(idx, entries)}
        onStartEditJson={() => editor.startEditJson(idx, saved.portfolio)}
      />
    </div>
  );
}
