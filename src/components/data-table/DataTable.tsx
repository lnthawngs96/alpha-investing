import { useMemo, useState } from 'react';
import type { SortDirection, SubnetRow } from '@/types';
import { isPrimitive } from '@/utils/format';
import { cn } from '@/utils/classNames';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, SearchIcon } from '@/components/icons';
import { useAssetProfile } from '@/store/asset/context';
import { columnLabel, useLocale } from '@/i18n';
import { CellValue } from './CellValue';

export interface DataTableProps {
  data: SubnetRow[];
  columns: string[];
}


/**
 * Bảng dữ liệu subnet: tìm kiếm toàn văn trên mọi cột, click tiêu đề để sắp xếp
 * (số so số, chuỗi so chuỗi), header dính khi cuộn.
 */
export function DataTable({ data, columns }: DataTableProps) {
  const profile = useAssetProfile();
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  // Mặc định sắp xếp giảm dần ngay sau khi import data: alpha theo thanh khoản, cổ phiếu Mỹ theo vốn hoá.
  const [sortKey, setSortKey] = useState<string | null>(profile.defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    let rows = data.filter((row) => {
      if (!q) return true;
      return columns.some((c) => {
        const v = row[c];
        return v !== null && v !== undefined && String(v).toLowerCase().includes(q);
      });
    });

    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const an = parseFloat(av as string);
        const bn = parseFloat(bv as string);
        const cmp =
          !isNaN(an) && !isNaN(bn) ? an - bn : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, columns, search, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-4 animate-fade-in">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span className="tabular-nums">
            <b className="text-fg">{filteredRows.length}</b> / {data.length} {t('table.rows')}
          </span>
          <span className="text-fg-faint">·</span>
          <span className="tabular-nums">{columns.length} {t('table.columns')}</span>
        </div>
        <label className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 transition-all duration-200 focus-within:border-accent focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--accent)_15%,transparent)]">
          <SearchIcon size={14} className="text-fg-faint" />
          <input
            type="text"
            className="min-w-[240px] bg-transparent py-2 text-xs text-fg outline-none placeholder:text-fg-faint"
            placeholder={t('table.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>

      {/* Table */}
      <div className="show-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-line bg-surface shadow-card">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 w-14 select-none whitespace-nowrap border-b border-r border-line bg-surface-raised p-3 text-center text-[11px] font-bold tracking-wider text-fg-faint">
                #
              </th>
              {columns.map((c) => {
                const isActive = sortKey === c;
                return (
                  <th
                    key={c}
                    className={cn(
                      'sticky top-0 z-10 group cursor-pointer select-none whitespace-nowrap border-b border-r border-line p-3 text-left text-[11px] font-bold tracking-wider last:border-r-0',
                      'transition-colors duration-150',
                      // Nền đặc (color-mix) — tránh bg-accent/xx trong suốt để content scroll không đè lên header.
                      isActive
                        ? 'bg-[color-mix(in_oklab,var(--accent)_20%,var(--surface-raised))] text-accent'
                        : 'bg-surface-raised text-fg-muted hover:bg-[color-mix(in_oklab,var(--accent)_12%,var(--surface-raised))] hover:text-fg'
                    )}
                    onClick={() => handleSort(c)}
                    aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {columnLabel(c, profile.key)}
                      {isActive ? (
                        sortDir === 'asc' ? (
                          <ArrowUpIcon size={12} className="animate-scale-in" />
                        ) : (
                          <ArrowDownIcon size={12} className="animate-scale-in" />
                        )
                      ) : (
                        <ArrowUpDownIcon size={12} className="opacity-30 transition-opacity group-hover:opacity-80" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="border-b border-line p-12 text-center text-fg-muted">
                  {t('table.noMatch')}
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={i} className="group transition-colors duration-150 hover:bg-accent/5">
                  <td className="w-14 whitespace-nowrap border-b border-r border-line p-3 text-center align-middle tabular-nums text-fg-faint">
                    {i + 1}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c}
                      className="whitespace-nowrap border-b border-r border-line p-3 align-middle last:border-r-0"
                    >
                      {isPrimitive(row[c]) ? (
                        <CellValue val={row[c]} colKey={c} />
                      ) : (
                        <span className="text-fg-faint">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
