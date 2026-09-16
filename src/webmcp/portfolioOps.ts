import type { Portfolio, SavedPortfolioRecord } from '@/types';
import { DD_TRIGGER, SAFE_DEDUPE_DISTANCE } from '@/constants/portfolio';
import { checkDedupe, portfolioEntriesDesc, validateTaoAlphaPortfolio } from '@/utils/portfolioValidation';

/**
 * Báo cáo trạng thái danh mục trả về cho agent.
 *
 * Danh mục lưu dưới dạng { _: 0, '<netuid>': <tỷ trọng>, ... } với tổng tỷ trọng
 * (không tính '_') ≤ 1. Các hàm toán học trong utils/portfolioMath.ts nhận map
 * netuid→trọng số THUẦN, nên phải bóc '_' ra trước (stripAssetClass) và gắn lại
 * sau (withAssetClass) — quên bước này thì '_' bị coi như một subnet.
 */

export interface PortfolioReport {
  subnet_count: number;
  total_allocation: number;
  cash: number;
  valid: boolean;
  errors: string[];
  dedupe: {
    safe: boolean;
    min_distance: number | null;
    trigger_threshold: number;
    recommended_min_distance: number;
    conflicts: ReturnType<typeof checkDedupe>['conflicts'];
  };
  allocations: Array<{ netuid: number; name?: string; weight: number; percent: number }>;
}

export interface EmptyPortfolioReport {
  portfolio: null;
  message: string;
}

/**
 * Báo cáo đầy đủ về một danh mục, dùng làm giá trị trả về chung cho mọi tool
 * sửa danh mục. Agent nhờ đó luôn thấy ngay hậu quả của thao tác vừa rồi
 * (hợp lệ chưa, có bị dedupe không) mà không phải gọi thêm tool kiểm tra.
 */
export function describePortfolio(
  portfolio: Portfolio | null | undefined,
  savedPortfolios: SavedPortfolioRecord[] = [],
  names: Record<string, string> = {}
): PortfolioReport | EmptyPortfolioReport {
  if (!portfolio) return { portfolio: null, message: 'Chưa có danh mục nào được tạo.' };

  const validation = validateTaoAlphaPortfolio(portfolio);
  const dedupe = checkDedupe(portfolio, savedPortfolios);
  const entries = portfolioEntriesDesc(portfolio);

  return {
    subnet_count: entries.length,
    total_allocation: validation.total,
    cash: validation.cash,
    valid: validation.valid,
    errors: validation.errors,
    dedupe: {
      safe: dedupe.ok && (dedupe.minDist === null || dedupe.minDist >= SAFE_DEDUPE_DISTANCE),
      min_distance: dedupe.minDist,
      trigger_threshold: DD_TRIGGER,
      recommended_min_distance: +SAFE_DEDUPE_DISTANCE.toFixed(6),
      conflicts: dedupe.conflicts,
    },
    allocations: entries.map(([netuid, weight]) => ({
      netuid: Number(netuid),
      name: names[netuid] || undefined,
      weight: +Number(weight).toFixed(6),
      percent: +(Number(weight) * 100).toFixed(3),
    })),
  };
}
