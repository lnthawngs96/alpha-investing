/** Danh sách netuid loại bỏ sau khi submit data — cập nhật tại đây khi cần thay đổi */
export const EXCLUDED_SUBNET_IDS = [
  
];

const EXCLUDED_SET = new Set(EXCLUDED_SUBNET_IDS);

export function filterExcludedSubnets(data) {
  return data.filter((row) => !EXCLUDED_SET.has(Number(row.netuid)));
}
