import { formatBig } from '../utils/helpers';

export default function CellValue({ val, colKey }) {
  if (val === null || val === undefined)
    return <span className="text-slate-600">—</span>;
  if (typeof val === 'boolean')
    return val ? (
      <span className="text-emerald-400 font-bold">TRUE</span>
    ) : (
      <span className="text-slate-400">FALSE</span>
    );

  if (colKey && /price_change|change_1/.test(colKey)) {
    const n = parseFloat(val);
    if (!isNaN(n)) {
      const cls = n > 0 ? 'text-emerald-400 font-bold' : n < 0 ? 'text-red-400 font-bold' : 'text-slate-600';
      return (
        <span className={cls}>
          {n > 0 ? '+' : ''}
          {n.toFixed(4)}%
        </span>
      );
    }
  }

  const str = String(val);
  const n = parseFloat(str);
  if (!isNaN(n) && str.match(/^-?\d/)) {
    return (
      <span className="text-slate-100 tabular-nums">{formatBig(n, colKey)}</span>
    );
  }

  if (str.length > 38)
    return (
      <span className="text-sky-300" title={str}>
        {str.slice(0, 36)}…
      </span>
    );
  return <span className="text-sky-300">{str}</span>;
}
