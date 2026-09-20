import type { MetricKey } from './subnet';

/**
 * Danh mục phân bổ theo định dạng Tao/Alpha của Subnet 88:
 *   { _: 0, "<netuid>": <tỷ trọng>, ... }
 * Key `_` là asset class (luôn 0 với Tao/Alpha). Các key còn lại là netuid
 * dạng chuỗi, giá trị là tỷ trọng phân số (tổng ≤ 1).
 */
export interface Portfolio {
  _: number;
  [netuid: string]: number;
}

/** Map netuid → tỷ trọng THUẦN (không có key `_`). Đơn vị tuỳ ngữ cảnh (phân số hoặc %). */
export type WeightMap = Record<string, number>;

/** Khoá nhóm generate: một chỉ số, hoặc 'other' cho subnet chưa phân nhóm. */
export type GroupKey = MetricKey | 'other' | string;

/**
 * Một nhóm tiêu chí chọn subnet: top `n` theo một hoặc nhiều `changeKeys`.
 * Bản ghi cũ chỉ có `changeKey` — dùng `selectionKeys()` để chuẩn hoá.
 */
export interface Selection {
  /** @deprecated Dùng `changeKeys`; giữ để đọc danh mục đã lưu cũ. */
  changeKey?: GroupKey;
  /** Các chỉ số trong nhóm (ít nhất 1). */
  changeKeys?: GroupKey[];
  n: number;
}

/**
 * Membership của một nhóm generate — lưu cùng danh mục để UI có thể chia
 * section và xoá / thêm subnet theo cả cụm.
 */
export interface SelectionGroup extends Selection {
  netuids: string[];
  label?: string;
}

/** Bản ghi danh mục đã lưu trong localStorage / sessionStorage. */
export interface SavedPortfolioRecord {
  /** Thời điểm lưu (ISO) — đồng thời là khoá gộp và React key. */
  savedAt: string;
  name?: string;
  selections?: Selection[];
  groups?: SelectionGroup[];
  portfolio: Portfolio;
  /** Giá lúc lưu của từng subnet — dùng để tính biến động. */
  prices?: Record<string, number>;
  /** Tên subnet lúc lưu — fallback khi data table hiện tại không có. */
  names?: Record<string, string>;
  /** Trường tuỳ chọn của các bản ghi cũ / nhập từ ngoài. */
  filterKey?: string;
  meta?: unknown;
}

/** Một bản chụp trong lịch sử lưu trữ (dùng để hoàn tác). */
export interface HistorySnapshot {
  id?: string;
  at: string;
  list: SavedPortfolioRecord[];
}

/** Kết quả kiểm tra hợp lệ theo luật Tao/Alpha. */
export interface PortfolioValidation {
  valid: boolean;
  errors: string[];
  total: number;
  cash: number;
}

/** Một cặp danh mục bị coi là trùng lặp. */
export interface DedupeConflict {
  index: number;
  name?: string;
  dist: number;
}

/** Kết quả so trùng lặp một danh mục với danh sách khác. */
export interface DedupeCheck {
  ok: boolean;
  minDist: number | null;
  conflicts: DedupeConflict[];
}

/** Kết quả của thao tác lưu danh mục — nút bấm và tool WebMCP dùng chung. */
export type SaveResult =
  | { ok: true; name: string; total: number }
  | { ok: false; message: string };

/** Thông báo ngắn hiển thị trong UI: thành công hay thất bại kèm nội dung. */
export interface StatusMessage {
  ok: boolean;
  text: string;
}
