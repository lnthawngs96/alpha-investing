import type { SubnetRow } from '@/types';
import { ALPHA_SUBNETS_URL } from '@/constants/api';
import { tt } from '@/i18n';

interface AlphaApiResponse {
  subnets?: SubnetRow[];
  error?: string;
}

/** Tải bảng subnet Alpha — chỉ gọi `/api/alpha` (JSON đã parse trên server). */
export async function fetchSubnetTable(signal?: AbortSignal): Promise<SubnetRow[]> {
  const res = await fetch(ALPHA_SUBNETS_URL, {
    method: 'GET',
    signal,
    credentials: 'omit',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(tt('fetch.failed'));
  const body = (await res.json()) as AlphaApiResponse;
  if (!Array.isArray(body.subnets) || !body.subnets.length) {
    throw new Error(tt('fetch.failed'));
  }
  return body.subnets;
}
