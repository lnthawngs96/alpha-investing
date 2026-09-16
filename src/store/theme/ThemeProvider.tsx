import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AccentKey, ResolvedThemeMode, ThemeMode, ThemePreference } from '@/types';
import { ACCENT_KEYS, DEFAULT_THEME_PREFERENCE, THEME_MODES } from '@/constants/theme';
import { THEME_STORAGE_KEY } from '@/constants/storage';
import { readJson, writeJson } from '@/utils/storage';
import { ThemeContext, type ThemeContextValue } from './context';

const LIGHT_QUERY = '(prefers-color-scheme: light)';

/** Đọc tuỳ chọn đã lưu, loại bỏ giá trị lạ (vd theme đã bị xoá khỏi danh sách). */
function loadPreference(): ThemePreference {
  const raw = readJson<Partial<ThemePreference>>(THEME_STORAGE_KEY);
  const mode = raw?.mode && THEME_MODES.includes(raw.mode) ? raw.mode : DEFAULT_THEME_PREFERENCE.mode;
  const accent =
    raw?.accent && ACCENT_KEYS.includes(raw.accent) ? raw.accent : DEFAULT_THEME_PREFERENCE.accent;
  return { mode, accent };
}

/** Hệ điều hành đang ở chế độ sáng? (false nếu không có matchMedia). */
function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(LIGHT_QUERY).matches;
}

function resolveMode(mode: ThemeMode, systemLight: boolean): ResolvedThemeMode {
  if (mode !== 'system') return mode;
  return systemLight ? 'light' : 'dark';
}

/**
 * Quản lý theme: mode (light / dark / midnight / system) × accent.
 * Áp lên <html> qua data-theme / data-accent để CSS token trong styles/theme.css
 * đổi theo; lưu localStorage để lần mở sau giữ nguyên (script inline trong
 * index.html đọc cùng khoá này để tránh nháy màu khi tải trang).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(loadPreference);
  // Trạng thái sáng/tối của hệ điều hành — chỉ dùng khi mode = 'system'.
  const [systemLight, setSystemLight] = useState(systemPrefersLight);
  const resolvedMode = resolveMode(preference.mode, systemLight);

  // Áp tuỳ chọn lên <html> + lưu lại mỗi khi đổi (đồng bộ với hệ thống ngoài React).
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedMode);
    root.setAttribute('data-accent', preference.accent);
    writeJson(THEME_STORAGE_KEY, preference);
  }, [preference, resolvedMode]);

  // Theo dõi hệ điều hành đổi sáng/tối lúc app đang mở.
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(LIGHT_QUERY);
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((mode: ThemeMode) => setPreference((p) => ({ ...p, mode })), []);
  const setAccent = useCallback((accent: AccentKey) => setPreference((p) => ({ ...p, accent })), []);
  const toggleMode = useCallback(
    () =>
      setPreference((p) => ({
        ...p,
        mode: resolveMode(p.mode, systemPrefersLight()) === 'light' ? 'dark' : 'light',
      })),
    []
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedMode,
      isDark: resolvedMode !== 'light',
      setMode,
      setAccent,
      toggleMode,
    }),
    [preference, resolvedMode, setMode, setAccent, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
