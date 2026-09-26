/**
 * Danh sách netuid loại trừ cố định (luôn bỏ khi submit).
 * Danh sách dereg động (người dùng / agent dán khi submit) được truyền runtime
 * vào filterExcludedSubnets — không ghi vào đây.
 */
export const EXCLUDED_SUBNET_IDS: readonly number[] = [];

export const EXCLUDED_SUBNET_SET: ReadonlySet<number> = new Set(EXCLUDED_SUBNET_IDS);
