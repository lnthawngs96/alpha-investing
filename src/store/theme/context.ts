import { createContext, useContext } from 'react';
import type { AccentKey, ResolvedThemeMode, ThemeMode, ThemePreference } from '@/types';

/** Giá trị context theme: tuỳ chọn đã lưu + mode thực tế đang áp lên <html>. */
export interface ThemeContextValue {
  preference: ThemePreference;
  /** Mode đã phân giải (system → light/dark theo hệ điều hành). */
  resolvedMode: ResolvedThemeMode;
  /** true khi mode đang áp là tối (dark hoặc midnight). */
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentKey) => void;
  /** Đảo nhanh sáng ↔ tối (giữ midnight nếu đang midnight → sang light). */
  toggleMode: () => void;
}

/** Tách khỏi ThemeProvider.tsx để file provider chỉ export component (Fast Refresh). */
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme phải nằm trong <ThemeProvider>');
  return ctx;
}
