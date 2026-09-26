import { INVESTING88_ASSETS_URL } from '@/constants/api';
import { parseDeregInput } from './subnetData';

const DEREG_LINE_RE = /dereg\s*list\s*:\s*(\[[^\]]*\])/i;

/**
 * Lấy mảng netuid dereg từ https://api.investing88.ai/assets
 * (phản hồi HTML/text có dòng `dereg list: [84]`).
 */
export async function fetchAssetsDeregList(
  signal?: AbortSignal
): Promise<number[]> {
  const res = await fetch(INVESTING88_ASSETS_URL, {
    method: 'GET',
    signal,
    // Không cần cookies; tránh CORS credential mode.
    credentials: 'omit',
  });
  if (!res.ok) {
    throw new Error(`Không tải được assets (${res.status})`);
  }
  const text = await res.text();
  const plain = text.replace(/<[^>]+>/g, ' ');
  const match = plain.match(DEREG_LINE_RE);
  if (!match) {
    throw new Error('Không tìm thấy dòng "dereg list" trong phản hồi assets');
  }
  return parseDeregInput(match[1]);
}
