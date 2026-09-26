import { useCallback, useMemo } from 'react';
import type { AssetProfile, SubnetRow, TierConfig } from '@/types';
import type { TierKey } from '@/constants/tiers';
import { useAssetProfile } from '@/store/asset/context';
import { buildRankIndex } from '@/utils/subnetData';

/** Kết quả phân loại một subnet. */
export interface SubnetClassification {
  eRank: number | null;
  lRank: number | null;
  topE: boolean;
  topL: boolean;
  tier: TierKey;
}

/** Số subnet + tổng tỷ trọng (%) theo từng nhóm. */
export type TierStats = Record<TierKey, { count: number; weight: number }>;

export interface SubnetTiers {
  emissionRanks: Map<string, number>;
  liquidityRanks: Map<string, number>;
  /** false khi không có data table → mọi badge hiển thị "—". */
  canRank: boolean;
  topEmissionN: number;
  topLiquidityN: number;
  classify: (netuid: string | number) => SubnetClassification;
  summarize: (entries: Array<[string, number]>) => TierStats;
  /** Nhãn / màu của từng nhóm theo mục đầu tư đang xem. */
  config: Readonly<Record<TierKey, TierConfig>>;
  /** Tên hai tiêu chí phân loại (vd "emission" / "thanh khoản"). */
  names: AssetProfile['tierNames'];
  /** Đơn vị đếm (vd "subnet", "mã"). */
  unit: string;
}

/**
 * Xếp hạng subnet theo emission / thanh khoản từ data table đang nạp (không
 * phải từ giá lúc lưu danh mục) và phân loại từng subnet trong danh mục:
 * both | emission | liquidity | none theo ngưỡng top N người dùng đặt.
 * Cổ phiếu Mỹ dùng cùng cơ chế với vốn hoá (mc) / giá trị giao dịch (pv) — xem AssetProfile.tierFields.
 */
export function useSubnetTiers(currentData: SubnetRow[], topEmissionN: number, topLiquidityN: number): SubnetTiers {
  const profile = useAssetProfile();
  const { primary, secondary } = profile.tierFields;
  const emissionRanks = useMemo(() => buildRankIndex(currentData, primary), [currentData, primary]);
  const liquidityRanks = useMemo(() => buildRankIndex(currentData, secondary), [currentData, secondary]);
  const canRank = emissionRanks.size > 0 || liquidityRanks.size > 0;

  // Phân loại một subnet: thứ hạng emission / thanh khoản + nhóm.
  const classify = useCallback(
    (netuid: string | number): SubnetClassification => {
      const id = String(netuid);
      const eRank = emissionRanks.get(id) ?? null;
      const lRank = liquidityRanks.get(id) ?? null;
      const topE = eRank != null && eRank <= topEmissionN;
      const topL = lRank != null && lRank <= topLiquidityN;
      const tier: TierKey = topE && topL ? 'both' : topE ? 'emission' : topL ? 'liquidity' : 'none';
      return { eRank, lRank, topE, topL, tier };
    },
    [emissionRanks, liquidityRanks, topEmissionN, topLiquidityN]
  );

  // Tổng hợp một danh mục: số subnet + tổng tỷ trọng theo từng nhóm.
  const summarize = useCallback(
    (entries: Array<[string, number]>): TierStats => {
      const stats: TierStats = {
        both: { count: 0, weight: 0 },
        emission: { count: 0, weight: 0 },
        liquidity: { count: 0, weight: 0 },
        none: { count: 0, weight: 0 },
      };
      for (const [netuid, weight] of entries) {
        const { tier } = classify(netuid);
        stats[tier].count += 1;
        stats[tier].weight += (Number(weight) || 0) * 100;
      }
      return stats;
    },
    [classify]
  );

  return {
    emissionRanks,
    liquidityRanks,
    canRank,
    topEmissionN,
    topLiquidityN,
    classify,
    summarize,
    config: profile.tiers,
    names: profile.tierNames,
    unit: profile.unit,
  };
}
