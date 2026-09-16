import type { TabKey } from '@/types';

/** Ba tab chính của app. Thứ tự ở đây là thứ tự hiển thị trên thanh tab. */
export const TAB_KEYS: readonly TabKey[] = ['table', 'portfolio', 'saved'];

/** Tab mặc định khi mở app / sau khi xoá dữ liệu. */
export const DEFAULT_TAB: TabKey = 'table';
