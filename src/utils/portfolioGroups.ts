import type { GroupKey, MetricKey, SavedPortfolioRecord, Selection, SelectionGroup, SubnetRow } from '@/types';
import { CHANGE_OPTIONS, OTHER_GROUP_KEY, OTHER_GROUP_LABEL } from '@/constants/portfolio';
import { STOCK_CHANGE_OPTIONS } from '@/constants/assets';
import { compareByMetricDesc, getMetricValue, getSubnetPool } from './subnetData';

/**
 * Chọn subnet theo nhiều tiêu chí và quản lý "nhóm generate" (membership của
 * từng nhóm) — để UI có thể xoá / thêm subnet theo cả cụm.
 */

/** Chuẩn hoá danh sách chỉ số của một Selection / SelectionGroup (hỗ trợ bản ghi cũ). */
export function selectionKeys(selection: Pick<Selection, 'changeKey' | 'changeKeys'> | null | undefined): GroupKey[] {
  if (!selection) return [];
  if (Array.isArray(selection.changeKeys) && selection.changeKeys.length) {
    return selection.changeKeys.map(String);
  }
  if (selection.changeKey != null && selection.changeKey !== '') {
    return [String(selection.changeKey)];
  }
  return [];
}

/** Khoá chính của nhóm (phần tử đầu) — dùng làm identity / React key. */
export function primaryChangeKey(selection: Pick<Selection, 'changeKey' | 'changeKeys'> | null | undefined): GroupKey {
  return selectionKeys(selection)[0] || OTHER_GROUP_KEY;
}

/** Label một chỉ số; fallback về chính key nếu không tìm thấy. */
export function metricLabel(changeKey: string): string {
  if (changeKey === OTHER_GROUP_KEY) return OTHER_GROUP_LABEL;
  return (
    CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label ||
    STOCK_CHANGE_OPTIONS.find((o) => o.value === changeKey)?.label ||
    changeKey
  );
}

/** Label gộp nhiều chỉ số: "A + B + C". */
export function metricsLabel(keys: readonly string[]): string {
  if (!keys.length) return 'Nhóm';
  return keys.map(metricLabel).join(' + ');
}

/** Label hiển thị cho một nhóm generate. */
export function groupLabel(selectionOrKey: GroupKey | Pick<Selection, 'changeKey' | 'changeKeys'>, fallback?: string): string {
  if (fallback) return fallback;
  if (typeof selectionOrKey === 'string') {
    if (selectionOrKey === OTHER_GROUP_KEY) return OTHER_GROUP_LABEL;
    return metricLabel(selectionOrKey);
  }
  const keys = selectionKeys(selectionOrKey);
  if (keys.length === 1 && keys[0] === OTHER_GROUP_KEY) return OTHER_GROUP_LABEL;
  return metricsLabel(keys);
}

export interface MixedSelectionResult {
  subnets: SubnetRow[];
  groups: SelectionGroup[];
}

/**
 * Lấy tối đa `n` subnet từ nhiều chỉ số (round-robin theo thứ tự keys),
 * bỏ qua id đã có trong `chosenIds` (được cập nhật tại chỗ).
 */
function pickRoundRobin(
  pool: SubnetRow[],
  keys: GroupKey[],
  n: number,
  chosenIds: Set<string>
): { rows: SubnetRow[]; netuids: string[] } {
  const count = Math.max(0, Math.floor(n));
  if (!count || !keys.length) return { rows: [], netuids: [] };

  const lists = keys.map((key) => [...pool].sort(compareByMetricDesc(String(key))));
  const cursors = keys.map(() => 0);
  const rows: SubnetRow[] = [];
  const netuids: string[] = [];

  while (rows.length < count) {
    let progress = false;
    for (let i = 0; i < keys.length; i++) {
      if (rows.length >= count) break;
      const key = String(keys[i]);
      const list = lists[i];
      while (cursors[i] < list.length) {
        const s = list[cursors[i]++];
        const id = String(s.netuid);
        if (chosenIds.has(id)) continue;
        if (isNaN(getMetricValue(s, key))) continue;
        chosenIds.add(id);
        rows.push(s);
        netuids.push(id);
        progress = true;
        break;
      }
    }
    if (!progress) break;
  }
  return { rows, netuids };
}

/**
 * Chọn subnet theo NHIỀU nhóm điều kiện rồi gộp lại, đảm bảo không trùng subnet.
 * Mỗi selection có thể có nhiều changeKeys: lấy đúng `n` subnet (round-robin giữa
 * các chỉ số), bỏ qua subnet đã chọn ở nhóm trước.
 * Luôn loại subnet 0.
 */
export function getMixedSubnetsGrouped(data: SubnetRow[], selections: Selection[] | null | undefined): MixedSelectionResult {
  const pool = getSubnetPool(data);
  const chosen: SubnetRow[] = [];
  const chosenIds = new Set<string>();
  const groups: SelectionGroup[] = [];

  for (const selection of selections || []) {
    const keys = selectionKeys(selection);
    const count = Math.max(0, Math.floor(selection.n));
    const { rows, netuids } = pickRoundRobin(pool, keys, count, chosenIds);
    chosen.push(...rows);
    const primary = keys[0] || OTHER_GROUP_KEY;
    groups.push({
      changeKey: primary,
      changeKeys: keys.length ? keys : undefined,
      n: count,
      netuids,
      label: metricsLabel(keys),
    });
  }
  return { subnets: chosen, groups };
}

/** Giữ API cũ: chỉ trả mảng subnet đã gộp (thứ tự theo lượt chọn). */
export function getMixedSubnets(data: SubnetRow[], selections: Selection[]): SubnetRow[] {
  return getMixedSubnetsGrouped(data, selections).subnets;
}

/** Nhóm "other" chứa các netuid không thuộc nhóm nào. */
function otherGroup(netuids: string[]): SelectionGroup {
  return {
    changeKey: OTHER_GROUP_KEY,
    changeKeys: [OTHER_GROUP_KEY],
    n: netuids.length,
    netuids,
    label: OTHER_GROUP_LABEL,
  };
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

  if (Array.isArray(saved?.groups) && saved.groups.length) {
    const seen = new Set<string>();
    const groups: SelectionGroup[] = saved.groups.map((g) => {
      const keys = selectionKeys(g);
      const netuids = (g.netuids || [])
        .map(String)
        .filter((id) => inPortfolio.has(id) && !seen.has(id));
      netuids.forEach((id) => seen.add(id));
      return {
        changeKey: keys[0] || g.changeKey || OTHER_GROUP_KEY,
        changeKeys: keys.length ? keys : undefined,
        n: g.n ?? netuids.length,
        netuids,
        label: g.label || metricsLabel(keys),
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
      const keys = selectionKeys(g);
      return {
        ...g,
        changeKey: keys[0] || g.changeKey,
        changeKeys: keys.length ? keys : undefined,
        netuids,
        n: netuids.length,
        label: g.label || metricsLabel(keys),
      };
    });
    const orphan = [...inPortfolio].filter((id) => !seen.has(id));
    if (orphan.length) groups.push(otherGroup(orphan));
    return groups.filter((g) => g.netuids.length > 0);
  }

  return [otherGroup([...inPortfolio])];
}

/** Sao chép một nhóm với label đã phân giải — dùng khi đưa nhóm vào state nháp. */
export function cloneGroupWithLabel(group: SelectionGroup): SelectionGroup {
  const keys = selectionKeys(group);
  return {
    changeKey: keys[0] || group.changeKey,
    changeKeys: keys.length ? keys : undefined,
    n: group.n,
    netuids: [...group.netuids],
    label: groupLabel(group, group.label),
  };
}

/** Hai nhóm trùng bộ chỉ số (cùng phần tử, cùng thứ tự). */
export function sameMetricSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((k, i) => k === b[i]);
}

/** Điểm xếp hạng khi chọn nhiều chỉ số: lấy max các giá trị hợp lệ. */
export function bestMetricValue(row: SubnetRow, keys: readonly string[]): number {
  let best = NaN;
  for (const key of keys) {
    const v = getMetricValue(row, key);
    if (isNaN(v)) continue;
    if (isNaN(best) || v > best) best = v;
  }
  return best;
}

/** Ép mảng MetricKey không rỗng (fallback nếu user bỏ hết). */
export function ensureMetricKeys(keys: MetricKey[], fallback: MetricKey): MetricKey[] {
  return keys.length ? keys : [fallback];
}
