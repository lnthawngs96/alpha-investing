import type { AssetKey, MetricKey, SavedPortfolioRecord, SubnetRow, TabKey, WeightMap } from '@/types';
import { DD_TRIGGER, SAFE_DEDUPE_DISTANCE } from '@/constants/portfolio';
import { ASSET_KEYS, ASSET_PROFILES, profileForAssetClass } from '@/constants/assets';
import { TAB_KEYS } from '@/constants/tabs';
import { buildColumns, filterExcludedSubnets, getMetricValue, getTopNByChange } from '@/utils/subnetData';
import { toNumber } from '@/utils/numeric';
import { withAssetClass } from '@/utils/portfolioMath';
import { checkDedupe } from '@/utils/portfolioValidation';
import { useWebMCPTools, useLatest } from './useWebMCP';
import { describePortfolio, localizeForAsset, type PortfolioReport } from './portfolioOps';

/** Kết quả tải lại bảng cổ phiếu Mỹ (xem App.reloadStockData). */
export interface StockReloadResult {
  total: number;
  loaded: number;
  cashEtfs: string[];
}

/** Kết quả tải lại bảng Alpha từ TaoMarketCap. */
export interface AlphaReloadResult {
  total: number;
  loaded: number;
  deregIds: number[];
}

export interface DataToolsDeps {
  /** Mục đầu tư đang xem: tool tra cứu / kiểm tra dedupe chạy trên mục này. */
  asset: AssetKey;
  setAsset: (asset: AssetKey) => void;
  /** Bảng cổ phiếu Mỹ (đã loại cash ETFs). */
  stockData: SubnetRow[];
  reloadStockData: () => Promise<StockReloadResult>;
  /** Tải lại bảng Alpha (TaoMarketCap + dereg). */
  reloadAlphaData: () => Promise<AlphaReloadResult>;
  allData: SubnetRow[];
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  onSubmitData: (data: SubnetRow[], deregIds?: number[]) => void;
  onClearData: () => void;
  savedPortfolios: SavedPortfolioRecord[];
  deleteSaved: (idx: number) => void;
  renameSaved: (idx: number, name: string) => void;
}

/**
 * Tool ở cấp App: nạp dữ liệu, tra cứu bảng, điều hướng tab, quản lý danh mục
 * đã lưu. Đăng ký tại App vì đây là nơi giữ allData + context danh mục đã lưu,
 * nên các tool này luôn tồn tại bất kể người dùng đang mở tab nào.
 */
export function useDataTools(deps: DataToolsDeps): void {
  const state = useLatest(deps);
  const profile = ASSET_PROFILES[deps.asset];
  const METRIC_KEYS = profile.metricKeys;
  const L = (text: string) => localizeForAsset(profile, text);
  /** Bảng dữ liệu của mục đầu tư đang xem. */
  const activeData = () => (state.current.asset === 'stock' ? state.current.stockData : state.current.allData);

  useWebMCPTools([
    {
      name: 'load_subnet_data',
      description:
        'Nạp bảng dữ liệu subnet Bittensor vào app (thường không cần — app tự tải từ TaoMarketCap). Nhận một mảng object, mỗi object là một subnet với ít nhất trường netuid, thường kèm name, price, emission, liquidity, price_change_1_hour/1_day/1_week/1_month, fear_and_greed_index. Tuỳ chọn truyền dereg: mảng netuid (vd [84]) — các subnet đó sẽ bị loại khỏi bảng. Subnet 0 và danh sách loại trừ cố định cũng tự động bị bỏ.',
      inputSchema: {
        type: 'object',
        properties: {
          subnets: {
            type: 'array',
            description: 'Mảng object subnet. Mỗi phần tử cần có netuid.',
            items: { type: 'object' },
          },
          dereg: {
            type: 'array',
            description: 'Mảng netuid sẽ bị loại khỏi bảng, ví dụ [84]. Bỏ trống để giữ dereg đang có từ API.',
            items: { type: 'number' },
          },
        },
        required: ['subnets'],
      },
      execute: async ({ subnets, dereg }: { subnets: SubnetRow[]; dereg?: number[] }) => {
        if (!Array.isArray(subnets) || !subnets.length) {
          throw new Error('Cần một mảng object subnet không rỗng.');
        }
        if (typeof subnets[0] !== 'object' || subnets[0] === null) {
          throw new Error('Mỗi phần tử phải là object, ví dụ { "netuid": 1, "name": "apex" }.');
        }
        const deregIds = Array.isArray(dereg)
          ? dereg.map((id, i) => {
              const n = Number(id);
              if (!Number.isFinite(n)) throw new Error(`dereg[${i}] không phải số hợp lệ`);
              return n;
            })
          : undefined;
        state.current.onSubmitData(subnets, deregIds);
        state.current.setAsset('alpha');
        state.current.setActiveTab('table');
        const effectiveDereg = deregIds ?? [];
        const loaded = filterExcludedSubnets(subnets, effectiveDereg).length;
        return {
          submitted: subnets.length,
          loaded,
          removed_by_dereg: subnets.length - loaded,
          dereg: effectiveDereg,
          fields: buildColumns(subnets),
          log:
            effectiveDereg.length > 0
              ? `Nạp ${loaded}/${subnets.length} subnet (dereg: ${effectiveDereg.join(', ')})`
              : `Nạp ${loaded} subnet vào bảng dữ liệu`,
        };
      },
    },

    {
      name: 'get_app_state',
      description:
        'Xem trạng thái hiện tại của app: mục đầu tư đang xem (alpha / stock — cổ phiếu Mỹ), đã nạp bao nhiêu subnet và bao nhiêu mã cổ phiếu, các trường dữ liệu có sẵn của mục đang xem, tab đang mở, số danh mục đã lưu. Gọi tool này trước khi làm gì khác để biết app đang ở đâu.',
      annotations: { readOnlyHint: true },
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { allData, stockData, asset, activeTab: tab, savedPortfolios: saved } = state.current;
        const data = activeData();
        const savedInAsset = saved.filter((s) => profileForAssetClass(s.portfolio?._).key === asset).length;
        return {
          active_asset: asset,
          subnets_loaded: allData.length,
          stocks_loaded: stockData.length,
          available_fields: buildColumns(data),
          sortable_metrics: METRIC_KEYS,
          active_tab: tab,
          saved_portfolios: saved.length,
          saved_portfolios_in_active_asset: savedInAsset,
          log:
            asset === 'alpha'
              ? `Đọc trạng thái app (${allData.length} subnet, tab "${tab}")`
              : `Đọc trạng thái app (cổ phiếu Mỹ: ${stockData.length} mã, tab "${tab}")`,
        };
      },
    },

    {
      name: 'query_subnets',
      description:
        profile.key === 'alpha'
          ? 'Xếp hạng các subnet đã nạp theo một chỉ số và trả về top N. Dùng để khảo sát dữ liệu trước khi quyết định tiêu chí tạo danh mục. Subnet 0 luôn bị loại.'
          : 'Xếp hạng các mã cổ phiếu Mỹ đã tải (đã loại cash ETFs) theo một chỉ số và trả về top N. Dùng để khảo sát dữ liệu trước khi quyết định tiêu chí tạo danh mục.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: METRIC_KEYS,
            description: 'Chỉ số dùng để xếp hạng, giảm dần.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 128,
            description: L('Số subnet trả về. Mặc định 20.'),
          },
        },
        required: ['metric'],
      },
      execute: async ({ metric, limit = 20 }: { metric: MetricKey; limit?: number }) => {
        const data = activeData();
        if (!data.length) {
          throw new Error(
            profile.key === 'alpha'
              ? 'Chưa có dữ liệu. Gọi load_subnet_data trước.'
              : 'Chưa có dữ liệu cổ phiếu. Gọi reload_stock_data trước.'
          );
        }
        if (!METRIC_KEYS.includes(metric)) {
          throw new Error(`metric phải là một trong: ${METRIC_KEYS.join(', ')}`);
        }
        const rows = getTopNByChange(data, limit, metric);
        return {
          metric,
          count: rows.length,
          subnets: rows.map((r) =>
            profile.key === 'alpha'
              ? {
                  netuid: Number(r.netuid),
                  name: r.name,
                  value: getMetricValue(r, metric),
                  price: r.price !== undefined ? toNumber(r.price) : undefined,
                  liquidity: r.liquidity !== undefined ? toNumber(r.liquidity) : undefined,
                }
              : {
                  ticker: String(r.netuid),
                  name: r.name,
                  sector: r.sector,
                  value: getMetricValue(r, metric),
                  price: r.price !== undefined ? toNumber(r.price) : undefined,
                  mc: r.mc !== undefined ? toNumber(r.mc) : undefined,
                }
          ),
          log: L(`Truy vấn top ${rows.length} subnet theo ${metric}`),
        };
      },
    },

    {
      name: 'switch_tab',
      description:
        'Chuyển tab đang hiển thị: "table" (bảng dữ liệu), "portfolio" (tạo danh mục), "saved" (danh mục đã lưu). Dùng để người dùng nhìn thấy đúng phần mà agent đang thao tác.',
      inputSchema: {
        type: 'object',
        properties: { tab: { type: 'string', enum: TAB_KEYS } },
        required: ['tab'],
      },
      execute: async ({ tab }: { tab: TabKey }) => {
        if (!TAB_KEYS.includes(tab)) throw new Error(`tab phải là một trong: ${TAB_KEYS.join(', ')}`);
        state.current.setActiveTab(tab);
        return { active_tab: tab, log: `Chuyển sang tab "${tab}"` };
      },
    },

    {
      name: 'list_saved_portfolios',
      description:
        'Liệt kê các danh mục đã lưu (cả alpha lẫn cổ phiếu Mỹ) kèm chỉ số (index), mục đầu tư (asset), tên, thời điểm lưu, số subnet / mã và tổng phân bổ. Index trả về ở đây dùng cho rename_saved_portfolio và delete_saved_portfolio.',
      annotations: { readOnlyHint: true },
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { savedPortfolios: saved } = state.current;
        return {
          count: saved.length,
          portfolios: saved.map((s, i) => {
            const entries = Object.entries(s.portfolio || {}).filter(([k]) => k !== '_');
            return {
              index: i,
              asset: profileForAssetClass(s.portfolio?._).key,
              name: s.name || `(chưa đặt tên) #${i}`,
              saved_at: s.savedAt,
              subnet_count: entries.length,
              // Tổng |phân bổ| — cổ phiếu Mỹ có thể short (giá trị âm).
              total_allocation: +entries.reduce((a, [, v]) => a + Math.abs(Number(v)), 0).toFixed(6),
            };
          }),
          log: `Liệt kê ${saved.length} danh mục đã lưu`,
        };
      },
    },

    {
      name: 'rename_saved_portfolio',
      description: 'Đổi tên một danh mục đã lưu theo index lấy từ list_saved_portfolios.',
      inputSchema: {
        type: 'object',
        properties: {
          index: { type: 'integer', minimum: 0 },
          name: { type: 'string', description: 'Tên mới.' },
        },
        required: ['index', 'name'],
      },
      execute: async ({ index, name }: { index: number; name: string }) => {
        const { savedPortfolios: saved, renameSaved } = state.current;
        if (index < 0 || index >= saved.length) {
          throw new Error(`index ${index} không tồn tại (có ${saved.length} danh mục).`);
        }
        if (!String(name).trim()) throw new Error('Tên không được rỗng.');
        renameSaved(index, name);
        return { index, name, log: `Đổi tên danh mục #${index} thành "${name}"` };
      },
    },

    {
      name: 'delete_saved_portfolio',
      description:
        'Xoá một danh mục đã lưu theo index. Thao tác này ghi một bản chụp vào lịch sử nên vẫn khôi phục được từ giao diện, nhưng vẫn nên xác nhận với người dùng trước khi gọi.',
      inputSchema: {
        type: 'object',
        properties: { index: { type: 'integer', minimum: 0 } },
        required: ['index'],
      },
      execute: async ({ index }: { index: number }) => {
        const { savedPortfolios: saved, deleteSaved } = state.current;
        if (index < 0 || index >= saved.length) {
          throw new Error(`index ${index} không tồn tại (có ${saved.length} danh mục).`);
        }
        const label = saved[index]?.name || `#${index}`;
        deleteSaved(index);
        return { deleted_index: index, remaining: saved.length - 1, log: `Xoá danh mục "${label}"` };
      },
    },

    {
      name: 'check_dedupe',
      description:
        'Kiểm tra một bảng phân bổ bất kỳ (của mục đầu tư đang xem) có bị mạng Subnet 88 coi là trùng lặp với các danh mục đã lưu cùng mục hay không. Khoảng cách Euclid giữa hai vector phân bổ đã chuẩn hoá L1 nhỏ hơn ngưỡng 0.01 sẽ bị phạt điểm nặng. Dùng để thẩm định một phương án trước khi áp vào danh mục đang dựng.',
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: 'object',
        properties: {
          allocations: {
            type: 'object',
            description:
              profile.key === 'alpha'
                ? 'Map netuid → tỷ trọng, ví dụ { "4": 0.05, "8": 0.03 }. Tỷ trọng là phân số, tổng ≤ 1.'
                : 'Map ticker → tỷ trọng, ví dụ { "NVDA": 0.05, "AAPL": 0.03 }. Tỷ trọng là phân số (âm = short), tổng |tỷ trọng| ≤ 1.',
            additionalProperties: { type: 'number' },
          },
        },
        required: ['allocations'],
      },
      execute: async ({ allocations }: { allocations: WeightMap }) => {
        const { savedPortfolios: saved } = state.current;
        if (!allocations || typeof allocations !== 'object') {
          throw new Error(L('Cần map netuid → tỷ trọng.'));
        }
        const candidate = withAssetClass(allocations, profile.assetClass);
        const result = checkDedupe(candidate, saved);
        return {
          ...(describePortfolio(candidate, saved) as PortfolioReport).dedupe,
          verdict:
            result.ok && (result.minDist === null || result.minDist >= SAFE_DEDUPE_DISTANCE)
              ? 'an toàn'
              : result.ok
                ? `sát ngưỡng (${result.minDist} — nên đạt ≥ ${SAFE_DEDUPE_DISTANCE.toFixed(6)})`
                : `sẽ bị dedupe (${result.minDist} < ${DD_TRIGGER})`,
          log: `Kiểm tra dedupe: khoảng cách nhỏ nhất ${result.minDist}`,
        };
      },
    },

    {
      name: 'switch_asset',
      description:
        'Chuyển mục đầu tư đang xem: "alpha" (Tao/Alpha — subnet, asset class 0) hoặc "stock" (cổ phiếu Mỹ — ticker, asset class 1). Bảng dữ liệu, Portfolio gen, danh mục đã lưu và các tool generate_portfolio / set_allocation / … đều chạy trên mục đang xem.',
      inputSchema: {
        type: 'object',
        properties: { asset: { type: 'string', enum: ASSET_KEYS } },
        required: ['asset'],
      },
      execute: async ({ asset }: { asset: AssetKey }) => {
        if (!ASSET_KEYS.includes(asset)) throw new Error(`asset phải là một trong: ${ASSET_KEYS.join(', ')}`);
        state.current.setAsset(asset);
        return { active_asset: asset, log: `Chuyển sang mục "${ASSET_PROFILES[asset].label}"` };
      },
    },

    {
      name: 'reload_stock_data',
      description:
        'Tải lại bảng cổ phiếu Mỹ từ api.investing88.ai/assets (ticker, name, sector, price, volume, pv = price × volume, mc = vốn hoá). Cash ETFs trong cùng trang được loại khỏi bảng (mạng tính chúng như tiền mặt). Dữ liệu này tự tải khi mở app, không cần dán tay.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const result = await state.current.reloadStockData();
        return {
          ...result,
          removed_cash_etfs: result.total - result.loaded,
          log: `Tải ${result.loaded}/${result.total} mã cổ phiếu Mỹ (loại ${result.total - result.loaded} cash ETF)`,
        };
      },
    },

    {
      name: 'reload_alpha_data',
      description:
        'Tải lại bảng Alpha từ TaoMarketCap SSE (netuid, name, price, emission, liquidity/TAO, price_change_1_hour/1_day/1_week/1_month) và dereg list từ api.investing88.ai/assets. Dữ liệu này tự tải khi mở app, không cần dán JSON.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const result = await state.current.reloadAlphaData();
        state.current.setAsset('alpha');
        state.current.setActiveTab('table');
        return {
          ...result,
          removed: result.total - result.loaded,
          log: `Tải ${result.loaded}/${result.total} subnet Alpha (loại ${result.total - result.loaded}; dereg: ${result.deregIds.join(', ') || '—'})`,
        };
      },
    },
  ], deps.asset);
}
