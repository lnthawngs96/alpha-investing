/**
 * Kiểu dữ liệu cho một dòng subnet trong bảng dữ liệu.
 *
 * Dữ liệu được người dùng dán vào (hoặc agent nạp qua WebMCP) nên chỉ có
 * `netuid` là bắt buộc; các trường còn lại có thể là số hoặc chuỗi số tuỳ
 * nguồn. Mọi hàm đọc số liệu đều đi qua `parseFloat` để chấp nhận cả hai.
 */
export interface SubnetRow {
  netuid: number | string;
  name?: string;
  price?: number | string;
  emission?: number | string;
  liquidity?: number | string;
  price_change_1_day?: number | string;
  price_change_1_week?: number | string;
  price_change_1_month?: number | string;
  /** Cho phép mọi cột khác trong JSON người dùng dán vào. */
  [column: string]: unknown;
}

/** Các chỉ số có thể dùng làm tiêu chí xếp hạng / lọc subnet. */
export type MetricKey =
  | 'price_change_1_day'
  | 'price_change_1_week'
  | 'price_change_1_month'
  | 'price'
  | 'emission'
  | 'liquidity';

/** Một lựa chọn trong dropdown tiêu chí. */
export interface MetricOption {
  value: MetricKey;
  label: string;
}

/** Hướng sắp xếp của bảng dữ liệu. */
export type SortDirection = 'asc' | 'desc';
