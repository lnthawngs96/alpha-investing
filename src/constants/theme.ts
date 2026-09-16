import type { AccentKey, AccentOption, ThemeMode, ThemeModeOption, ThemePreference } from '@/types';

/** Tuỳ chọn mặc định khi chưa lưu gì (phải khớp với script inline trong index.html). */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  mode: 'system',
  accent: 'violet',
};

/** Các chế độ sáng / tối hiển thị trong bộ chọn theme. */
export const THEME_MODE_OPTIONS: readonly ThemeModeOption[] = [
  { value: 'light', label: 'Sáng', hint: 'Nền sáng, chữ tối' },
  { value: 'dark', label: 'Tối', hint: 'Nền xám đậm' },
  { value: 'midnight', label: 'Midnight', hint: 'Nền đen sâu, hợp màn OLED' },
  { value: 'system', label: 'Hệ thống', hint: 'Theo cài đặt của hệ điều hành' },
];

/** Các bảng màu nhấn. Swatch chỉ để vẽ nút chọn; màu thật nằm trong styles/theme.css. */
export const ACCENT_OPTIONS: readonly AccentOption[] = [
  { value: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { value: 'indigo', label: 'Indigo', swatch: '#6366f1' },
  { value: 'sky', label: 'Sky', swatch: '#0ea5e9' },
  { value: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { value: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { value: 'rose', label: 'Rose', swatch: '#f43f5e' },
];

export const THEME_MODES: readonly ThemeMode[] = THEME_MODE_OPTIONS.map((o) => o.value);
export const ACCENT_KEYS: readonly AccentKey[] = ACCENT_OPTIONS.map((o) => o.value);
