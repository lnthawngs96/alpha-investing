/** Chế độ sáng / tối. `system` theo cài đặt hệ điều hành. */
export type ThemeMode = 'light' | 'dark' | 'midnight' | 'system';

/** Chế độ đã phân giải (không còn `system`). */
export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

/** Bảng màu nhấn người dùng chọn. */
export type AccentKey = 'violet' | 'indigo' | 'sky' | 'emerald' | 'amber' | 'rose';

/** Tuỳ chọn theme được lưu trong localStorage. */
export interface ThemePreference {
  mode: ThemeMode;
  accent: AccentKey;
}

/** Mô tả một chế độ để hiển thị trong bộ chọn. */
export interface ThemeModeOption {
  value: ThemeMode;
  label: string;
  hint: string;
}

/** Mô tả một accent để hiển thị swatch trong bộ chọn. */
export interface AccentOption {
  value: AccentKey;
  label: string;
  /** Màu đại diện cho swatch (không phụ thuộc mode). */
  swatch: string;
}
