/**
 * Danh sách netuid bị loại bỏ ngay sau khi submit data.
 * Cập nhật tại đây khi cần thay đổi — hàm lọc nằm ở utils/subnetData.ts.
 */
export const EXCLUDED_SUBNET_IDS: readonly number[] = [];

export const EXCLUDED_SUBNET_SET: ReadonlySet<number> = new Set(EXCLUDED_SUBNET_IDS);
