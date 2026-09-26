import type { AssetKey, MetricKey } from '@/types';
import type { TierKey } from '@/constants/tiers';
import type { MessageKey } from './translate';
import { tt } from './activeLocale';

/** Đơn vị đếm đã dịch (subnet / ticker|mã). */
export function unitLabel(unit: string): string {
  if (unit === 'ticker' || unit === 'mã') return tt('asset.unit.ticker');
  return tt('asset.unit.subnet');
}

/** Nhãn ngắn cho cột / radio (Subnet / Ticker|Mã). */
export function unitNoun(unit: string): string {
  if (unit === 'ticker' || unit === 'mã') return tt('saved.unitLabelTicker');
  return tt('saved.unitLabelSubnet');
}

/** Tên field trọng số (liquidity / market cap). */
export function weightLabel(assetKey: AssetKey): string {
  return assetKey === 'stock' ? tt('asset.stockWeight') : tt('asset.alphaWeight');
}

export function tierPrimaryName(assetKey: AssetKey): string {
  return assetKey === 'stock' ? tt('asset.stockTierPrimary') : tt('asset.alphaTierPrimary');
}

export function tierSecondaryName(assetKey: AssetKey): string {
  return assetKey === 'stock' ? tt('asset.stockTierSecondary') : tt('asset.alphaTierSecondary');
}

export function ruleLabel(assetKey: AssetKey): string {
  return assetKey === 'stock' ? tt('asset.stockRule') : tt('asset.alphaRule');
}

const METRIC_KEYS = new Set([
  'price_change_1_hour',
  'price_change_1_day',
  'price_change_1_week',
  'price_change_1_month',
  'price',
  'emission',
  'liquidity',
  'fear_and_greed_fear',
  'fear_and_greed_neutral',
  'mc',
  'pv',
  'volume',
]);

/** Nhãn tiêu chí xếp hạng theo locale hiện tại. */
export function localizedMetricLabel(changeKey: string): string {
  if (changeKey === 'other') return tt('portfolio.otherGroup');
  if (METRIC_KEYS.has(changeKey)) {
    return tt(`metrics.${changeKey}` as MessageKey);
  }
  return changeKey;
}

export function localizedMetricsLabel(keys: readonly string[]): string {
  if (!keys.length) return tt('portfolio.groupFallback');
  return keys.map(localizedMetricLabel).join(' + ');
}

type TierField = 'label' | 'hint';

const TIER_MSG: Record<AssetKey, Record<TierKey, Record<TierField, MessageKey>>> = {
  alpha: {
    both: { label: 'tiers.alphaBoth', hint: 'tiers.alphaBothHint' },
    emission: { label: 'tiers.alphaEmission', hint: 'tiers.alphaEmissionHint' },
    liquidity: { label: 'tiers.alphaLiquidity', hint: 'tiers.alphaLiquidityHint' },
    none: { label: 'tiers.alphaNone', hint: 'tiers.alphaNoneHint' },
  },
  stock: {
    both: { label: 'tiers.stockBoth', hint: 'tiers.stockBothHint' },
    emission: { label: 'tiers.stockEmission', hint: 'tiers.stockEmissionHint' },
    liquidity: { label: 'tiers.stockLiquidity', hint: 'tiers.stockLiquidityHint' },
    none: { label: 'tiers.stockNone', hint: 'tiers.stockNoneHint' },
  },
};

export function localizedTierLabel(assetKey: AssetKey, tier: TierKey): string {
  return tt(TIER_MSG[assetKey][tier].label);
}

export function localizedTierHint(assetKey: AssetKey, tier: TierKey): string {
  return tt(TIER_MSG[assetKey][tier].hint);
}

const COLUMN_KEYS = new Set([
  'netuid',
  'ticker',
  'name',
  'price',
  'emission',
  'liquidity',
  'price_change_1_hour',
  'price_change_1_day',
  'price_change_1_week',
  'price_change_1_month',
  'fear_and_greed_index',
  'sector',
  'volume',
  'pv',
  'mc',
]);

/** Nhãn cột bảng dữ liệu (ngắn gọn, theo locale + mục đầu tư). */
export function columnLabel(field: string, assetKey: AssetKey = 'alpha'): string {
  if (field === 'netuid' && assetKey === 'stock') return tt('columns.ticker');
  if (COLUMN_KEYS.has(field)) return tt(`columns.${field}` as MessageKey);
  return field.replace(/_/g, ' ');
}

/** Map metricOptions → nhãn đã dịch (giữ value gốc). */
export function localizeMetricOptions<T extends { value: MetricKey; label: string }>(
  options: readonly T[]
): Array<T & { label: string }> {
  return options.map((o) => ({ ...o, label: localizedMetricLabel(o.value) }));
}
