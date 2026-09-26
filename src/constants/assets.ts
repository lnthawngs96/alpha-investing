import type { AssetKey, AssetProfile, MetricKey, MetricOption } from '@/types';
import {
  CHANGE_DEFAULT,
  CHANGE_OPTIONS,
  EMISSION_FIELD,
  LIQUIDITY_FIELD,
  LIQUIDITY_MAX_WEIGHT,
  METRIC_KEYS,
  PRICE_FIELD,
  TAO_ALPHA_ASSET_CLASS,
} from './portfolio';
import { DEFAULT_GROUP1_COUNT, DEFAULT_GROUP2_COUNT } from './editor';
import { STOCK_TIERS, TIERS } from './tiers';

// ============================================================================
// Hai mục đầu tư của Subnet 88.
// Tham chiếu: Investing/strat/README.md
//   - `'_': 0` → Tao/Alpha: key là netuid, không short.
//   - `'_': 1` → cổ phiếu Mỹ: key là ticker (phân biệt hoa thường), cho phép
//     short (giá trị âm); ticker không hỗ trợ / key rỗng tính là cash.
// ============================================================================

/** Asset class của cổ phiếu Mỹ (key '_'). */
export const US_STOCK_ASSET_CLASS = 1;

/** Cột của bảng cổ phiếu Mỹ (api.investing88.ai/assets). */
export const MC_FIELD: MetricKey = 'mc';
export const PV_FIELD: MetricKey = 'pv';
export const VOLUME_FIELD: MetricKey = 'volume';

/** Tiêu chí chọn mã cổ phiếu ở tab Portfolio gen. */
export const STOCK_CHANGE_OPTIONS: readonly MetricOption[] = [
  { value: MC_FIELD, label: 'Vốn hoá (cao → thấp)' },
  { value: PV_FIELD, label: 'Giá trị giao dịch (price × volume)' },
  { value: VOLUME_FIELD, label: 'Khối lượng giao dịch' },
  { value: PRICE_FIELD, label: 'Giá (cao → thấp)' },
];

export const ALPHA_PROFILE: AssetProfile = {
  key: 'alpha',
  assetClass: TAO_ALPHA_ASSET_CLASS,
  label: 'Alpha',
  unit: 'subnet',
  idField: 'netuid',
  idPrefix: '#',
  ruleLabel: 'Tao/Alpha',
  metricOptions: CHANGE_OPTIONS,
  metricKeys: METRIC_KEYS,
  defaultMetric: CHANGE_DEFAULT,
  weightField: LIQUIDITY_FIELD,
  weightLabel: 'thanh khoản',
  maxWeight: LIQUIDITY_MAX_WEIGHT,
  defaultGroups: [
    { count: DEFAULT_GROUP1_COUNT, keys: [LIQUIDITY_FIELD] },
    { count: DEFAULT_GROUP2_COUNT, keys: [CHANGE_DEFAULT] },
  ],
  defaultSortKey: LIQUIDITY_FIELD,
  columnLabels: {},
  tierFields: { primary: EMISSION_FIELD, secondary: LIQUIDITY_FIELD },
  tierNames: { primary: 'emission', secondary: 'thanh khoản' },
  tiers: TIERS,
  priceDigits: 6,
};

export const STOCK_PROFILE: AssetProfile = {
  key: 'stock',
  assetClass: US_STOCK_ASSET_CLASS,
  label: 'Cổ phiếu Mỹ',
  unit: 'mã',
  idField: 'ticker',
  idPrefix: '',
  ruleLabel: 'US stocks',
  metricOptions: STOCK_CHANGE_OPTIONS,
  metricKeys: STOCK_CHANGE_OPTIONS.map((o) => o.value),
  defaultMetric: MC_FIELD,
  weightField: MC_FIELD,
  weightLabel: 'vốn hoá',
  maxWeight: LIQUIDITY_MAX_WEIGHT,
  defaultGroups: [
    { count: DEFAULT_GROUP1_COUNT, keys: [MC_FIELD] },
    { count: DEFAULT_GROUP2_COUNT, keys: [PV_FIELD] },
  ],
  defaultSortKey: MC_FIELD,
  // Dòng cổ phiếu dùng `netuid` = ticker làm định danh chung của app.
  columnLabels: { netuid: 'ticker' },
  tierFields: { primary: MC_FIELD, secondary: PV_FIELD },
  tierNames: { primary: 'vốn hoá', secondary: 'giá trị giao dịch' },
  tiers: STOCK_TIERS,
  priceDigits: 2,
};

export const ASSET_PROFILES: Record<AssetKey, AssetProfile> = {
  alpha: ALPHA_PROFILE,
  stock: STOCK_PROFILE,
};

/** Thứ tự hiển thị trên công tắc mục đầu tư. */
export const ASSET_KEYS: readonly AssetKey[] = ['alpha', 'stock'];

export const DEFAULT_ASSET: AssetKey = 'alpha';

/** Profile tương ứng với key '_' của một danh mục (không phải 1 → alpha). */
export function profileForAssetClass(assetClass: unknown): AssetProfile {
  return assetClass === US_STOCK_ASSET_CLASS ? STOCK_PROFILE : ALPHA_PROFILE;
}

/** Định danh hiển thị: "#12" cho subnet, "NVDA" cho cổ phiếu. */
export function formatAssetId(profile: AssetProfile, id: string | number): string {
  return `${profile.idPrefix}${id}`;
}
