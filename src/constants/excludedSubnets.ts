/**
 * Danh sách netuid loại trừ cố định (luôn bỏ khỏi bảng Alpha / khi submit).
 * `0` = root subnet — không hiển thị trên bảng và không đưa vào danh mục.
 * Danh sách dereg động được truyền runtime vào filterExcludedSubnets — không ghi vào đây.
 */
export const EXCLUDED_SUBNET_IDS: readonly number[] = [0];

export const EXCLUDED_SUBNET_SET: ReadonlySet<number> = new Set(EXCLUDED_SUBNET_IDS);
