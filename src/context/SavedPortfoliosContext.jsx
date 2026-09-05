import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  STORAGE_KEY,
  loadHistory,
  loadSavedPortfolios,
  mergeSavedPortfolios,
  savePortfoliosToStorage,
} from '../utils/portfolio';
import { SavedPortfoliosContext } from './savedPortfoliosStore';

// Bên thứ ba của cơ chế 3 bên: bản trong RAM. Provider giữ danh sách ở state,
// mọi thay đổi ghi xuống localStorage + sessionStorage qua savePortfoliosToStorage.
// Nhờ vậy nếu người dùng xoá một kho, kho còn lại và bản RAM vẫn dựng lại được.
export function SavedPortfoliosProvider({ children }) {
  // Đọc gộp ngay khi khởi tạo để bản RAM không bao giờ nghèo hơn kho lưu trữ.
  const [initial] = useState(loadSavedPortfolios);
  const [savedPortfolios, setSavedPortfolios] = useState(initial.list);
  // Bật khi sessionStorage bù được bản ghi localStorage đã mất — UI có thể báo.
  const [restoredFromBackup, setRestoredFromBackup] = useState(initial.restored);
  const [history, setHistory] = useState(loadHistory);

  // Ghi ngược xuống localStorage khi vừa khôi phục được từ bản sao, nếu không
  // lần lưu kế tiếp mới đồng bộ và người dùng có thể đóng tab trước đó.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!initial.restored || syncedRef.current) return;
    syncedRef.current = true;
    savePortfoliosToStorage(initial.list);
    setHistory(loadHistory());
  }, [initial]);

  // Bản mới nhất đọc được đồng bộ, để hai lần commit trong cùng một tick không
  // ghi đè nhau (state của React chỉ cập nhật ở lần render sau).
  const listRef = useRef(initial.list);

  const commit = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(listRef.current) : updater;
    listRef.current = next;
    setSavedPortfolios(next);
    savePortfoliosToStorage(next);
    setHistory(loadHistory());
  }, []);

  // Tab khác sửa localStorage → gộp vào bản RAM thay vì ghi đè, tránh mất bản
  // ghi vừa tạo ở tab này. Event chỉ bắn ở các tab KHÁC tab gây ra thay đổi.
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      const { list } = loadSavedPortfolios();
      const merged = mergeSavedPortfolios(list, listRef.current);
      listRef.current = merged;
      setSavedPortfolios(merged);
      setHistory(loadHistory());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const savePortfolio = useCallback(
    (record) => commit((prev) => [record, ...prev]),
    [commit]
  );

  const deleteSaved = useCallback(
    (idx) => commit((prev) => prev.filter((_, i) => i !== idx)),
    [commit]
  );

  // `extra` (tuỳ chọn) bổ sung giá/tên cho subnet MỚI thêm vào danh mục: giá lúc thêm chính là
  // giá mua vào của subnet đó, thiếu nó thì cột "Biến động" của subnet mới luôn hiện "—".
  // Chỉ GỘP thêm, không ghi đè giá đã lưu của các subnet cũ.
  // `extra.groups` (nếu có) ghi đè membership nhóm generate — dùng khi xoá/thêm theo cụm.
  const updateSaved = useCallback(
    (idx, portfolio, extra = null) =>
      commit((prev) =>
        prev.map((s, i) =>
          i === idx
            ? {
                ...s,
                portfolio,
                prices: { ...(s.prices || {}), ...(extra?.prices || {}) },
                names: { ...(s.names || {}), ...(extra?.names || {}) },
                ...(extra?.groups !== undefined ? { groups: extra.groups } : {}),
              }
            : s
        )
      ),
    [commit]
  );

  const renameSaved = useCallback(
    (idx, name) => commit((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s))),
    [commit]
  );

  // Nhập từ file: GỘP chứ không thay thế — bản ghi trùng savedAt giữ nguyên bản
  // đang có. Đây là tầng sao lưu cuối, thay thế nhầm sẽ mất dữ liệu vĩnh viễn.
  // Trả về { added, duplicates } để UI báo lại.
  const importPortfolios = useCallback(
    (records) => {
      const before = listRef.current.length;
      const merged = mergeSavedPortfolios(listRef.current, records);
      commit(merged);
      const added = merged.length - before;
      return { added, duplicates: records.length - added };
    },
    [commit]
  );

  // Hoàn tác: nạp lại một bản chụp trong lịch sử (gộp với hiện tại để không
  // làm mất danh mục tạo sau bản chụp đó).
  const restoreSnapshot = useCallback(
    (id) => {
      const snap = history.find((s) => (s.id || s.at) === id);
      if (!snap) return false;
      commit((prev) => mergeSavedPortfolios(snap.list, prev));
      return true;
    },
    [commit, history]
  );

  const value = useMemo(
    () => ({
      savedPortfolios,
      history,
      restoredFromBackup,
      dismissRestoredNotice: () => setRestoredFromBackup(false),
      savePortfolio,
      deleteSaved,
      updateSaved,
      renameSaved,
      importPortfolios,
      restoreSnapshot,
    }),
    [savedPortfolios, history, restoredFromBackup, savePortfolio, deleteSaved, updateSaved, renameSaved, importPortfolios, restoreSnapshot]
  );

  return (
    <SavedPortfoliosContext.Provider value={value}>
      {children}
    </SavedPortfoliosContext.Provider>
  );
}
