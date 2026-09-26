import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SubnetRow } from '@/types';
import { fetchAssetsDeregList } from '@/utils/fetchDeregList';
import { fetchSubnetTable } from '@/utils/fetchSubnetTable';
import { filterExcludedSubnets } from '@/utils/subnetData';

export type AlphaLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface AlphaReloadResult {
  total: number;
  loaded: number;
  deregIds: number[];
}

/**
 * Bảng Alpha: tự tải subnet + dereg khi mở app (không cần dán JSON).
 * Tải lại theo nút / tool; vẫn nhận nạp tay.
 */
export function useAlphaSubnetData() {
  const [rawRows, setRawRows] = useState<SubnetRow[]>([]);
  const [deregIds, setDeregIds] = useState<number[]>([]);
  const [status, setStatus] = useState<AlphaLoadState>('loading');
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const deregRef = useRef<number[]>([]);

  const rows = useMemo(() => filterExcludedSubnets(rawRows, deregIds), [rawRows, deregIds]);

  const applyLoaded = useCallback((stocks: SubnetRow[], dereg: number[]): AlphaReloadResult => {
    setRawRows(stocks);
    setDeregIds(dereg);
    deregRef.current = dereg;
    setError('');
    setStatus('ready');
    return {
      total: stocks.length,
      loaded: filterExcludedSubnets(stocks, dereg).length,
      deregIds: dereg,
    };
  }, []);

  const load = useCallback(
    async (ac: AbortController): Promise<AlphaReloadResult> => {
      setStatus('loading');
      setError('');
      const [subnetsSettled, deregSettled] = await Promise.allSettled([
        fetchSubnetTable(ac.signal),
        fetchAssetsDeregList(ac.signal),
      ]);
      if (ac.signal.aborted) throw new DOMException('Aborted', 'AbortError');

      if (subnetsSettled.status === 'rejected') {
        const err = subnetsSettled.reason;
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      }

      const dereg =
        deregSettled.status === 'fulfilled'
          ? deregSettled.value
          : deregRef.current.length
            ? deregRef.current
            : [];
      return applyLoaded(subnetsSettled.value, dereg);
    },
    [applyLoaded]
  );

  const reload = useCallback((): Promise<AlphaReloadResult> => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    return load(ac);
  }, [load]);

  /** Nạp tay / tool WebMCP — giữ dereg API nếu không truyền. */
  const applyManual = useCallback((data: SubnetRow[], nextDereg?: number[]) => {
    const dereg = nextDereg ?? deregRef.current;
    setRawRows(data);
    setDeregIds(dereg);
    deregRef.current = dereg;
    setError('');
    setStatus('ready');
  }, []);

  // Mount: fetch trong .then (không gọi load() — tránh setState đồng bộ trong effect).
  useEffect(() => {
    const ac = new AbortController();
    abortRef.current = ac;
    void Promise.allSettled([fetchSubnetTable(ac.signal), fetchAssetsDeregList(ac.signal)]).then(
      ([subnetsSettled, deregSettled]) => {
        if (ac.signal.aborted) return;
        if (subnetsSettled.status === 'rejected') {
          const err = subnetsSettled.reason;
          setStatus('error');
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
        const dereg =
          deregSettled.status === 'fulfilled'
            ? deregSettled.value
            : deregRef.current.length
              ? deregRef.current
              : [];
        applyLoaded(subnetsSettled.value, dereg);
      }
    );
    return () => ac.abort();
  }, [applyLoaded]);

  return {
    rows,
    totalCount: rawRows.length,
    deregIds,
    status,
    error,
    reload,
    applyManual,
  };
}

export type AlphaSubnetData = ReturnType<typeof useAlphaSubnetData>;
