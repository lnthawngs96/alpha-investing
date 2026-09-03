import { useWebMCPTools, useLatest } from './useWebMCP';
import { getTopNByChange, buildColumns } from '../utils/helpers';
import { CHANGE_OPTIONS, checkDedupe, DD_TRIGGER } from '../utils/portfolio';
import { describePortfolio, SAFE_DEDUPE_DISTANCE, withAssetClass } from './portfolioOps';

const METRICS = CHANGE_OPTIONS.map((o) => o.value);
const TABS = ['table', 'portfolio', 'saved'];

// Tool ở cấp App: nạp dữ liệu, tra cứu bảng, điều hướng tab, quản lý danh mục
// đã lưu. Đăng ký tại App vì đây là nơi giữ allData + context danh mục đã lưu,
// nên các tool này luôn tồn tại bất kể người dùng đang mở tab nào.
export function useDataTools({
  allData,
  activeTab,
  setActiveTab,
  onSubmitData,
  onClearData,
  savedPortfolios,
  deleteSaved,
  renameSaved,
}) {
  const state = useLatest({
    allData,
    activeTab,
    setActiveTab,
    onSubmitData,
    onClearData,
    savedPortfolios,
    deleteSaved,
    renameSaved,
  });

  useWebMCPTools([
    {
      name: 'load_subnet_data',
      description:
        'Nạp bảng dữ liệu subnet Bittensor vào app. Nhận một mảng object, mỗi object là một subnet với ít nhất trường netuid, thường kèm name, price, emission, liquidity, price_change_1_day/1_week/1_month. Agent có thể lấy dữ liệu này từ nguồn bên ngoài rồi nạp vào đây thay cho việc người dùng dán tay. Subnet 0 và các subnet trong danh sách loại trừ sẽ tự động bị bỏ.',
      inputSchema: {
        type: 'object',
        properties: {
          subnets: {
            type: 'array',
            description: 'Mảng object subnet. Mỗi phần tử cần có netuid.',
            items: { type: 'object' },
          },
        },
        required: ['subnets'],
      },
      execute: async ({ subnets }) => {
        if (!Array.isArray(subnets) || !subnets.length) {
          throw new Error('Cần một mảng object subnet không rỗng.');
        }
        if (typeof subnets[0] !== 'object' || subnets[0] === null) {
          throw new Error('Mỗi phần tử phải là object, ví dụ { "netuid": 1, "name": "apex" }.');
        }
        state.current.onSubmitData(subnets);
        state.current.setActiveTab('table');
        return {
          loaded: subnets.length,
          fields: buildColumns(subnets),
          log: `Nạp ${subnets.length} subnet vào bảng dữ liệu`,
        };
      },
    },

    {
      name: 'get_app_state',
      description:
        'Xem trạng thái hiện tại của app: đã nạp bao nhiêu subnet, các trường dữ liệu có sẵn, tab đang mở, số danh mục đã lưu. Gọi tool này trước khi làm gì khác để biết app đang ở đâu.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { allData: data, activeTab: tab, savedPortfolios: saved } = state.current;
        return {
          subnets_loaded: data.length,
          available_fields: buildColumns(data),
          sortable_metrics: METRICS,
          active_tab: tab,
          saved_portfolios: saved.length,
          log: `Đọc trạng thái app (${data.length} subnet, tab "${tab}")`,
        };
      },
    },

    {
      name: 'query_subnets',
      description:
        'Xếp hạng các subnet đã nạp theo một chỉ số và trả về top N. Dùng để khảo sát dữ liệu trước khi quyết định tiêu chí tạo danh mục. Subnet 0 luôn bị loại.',
      inputSchema: {
        type: 'object',
        properties: {
          metric: {
            type: 'string',
            enum: METRICS,
            description: 'Chỉ số dùng để xếp hạng, giảm dần.',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 128,
            description: 'Số subnet trả về. Mặc định 20.',
          },
        },
        required: ['metric'],
      },
      execute: async ({ metric, limit = 20 }) => {
        const { allData: data } = state.current;
        if (!data.length) throw new Error('Chưa có dữ liệu. Gọi load_subnet_data trước.');
        if (!METRICS.includes(metric)) {
          throw new Error(`metric phải là một trong: ${METRICS.join(', ')}`);
        }
        const rows = getTopNByChange(data, limit, metric);
        return {
          metric,
          count: rows.length,
          subnets: rows.map((r) => ({
            netuid: Number(r.netuid),
            name: r.name,
            value: parseFloat(r[metric]),
            price: r.price !== undefined ? parseFloat(r.price) : undefined,
            liquidity: r.liquidity !== undefined ? parseFloat(r.liquidity) : undefined,
          })),
          log: `Truy vấn top ${rows.length} subnet theo ${metric}`,
        };
      },
    },

    {
      name: 'switch_tab',
      description:
        'Chuyển tab đang hiển thị: "table" (bảng dữ liệu), "portfolio" (tạo danh mục), "saved" (danh mục đã lưu). Dùng để người dùng nhìn thấy đúng phần mà agent đang thao tác.',
      inputSchema: {
        type: 'object',
        properties: { tab: { type: 'string', enum: TABS } },
        required: ['tab'],
      },
      execute: async ({ tab }) => {
        if (!TABS.includes(tab)) throw new Error(`tab phải là một trong: ${TABS.join(', ')}`);
        state.current.setActiveTab(tab);
        return { active_tab: tab, log: `Chuyển sang tab "${tab}"` };
      },
    },

    {
      name: 'list_saved_portfolios',
      description:
        'Liệt kê các danh mục đã lưu kèm chỉ số (index), tên, thời điểm lưu, số subnet và tổng phân bổ. Index trả về ở đây dùng cho rename_saved_portfolio và delete_saved_portfolio.',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => {
        const { savedPortfolios: saved } = state.current;
        return {
          count: saved.length,
          portfolios: saved.map((s, i) => {
            const entries = Object.entries(s.portfolio || {}).filter(([k]) => k !== '_');
            return {
              index: i,
              name: s.name || `(chưa đặt tên) #${i}`,
              saved_at: s.savedAt,
              subnet_count: entries.length,
              total_allocation: +entries.reduce((a, [, v]) => a + Number(v), 0).toFixed(6),
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
      execute: async ({ index, name }) => {
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
      execute: async ({ index }) => {
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
        'Kiểm tra một bảng phân bổ bất kỳ có bị mạng Subnet 88 coi là trùng lặp với các danh mục đã lưu hay không. Khoảng cách Euclid giữa hai vector phân bổ đã chuẩn hoá L1 nhỏ hơn ngưỡng 0.01 sẽ bị phạt điểm nặng. Dùng để thẩm định một phương án trước khi áp vào danh mục đang dựng.',
      inputSchema: {
        type: 'object',
        properties: {
          allocations: {
            type: 'object',
            description:
              'Map netuid → tỷ trọng, ví dụ { "4": 0.05, "8": 0.03 }. Tỷ trọng là phân số, tổng ≤ 1.',
            additionalProperties: { type: 'number' },
          },
        },
        required: ['allocations'],
      },
      execute: async ({ allocations }) => {
        const { savedPortfolios: saved } = state.current;
        if (!allocations || typeof allocations !== 'object') {
          throw new Error('Cần map netuid → tỷ trọng.');
        }
        const candidate = withAssetClass(allocations);
        const result = checkDedupe(candidate, saved);
        return {
          ...describePortfolio(candidate, saved).dedupe,
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
  ]);
}
