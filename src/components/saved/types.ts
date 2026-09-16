import type { GroupKey, SubnetRow } from '@/types';

/** Một dòng trong bảng chi tiết danh mục đã lưu. */
export interface DetailRow {
  netuid: string;
  /** Tỷ trọng dạng phân số (0..1). */
  weight: number;
  savedPrice: number | undefined;
  currentSubnet: SubnetRow | undefined;
  currentPrice: number | null;
  /** % biến động giá so với lúc lưu; null nếu thiếu một trong hai giá. */
  priceChange: number | null;
}

/** Một section (nhóm generate) trong bảng chi tiết. */
export interface DetailSection {
  changeKey: GroupKey;
  label: string;
  netuids: string[];
  rows: DetailRow[];
}
