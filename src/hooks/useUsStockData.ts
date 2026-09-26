import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubnetRow } from '@/types';
import type { StockReloadResult } from '@/webmcp/useDataTools';
import {
  fetchUsStockAssets,
  filterExcludedTickers,
  type UsStockAssets,
} from '@/utils/fetchDeregList';

export type StockLoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Bảng cổ phiếu Mỹ: tự tải khi mở app (không cần dán tay), tải lại theo yêu cầu.
 * Cash ETFs được loại khỏi bảng — giống dereg list bên alpha (chỉ đọc, không sửa tay).
 */
export function useUsStockData() {
  const [rawRows, setRawRows] = useState<SubnetRow[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  // Bắt đầu ở 'loading' vì effect mount tải ngay (không setState đồng bộ trong effect).
  const [status, setStatus] = useState<StockLoadState>('loading');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Giữ tham chiếu ổn định: PortfolioBuilder reset kết quả khi mảng dữ liệu đổi identity.
  const rows = useMemo(() => filterExcludedTickers(rawRows, excluded), [rawRows, excluded]);

  /** Ghi kết quả tải vào state (luôn gọi trong callback `.then`, sau khi fetch xong). */
  const applyResult = useCallback(({ stocks, cashEtfs }: UsStockAssets): StockReloadResult => {
    setRawRows(stocks);
    setExcluded(cashEtfs);
    setError('');
    setStatus('ready');
    return {
      total: stocks.length,
      loaded: filterExcludedTickers(stocks, cashEtfs).length,
      cashEtfs,
    };
  }, []);

  const applyError = useCallback((ac: AbortController, err: unknown) => {
    if (ac.signal.aborted) return;
    setStatus('error');
    setError(err instanceof Error ? err.message : String(err));
  }, []);

  /** Tải lại theo yêu cầu (nút bấm / tool reload_stock_data). */
  const reload = useCallback((): Promise<StockReloadResult> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setStatus('loading');
    setError('');
    return fetchUsStockAssets(ac.signal).then(applyResult, (err: unknown) => {
      applyError(ac, err);
      throw err;
    });
  }, [applyResult, applyError]);

  // Tải ngay khi mở app — dữ liệu cổ phiếu có sẵn trên API, không cần dán tay.
  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    fetchUsStockAssets(ac.signal)
      .then(applyResult)
      .catch((err: unknown) => {
        applyError(ac, err);
        if (!ac.signal.aborted) console.warn('Không tải được bảng cổ phiếu Mỹ:', err);
      });
    return () => ac.abort();
  }, [applyResult, applyError]);

  return {
    /** Bảng đã loại cash ETFs — dùng cho mọi tab. */
    rows,
    /** Số mã trước khi loại cash ETFs. */
    totalCount: rawRows.length,
    excluded,
    status,
    error,
    reload,
  };
}

export type UsStockData = ReturnType<typeof useUsStockData>;
