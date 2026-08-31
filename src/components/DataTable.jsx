import { useState, useMemo } from 'react';
import { isPrimitive } from '../utils/helpers';
import CellValue from './CellValue';

const DEFAULT_SORT_KEY = 'liquidity';

export default function DataTable({ data, columns }) {
  const [search, setSearch] = useState('');
  // Mặc định sắp xếp theo thanh khoản giảm dần ngay sau khi import data.
  const [sortKey, setSortKey] = useState(DEFAULT_SORT_KEY);
  const [sortDir, setSortDir] = useState('desc');

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
        const av = a[sortKey],
          bv = b[sortKey];
        const an = parseFloat(av),
          bn = parseFloat(bv);
        let cmp =
          !isNaN(an) && !isNaN(bn)
            ? an - bn
            : String(av ?? '').localeCompare(String(bv ?? ''));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return rows;
  }, [data, columns, search, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div className="pt-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex gap-4 text-xs text-slate-400">
          <span>
            {filteredRows.length} / {data.length} rows
          </span>
          <span className="text-slate-600">·</span>
          <span>{columns.length} columns</span>
        </div>
        <div className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-lg px-4 focus-within:border-violet-500 transition-colors duration-200">
          <span className="text-slate-400 text-xs">⌕</span>
          <input
            type="text"
            className="bg-transparent border-none outline-none text-slate-100 font-mono text-xs py-4 min-w-[240px] placeholder:text-slate-600"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border border-slate-700 rounded-lg max-h-[calc(100vh-300px)]">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-16 text-center text-slate-600 bg-slate-800 p-4 border-b border-r border-slate-700 select-none font-bold tracking-wider whitespace-nowrap">
                #
              </th>
              {columns.map((c) => {
                const isActive = sortKey === c;
                const arrow = isActive
                  ? sortDir === 'asc'
                    ? ' ↑'
                    : ' ↓'
                  : ' ⇅';
                return (
                  <th
                    key={c}
                    className={`p-4 text-left whitespace-nowrap cursor-pointer border-b border-r border-slate-700 last:border-r-0 select-none font-bold tracking-wider transition-colors duration-150 ${
                      isActive
                        ? 'bg-violet-500/15 text-violet-500'
                        : 'bg-slate-800 text-slate-400 hover:bg-violet-500/10 hover:text-slate-100'
                    }`}
                    onClick={() => handleSort(c)}
                  >
                    {c}
                    {arrow}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="p-12 text-center text-slate-400 border-b border-slate-700"
                >
                  Không có dữ liệu phù hợp
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={i} className="group hover:bg-violet-500/5">
                  <td className="w-16 text-center text-slate-600 border-r border-b border-slate-700 p-4 align-middle whitespace-nowrap">
                    {i + 1}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c}
                      className="p-4 border-b border-r border-slate-700 last:border-r-0 whitespace-nowrap align-middle"
                    >
                      {isPrimitive(row[c]) ? (
                        <CellValue val={row[c]} colKey={c} />
                      ) : (
                        <span className="text-slate-600">—</span>
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
