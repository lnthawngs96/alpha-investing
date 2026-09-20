/**
 * Giá trị mặc định cho trình chỉnh sửa danh mục đã lưu (tab "Danh mục đã lưu").
 */

/** Ngưỡng mặc định "top" cho hai tiêu chí đánh giá subnet trong danh mục. */
export const DEFAULT_TOP_EMISSION = 50;
export const DEFAULT_TOP_LIQUIDITY = 50;

/**
 * Mặc định khi thêm subnet mới vào danh mục đã lưu: lấy 10% tỷ trọng của mỗi
 * subnet trong top 10 subnet lớn nhất, rồi chia giảm dần cho các subnet mới thêm.
 */
export const DEFAULT_ADD_TOP_N = 10;
export const DEFAULT_ADD_TAKE_PCT = 10;
/** Số ứng viên hiển thị mặc định trong danh sách thêm subnet. */
export const DEFAULT_CANDIDATE_LIMIT = 20;
/** Trần % lấy khỏi mỗi subnet lớn — trên mức này danh mục gốc bị bào quá sâu. */
export const MAX_ADD_TAKE_PCT = 90;

/** Cách chia phần tỷ trọng trích được cho các subnet mới. */
export type SplitMode = 'decreasing' | 'equal';
/** Ai nhận phần tỷ trọng giải phóng khi bỏ subnet: tất cả còn lại hay chỉ subnet được tick. */
export type ReceiveMode = 'all' | 'pick';

/** Số subnet mặc định cho các nhóm generate ở tab tạo danh mục. */
export const DEFAULT_GROUP1_COUNT = '30';
export const DEFAULT_GROUP2_COUNT = '10';
export const DEFAULT_EXTRA_GROUP_COUNT = '10';

/** Số nhóm tiêu chí tối thiểu / tối đa khi generate danh mục. */
export const MIN_SELECTION_GROUPS = 1;
/** Trần = số chỉ số có sẵn (mỗi nhóm cần ≥ 1 chỉ số không trùng nhóm khác). */
export const MAX_SELECTION_GROUPS = 9;

/** Thời gian (ms) hiển thị thông báo tạm thời. */
export const TOAST_SUCCESS_MS = 2500;
export const TOAST_ERROR_MS = 4000;
export const TOAST_FILE_MS = 5000;
export const TOAST_COPY_MS = 2000;
