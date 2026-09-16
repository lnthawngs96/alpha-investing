import { formatBig } from '@/utils/format';

export interface CellValueProps {
  val: string | number | boolean | null | undefined;
  /** Tên cột — quyết định cách định dạng (% cho cột tăng trưởng, rút gọn số lớn…). */
  colKey?: string;
}

/**
 * Hiển thị một ô trong bảng dữ liệu:
 * - null/undefined → "—"
 * - boolean → TRUE / FALSE
 * - cột price_change* → % có dấu, tô màu theo dấu
 * - số → định dạng số (rút gọn nếu là cột tiền / khối lượng)
 * - chuỗi dài → cắt 36 ký tự + tooltip
 */
export function CellValue({ val, colKey }: CellValueProps) {
  if (val === null || val === undefined) return <span className="text-fg-faint">—</span>;
  if (typeof val === 'boolean')
    return val ? (
      <span className="font-bold text-positive">TRUE</span>
    ) : (
      <span className="text-fg-muted">FALSE</span>
    );

  if (colKey && /price_change|change_1/.test(colKey)) {
    const n = parseFloat(String(val));
    if (!isNaN(n)) {
      const cls = n > 0 ? 'text-positive font-bold' : n < 0 ? 'text-negative font-bold' : 'text-fg-faint';
      return (
        <span className={`${cls} tabular-nums`}>
          {n > 0 ? '+' : ''}
          {n.toFixed(4)}%
        </span>
      );
    }
  }

  const str = String(val);
  const n = parseFloat(str);
  if (!isNaN(n) && str.match(/^-?\d/)) {
    return <span className="tabular-nums text-fg">{formatBig(n, colKey)}</span>;
  }

  if (str.length > 38)
    return (
      <span className="text-info" title={str}>
        {str.slice(0, 36)}…
      </span>
    );
  return <span className="text-info">{str}</span>;
}
