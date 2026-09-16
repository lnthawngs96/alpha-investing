import type { GroupKey, SavedPortfolioRecord, Selection, SelectionGroup, SubnetRow } from '@/types';
import { CHANGE_OPTIONS, OTHER_GROUP_KEY, OTHER_GROUP_LABEL } from '@/constants/portfolio';
import { compareByMetricDesc, getSubnetPool } from './subnetData';

/**
 * Chọn subnet theo nhiều tiêu chí và quản lý "nhóm generate" (membership của
 * từng nhóm) — để UI có thể xoá / thêm subnet theo cả cụm.
 */

/** Label hiển thị cho một nhóm generate (thanh khoản / tăng trưởng 1 ngày / …). */
export function groupLabel(changeKey: GroupKey, fallback?: string): string {
  if (fallback) return fallback;
  if (changeKey === OTHER_GROUP_KEY) return OTHER_GROUP_LABEL;
  return CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label || changeKey || 'Nhóm';
}

/** Label của một chỉ số trong dropdown; fallback về chính key nếu không tìm thấy. */
export function metricLabel(changeKey: string): string {
  return CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label || changeKey;
}

export interface MixedSelectionResult {
  subnets: SubnetRow[];
  groups: SelectionGroup[];
}

/**
 * Chọn subnet theo NHIỀU điều kiện lọc rồi gộp lại, đảm bảo không trùng subnet.
 * selections: [{ changeKey, n }, …] — xử lý tuần tự theo thứ tự truyền vào.
 * Mỗi selection đóng góp đúng n subnet phân biệt: duyệt list đã sort giảm dần theo changeKey,
 * bỏ qua subnet đã được chọn ở selection trước và lấy tiếp subnet kế tiếp cho đủ n
 * (vd top-10 tăng trưởng nếu trùng với top-50 thanh khoản thì lấy subnet tăng trưởng kế tiếp).
 * Luôn loại subnet 0.
 * Trả về { subnets, groups } — groups giữ membership từng nhóm để UI xoá/thêm theo cụm.
 */
export function getMixedSubnetsGrouped(data: SubnetRow[], selections: Selection[] | null | undefined): MixedSelectionResult {
  const pool = getSubnetPool(data);
  const chosen: SubnetRow[] = [];
  const chosenIds = new Set<string>();
  const groups: SelectionGroup[] = [];
  for (const { changeKey, n } of selections || []) {
    const count = Math.max(0, Math.floor(n));
    const netuids: string[] = [];
    if (count) {
      const sorted = [...pool].sort(compareByMetricDesc(changeKey));
      let added = 0;
      for (const s of sorted) {
        if (added >= count) break;
        const id = String(s.netuid);
        if (chosenIds.has(id)) continue;
        chosenIds.add(id);
        chosen.push(s);
        netuids.push(id);
        added++;
      }
    }
    groups.push({ changeKey, n: count, netuids });
  }
  return { subnets: chosen, groups };
}

/** Giữ API cũ: chỉ trả mảng subnet đã gộp (thứ tự theo lượt chọn). */
export function getMixedSubnets(data: SubnetRow[], selections: Selection[]): SubnetRow[] {
  return getMixedSubnetsGrouped(data, selections).subnets;
}

/** Nhóm "other" chứa các netuid không thuộc nhóm nào. */
function otherGroup(netuids: string[]): SelectionGroup {
  return { changeKey: OTHER_GROUP_KEY, n: netuids.length, netuids, label: OTHER_GROUP_LABEL };
}

/**
 * Suy ra membership nhóm cho một danh mục đã lưu.
 * Ưu tiên `saved.groups` (đã persist). Thiếu thì ước lượng lại từ selections + data hiện tại
 * (giao với netuid còn trong portfolio). Subnet không thuộc nhóm nào → "other".
 */
export function resolvePortfolioGroups(
  saved: SavedPortfolioRecord | null | undefined,
  currentData: SubnetRow[] = []
): SelectionGroup[] {
  const inPortfolio = new Set(Object.keys(saved?.portfolio || {}).filter((k) => k !== '_'));
  if (!inPortfolio.size) return [];

  const labelOf = (changeKey: GroupKey): string => {
    if (changeKey === OTHER_GROUP_KEY) return OTHER_GROUP_LABEL;
    return changeKey;
  };

  if (Array.isArray(saved?.groups) && saved.groups.length) {
    const seen = new Set<string>();
    const groups: SelectionGroup[] = saved.groups.map((g) => {
      const netuids = (g.netuids || [])
        .map(String)
        .filter((id) => inPortfolio.has(id) && !seen.has(id));
      netuids.forEach((id) => seen.add(id));
      return {
        changeKey: g.changeKey,
        n: g.n ?? netuids.length,
        netuids,
        label: g.label || labelOf(g.changeKey),
      };
    });
    const orphan = [...inPortfolio].filter((id) => !seen.has(id));
    if (orphan.length) groups.push(otherGroup(orphan));
    return groups.filter((g) => g.netuids.length > 0);
  }

  if (Array.isArray(saved?.selections) && saved.selections.length && currentData?.length) {
    const { groups: rebuilt } = getMixedSubnetsGrouped(currentData, saved.selections);
    const seen = new Set<string>();
    const groups: SelectionGroup[] = rebuilt.map((g) => {
      const netuids = g.netuids.filter((id) => inPortfolio.has(id) && !seen.has(id));
      netuids.forEach((id) => seen.add(id));
      return { ...g, netuids, n: netuids.length, label: labelOf(g.changeKey) };
    });
    const orphan = [...inPortfolio].filter((id) => !seen.has(id));
    if (orphan.length) groups.push(otherGroup(orphan));
    return groups.filter((g) => g.netuids.length > 0);
  }

  return [otherGroup([...inPortfolio])];
}

/** Sao chép một nhóm với label đã phân giải — dùng khi đưa nhóm vào state nháp. */
export function cloneGroupWithLabel(group: SelectionGroup): SelectionGroup {
  return {
    changeKey: group.changeKey,
    n: group.n,
    netuids: [...group.netuids],
    label: groupLabel(group.changeKey, group.label),
  };
}
