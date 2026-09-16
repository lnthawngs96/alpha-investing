import type { Portfolio, SavedPortfolioRecord } from '@/types';

/**
 * Xuất / nhập danh mục ra file JSON — tầng sao lưu duy nhất sống sót khi
 * người dùng xoá sạch site data (localStorage + sessionStorage cùng mất).
 */

export const EXPORT_KIND = 'subnet-explorer/saved-portfolios';
export const EXPORT_VERSION = 1;

/** Payload ghi ra file: bọc metadata để lúc nhập biết chắc đúng loại và phiên bản. */
export interface ExportPayload {
  kind: typeof EXPORT_KIND;
  version: number;
  exportedAt: string;
  count: number;
  portfolios: SavedPortfolioRecord[];
}

/** Kết quả đọc file nhập vào. */
export interface ImportParseResult {
  records: SavedPortfolioRecord[];
  error: string | null;
  /** Số bản ghi hỏng bị bỏ qua. */
  skipped: number;
}

/** Tên file có timestamp để nhiều lần xuất không đè lên nhau trong thư mục tải về. */
export function exportFileName(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp =
    `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}` +
    `-${p(now.getHours())}${p(now.getMinutes())}`;
  return `subnet-portfolios-${stamp}.json`;
}

export function buildExportPayload(list: SavedPortfolioRecord[]): ExportPayload {
  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    count: list.length,
    portfolios: list,
  };
}

/** Tải file xuống máy. Trả về tên file để phía gọi hiển thị thông báo. */
export function downloadPortfolios(list: SavedPortfolioRecord[]): string {
  const name = exportFileName();
  const blob = new Blob([JSON.stringify(buildExportPayload(list), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Thu hồi ở tick sau: Firefox huỷ tải nếu revoke ngay trong cùng tick.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}

/**
 * Chuẩn hoá một bản ghi nhập vào: mọi tỷ trọng phải là số, luôn có key '_'.
 * Trả về null nếu bản ghi hỏng không cứu được.
 */
function normalizeRecord(raw: unknown, i: number): SavedPortfolioRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const src = record.portfolio;
  if (!src || typeof src !== 'object' || Array.isArray(src)) return null;

  const source = src as Record<string, unknown>;
  const portfolio: Portfolio = { _: Number(source._) || 0 };
  for (const [k, v] of Object.entries(source)) {
    if (k === '_') continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    portfolio[k] = n;
  }
  if (Object.keys(portfolio).length < 2) return null; // không còn subnet nào

  return {
    ...(record as Partial<SavedPortfolioRecord>),
    portfolio,
    // savedAt vừa là khoá gộp vừa là React key — thiếu thì tự sinh để không
    // đụng bản ghi khác.
    savedAt:
      typeof record.savedAt === 'string' && record.savedAt
        ? record.savedAt
        : new Date(Date.now() + i).toISOString(),
  };
}

/**
 * Đọc nội dung file. Chấp nhận cả payload có metadata lẫn mảng thô — để người
 * dùng dán thẳng giá trị localStorage cũ vào file cũng nhập được.
 */
export function parseImportedPortfolios(text: string): ImportParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    // Nhầm file .js (script dán vào Console) với file .json là lỗi dễ mắc —
    // nói thẳng ra thay vì chỉ báo "JSON không hợp lệ".
    const head = text.trimStart().slice(0, 200);
    const looksLikeScript =
      head.startsWith('//') || head.startsWith('(') || /localStorage\s*\.\s*setItem/.test(text);
    return {
      records: [],
      error: looksLikeScript
        ? 'Đây là file JavaScript (loại dán vào DevTools Console), không phải JSON. Hãy chọn file .json'
        : 'File không phải JSON hợp lệ',
      skipped: 0,
    };
  }

  const payload = data as Partial<ExportPayload> | unknown[] | null;
  const list: unknown[] | null = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Partial<ExportPayload>)?.portfolios)
      ? ((payload as Partial<ExportPayload>).portfolios as unknown[])
      : null;

  if (!list) {
    return {
      records: [],
      error: 'Không tìm thấy danh mục trong file (cần mảng hoặc field "portfolios")',
      skipped: 0,
    };
  }
  const kind = (payload as Partial<ExportPayload>)?.kind;
  if (kind && kind !== EXPORT_KIND) {
    return { records: [], error: `File thuộc loại khác: "${kind}"`, skipped: 0 };
  }

  const records = list.map(normalizeRecord).filter((r): r is SavedPortfolioRecord => r !== null);
  if (!records.length) {
    return { records: [], error: 'Không có danh mục nào hợp lệ trong file', skipped: list.length };
  }
  return { records, error: null, skipped: list.length - records.length };
}

/** Đọc File object thành text (FileReader để tương thích rộng hơn File.text()). */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Không đọc được file'));
    reader.readAsText(file);
  });
}
