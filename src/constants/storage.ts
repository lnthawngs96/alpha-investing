/**
 * Khoá lưu trữ trong localStorage / sessionStorage.
 * Đổi khoá ở đây sẽ làm dữ liệu cũ "biến mất" — chỉ đổi khi có migration.
 */

/** Danh sách danh mục đã lưu. */
export const STORAGE_KEY = 'subnet_saved_portfolios';

/** Lịch sử bản chụp của danh sách trên (để hoàn tác khi xoá nhầm). */
export const HISTORY_KEY = 'subnet_saved_portfolios_history';
/** Số bản chụp giữ lại. */
export const HISTORY_LIMIT = 20;

/** Tuỳ chọn theme (mode + accent). Phải khớp với script inline trong index.html. */
export const THEME_STORAGE_KEY = 'subnet_explorer_theme';
