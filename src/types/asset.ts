import type { MetricKey, MetricOption } from './subnet';

/**
 * Hai mục đầu tư của Subnet 88: Tao/Alpha (asset class 0) và cổ phiếu Mỹ
 * (asset class 1). Mỗi mục có bảng dữ liệu, tiêu chí và luật hợp lệ riêng.
 */
export type AssetKey = 'alpha' | 'stock';

/** Nhãn hiển thị của một phân loại (tier) trong danh mục đã lưu. */
export interface TierConfig {
  label: string;
  /** Ký hiệu ngắn hiển thị trên badge. */
  chip: string;
  hint: string;
  /** Lớp Tailwind cho chữ. */
  text: string;
  /** Lớp Tailwind cho khung badge (viền + nền + chữ). */
  box: string;
}

/** Nhóm tiêu chí mặc định ở tab Portfolio gen. */
export interface DefaultGroup {
  count: string;
  keys: MetricKey[];
}

/**
 * Cấu hình một mục đầu tư — mọi chỗ khác nhau giữa alpha và cổ phiếu Mỹ đều
 * đọc từ đây, để các component / hook dùng chung một đường code.
 */
export interface AssetProfile {
  key: AssetKey;
  /** Giá trị key `_` của danh mục. */
  assetClass: number;
  /** Tên mục đầu tư (vd "Alpha", "Cổ phiếu Mỹ"). */
  label: string;
  /** Đơn vị đếm (vd "subnet", "mã"). */
  unit: string;
  /** Tên trường định danh hiển thị / dùng trong tool (netuid | ticker). */
  idField: 'netuid' | 'ticker';
  /** Tiền tố hiển thị trước định danh (vd "#" cho netuid). */
  idPrefix: string;
  /** Tên bộ luật hợp lệ (vd "Tao/Alpha"). */
  ruleLabel: string;
  metricOptions: readonly MetricOption[];
  metricKeys: readonly MetricKey[];
  /** Tiêu chí mặc định khi xếp hạng ứng viên thêm vào danh mục đã lưu. */
  defaultMetric: MetricKey;
  /** Danh mục generate phân bổ giảm dần theo field này. */
  weightField: MetricKey;
  /** Tên field ở trên (vd "thanh khoản", "vốn hoá"). */
  weightLabel: string;
  /** Trần tỷ trọng mỗi phần tử khi generate. */
  maxWeight: number;
  defaultGroups: readonly DefaultGroup[];
  /** Cột mặc định để sắp xếp bảng dữ liệu (giảm dần). */
  defaultSortKey: string;
  /** Nhãn hiển thị của một số cột trong bảng dữ liệu. */
  columnLabels: Readonly<Record<string, string>>;
  /** Hai field dùng để phân loại tier: primary (⚡) và secondary (💧). */
  tierFields: { primary: MetricKey; secondary: MetricKey };
  /** Tên hai field phân loại (vd "emission", "thanh khoản"). */
  tierNames: { primary: string; secondary: string };
  tiers: Readonly<Record<'both' | 'emission' | 'liquidity' | 'none', TierConfig>>;
  /** Số chữ số thập phân khi hiển thị giá. */
  priceDigits: number;
}
