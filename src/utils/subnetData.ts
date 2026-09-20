import type { SubnetRow } from '@/types';
import {
  FEAR_AND_GREED_FIELD,
  FEAR_GREED_FEAR_MAX,
  FEAR_GREED_NEUTRAL_MAX,
  FEAR_GREED_NEUTRAL_MIN,
} from '@/constants/portfolio';
import { EXCLUDED_SUBNET_SET } from '@/constants/excludedSubnets';
import { isPrimitive } from './format';
import { numberOrNegInfinity, toNumber } from './numeric';

/**
 * Tiện ích thao tác trên bảng dữ liệu subnet: lọc, xếp hạng, dựng cột.
 */

/** Loại bỏ các subnet trong danh sách loại trừ (constants/excludedSubnets). */
export function filterExcludedSubnets(data: SubnetRow[]): SubnetRow[] {
  return data.filter((row) => !EXCLUDED_SUBNET_SET.has(Number(row.netuid)));
}

/** Subnet 0 (root) không bao giờ được đưa vào danh mục. */
export function isRootSubnet(row: SubnetRow): boolean {
  return Number(row.netuid) === 0;
}

/** Bảng dữ liệu đã bỏ subnet 0 — pool để chọn subnet vào danh mục. */
export function getSubnetPool(data: SubnetRow[]): SubnetRow[] {
  return data.filter((r) => !isRootSubnet(r));
}

/**
 * Đọc giá trị tiêu chí xếp hạng từ một dòng subnet.
 * Fear / Neutral không phải cột thô — lấy từ `fear_and_greed_index` nếu khớp vùng
 * (số 0–100) hoặc nhãn chuỗi chứa "fear" / "neutral".
 */
export function getMetricValue(row: SubnetRow, key: string): number {
  if (key === 'fear_and_greed_fear') {
    return fearGreedBandValue(row, 'fear');
  }
  if (key === 'fear_and_greed_neutral') {
    return fearGreedBandValue(row, 'neutral');
  }
  return toNumber(row[key]);
}

/** Giá trị fear_and_greed_index nếu nằm trong band; NaN nếu không khớp / thiếu. */
function fearGreedBandValue(row: SubnetRow, band: 'fear' | 'neutral'): number {
  const raw = row[FEAR_AND_GREED_FIELD];
  if (typeof raw === 'string' && raw.trim() !== '' && isNaN(Number(raw))) {
    const s = raw.toLowerCase();
    if (band === 'fear') {
      // "Fear" / "Extreme Fear" — không lấy nhãn Greed.
      if (/\bfear\b/.test(s) && !/\bgreed\b/.test(s)) return 1;
      return NaN;
    }
    if (/\bneutral\b/.test(s)) return 1;
    return NaN;
  }
  const v = toNumber(raw);
  if (isNaN(v)) return NaN;
  if (band === 'fear') return v >= 0 && v <= FEAR_GREED_FEAR_MAX ? v : NaN;
  return v >= FEAR_GREED_NEUTRAL_MIN && v <= FEAR_GREED_NEUTRAL_MAX ? v : NaN;
}

/**
 * So sánh giảm dần theo một chỉ số; giá trị thiếu / không phải số bị đẩy xuống cuối.
 * Dùng chung cho mọi chỗ sắp xếp subnet theo tiêu chí.
 */
export function compareByMetricDesc(key: string) {
  return (a: SubnetRow, b: SubnetRow): number =>
    numberOrNegInfinity(getMetricValue(b, key)) - numberOrNegInfinity(getMetricValue(a, key));
}

/** Danh sách cột hiển thị: mọi key xuất hiện trong data có ít nhất một giá trị nguyên thuỷ. */
export function buildColumns(data: SubnetRow[]): string[] {
  const allKeys = [...new Set(data.flatMap((r) => Object.keys(r)))];
  return allKeys.filter((k) => data.some((r) => isPrimitive(r[k])));
}

/** Lọc subnet có giá trị `filterKey` trong [min, max], sắp xếp giảm dần. */
export function getFilteredSubnets(
  data: SubnetRow[],
  filterKey = 'price_change_1_day',
  min = -Infinity,
  max = Infinity
): SubnetRow[] {
  return data
    .filter((r) => {
      const v = getMetricValue(r, filterKey);
      return !isNaN(v) && v >= min && v <= max;
    })
    .sort((a, b) => getMetricValue(b, filterKey) - getMetricValue(a, filterKey));
}

/**
 * Sort tất cả subnet (exclude subnet 0) theo changeKey giảm dần, lấy top N.
 * Subnet tăng nhiều nhất ở đầu; nếu không đủ subnet tăng thì lấy tiếp subnet giảm ít nhất.
 * Subnet không có field changeKey bị đẩy xuống cuối.
 */
export function getTopNByChange(data: SubnetRow[], n: number, changeKey: string): SubnetRow[] {
  const pool = getSubnetPool(data);
  const count = Math.min(Math.max(1, Math.floor(n)), pool.length);
  return [...pool].sort(compareByMetricDesc(changeKey)).slice(0, count);
}

/**
 * Xếp hạng subnet theo một field giảm dần (bỏ subnet 0 và giá trị không phải số).
 * Trả về Map: netuid (string) → thứ hạng bắt đầu từ 1 (1 = cao nhất).
 * Dùng để biết một subnet trong danh mục có nằm trong top emission / top thanh khoản
 * của data table hiện tại hay không.
 */
export function buildRankIndex(data: SubnetRow[] | null | undefined, field: string): Map<string, number> {
  const index = new Map<string, number>();
  (data || [])
    .filter((r) => !isRootSubnet(r) && !isNaN(getMetricValue(r, field)))
    .sort((a, b) => getMetricValue(b, field) - getMetricValue(a, field))
    .forEach((r, i) => index.set(String(r.netuid), i + 1));
  return index;
}

/** Tìm dòng subnet theo netuid (so sánh dạng chuỗi để chấp nhận cả số lẫn chuỗi). */
export function findSubnet(data: SubnetRow[], netuid: string | number): SubnetRow | undefined {
  const id = String(netuid);
  return data.find((r) => String(r.netuid) === id);
}

/** Map netuid → tên hiển thị của toàn bộ data table ('Unknown' nếu thiếu). */
export function buildNameMap(data: SubnetRow[] | null | undefined): Record<string, string> {
  return Object.fromEntries((data || []).map((r) => [String(r.netuid), r.name || 'Unknown']));
}

/**
 * Chuẩn hoá JSON người dùng dán vào thành mảng subnet.
 * Chấp nhận: mảng object, một object đơn, hoặc object bọc mảng (vd { data: [...] }).
 * Ném lỗi nếu không suy ra được mảng object.
 */
export function parseSubnetInput(raw: string): SubnetRow[] {
  let parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
    const record = parsed as Record<string, unknown>;
    const arrKey = Object.keys(record).find((k) => {
      const v = record[k];
      return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object';
    });
    if (arrKey) parsed = record[arrKey];
    else parsed = [parsed];
  }
  if (!Array.isArray(parsed)) parsed = [parsed];
  const list = parsed as unknown[];
  if (!list.length || typeof list[0] !== 'object') throw new Error('Cần array of objects');
  return list as SubnetRow[];
}
