import { createContext, useContext } from 'react';
import type { HistorySnapshot, SavedPortfolioRecord } from '@/types';

/** Dữ liệu bổ sung khi cập nhật một danh mục đã lưu (xem `updateSaved`). */
export interface UpdateSavedExtra {
  prices?: Record<string, number>;
  names?: Record<string, string>;
  groups?: SavedPortfolioRecord['groups'];
}

/** Kết quả nhập từ file: số bản ghi mới và số bản ghi đã có sẵn. */
export interface ImportResult {
  added: number;
  duplicates: number;
}

/** Giá trị context: danh sách đã lưu + các thao tác ghi. */
export interface SavedPortfoliosContextValue {
  savedPortfolios: SavedPortfolioRecord[];
  history: HistorySnapshot[];
  /** true khi vừa khôi phục được bản ghi từ sessionStorage — UI hiện thông báo. */
  restoredFromBackup: boolean;
  dismissRestoredNotice: () => void;
  savePortfolio: (record: SavedPortfolioRecord) => void;
  deleteSaved: (idx: number) => void;
  updateSaved: (idx: number, portfolio: SavedPortfolioRecord['portfolio'], extra?: UpdateSavedExtra | null) => void;
  renameSaved: (idx: number, name: string) => void;
  importPortfolios: (records: SavedPortfolioRecord[]) => ImportResult;
  restoreSnapshot: (id: string) => boolean;
}

/**
 * Tách khỏi SavedPortfoliosProvider.tsx để file provider chỉ export component
 * (yêu cầu của react-refresh / Fast Refresh).
 */
export const SavedPortfoliosContext = createContext<SavedPortfoliosContextValue | null>(null);

export function useSavedPortfolios(): SavedPortfoliosContextValue {
  const ctx = useContext(SavedPortfoliosContext);
  if (!ctx) throw new Error('useSavedPortfolios phải nằm trong <SavedPortfoliosProvider>');
  return ctx;
}
