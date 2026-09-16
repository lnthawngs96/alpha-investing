import type { MetricKey, Portfolio, SaveResult, SavedPortfolioRecord, Selection, SubnetRow } from '@/types';
import { DD_TRIGGER, METRIC_KEYS, SAFE_DEDUPE_DISTANCE, TOP_N_MAX } from '@/constants/portfolio';
import type { SplitMode } from '@/constants/editor';
import {
  allocateWeightsForNewSubnets,
  normalizeToOne,
  rebalancePortfolioSafe,
  redistributeRemovedWeights,
  stripAssetClass,
  withAssetClass,
} from '@/utils/portfolioMath';
import { dedupeDistance } from '@/utils/portfolioValidation';
import { buildNameMap } from '@/utils/subnetData';
import { useWebMCPTools, useLatest } from './useWebMCP';
import { describePortfolio } from './portfolioOps';

/** Một nhóm tiêu chí theo cách agent gọi (metric + count). */
interface AgentSelection {
  metric: MetricKey;
  count: number;
}

const selectionSchema = {
  type: 'object',
  properties: {
    metric: { type: 'string', enum: METRIC_KEYS },
    count: { type: 'integer', minimum: 1, maximum: TOP_N_MAX },
  },
  required: ['metric', 'count'],
} as const;

export interface PortfolioToolsDeps {
  allData: SubnetRow[];
  savedPortfolios: SavedPortfolioRecord[];
  portfolio: Portfolio | null;
  applyPortfolio: (next: Portfolio) => void;
  generate: (selections: [Selection, Selection]) => Portfolio | null;
  save: (name?: string) => SaveResult;
}

/**
 * Tool ở cấp Portfolio: dựng và tinh chỉnh danh mục đang làm việc.
 * Mọi tool sửa danh mục đều trả về báo cáo đầy đủ (hợp lệ + tình trạng dedupe)
 * để agent thấy ngay hậu quả và tự quyết bước tiếp theo, thay vì phải gọi thêm
 * một tool kiểm tra rồi mới biết vừa làm hỏng gì.
 */
export function usePortfolioTools(deps: PortfolioToolsDeps): void {
  const state = useLatest(deps);

  const nameMap = () => buildNameMap(state.current.allData);

  const requirePortfolio = (): Portfolio => {
    const p = state.current.portfolio;
    if (!p) throw new Error('Chưa có danh mục nào. Gọi generate_portfolio trước.');
    return p;
  };

  const report = (p: Portfolio, extra: Record<string, unknown> = {}) => ({
    ...describePortfolio(p, state.current.savedPortfolios, nameMap()),
    ...extra,
  });

  useWebMCPTools([
    {
      name: 'generate_portfolio',
      description:
        'Dựng một danh mục mới từ hai nhóm tiêu chí. Mỗi nhóm chọn top N subnet theo một chỉ số; hai nhóm được gộp lại và loại trùng (nhóm sau lấy subnet kế tiếp nếu bị trùng với nhóm trước). Danh mục cuối được phân bổ giảm dần theo thanh khoản, trần 5% mỗi subnet, tổng bằng 1. Thao tác này ghi đè danh mục đang dựng. Nếu tab hiện tại không phải "portfolio" (xem active_tab từ get_app_state), gọi switch_tab("portfolio") trước hoặc ngay sau khi gọi tool này, để người dùng nhìn thấy danh mục đang được dựng thay vì màn hình cũ.',
      inputSchema: {
        type: 'object',
        properties: {
          group1: { ...selectionSchema, description: 'Nhóm neo, thường là thanh khoản.' },
          group2: { ...selectionSchema, description: 'Nhóm bổ sung, thường là tăng trưởng.' },
        },
        required: ['group1', 'group2'],
      },
      execute: async ({ group1, group2 }: { group1: AgentSelection; group2: AgentSelection }) => {
        const { allData: data } = state.current;
        if (!data.length) throw new Error('Chưa có dữ liệu. Gọi load_subnet_data trước.');
        for (const [label, g] of [
          ['group1', group1],
          ['group2', group2],
        ] as const) {
          if (!g || !METRIC_KEYS.includes(g.metric)) {
            throw new Error(`${label}.metric phải là một trong: ${METRIC_KEYS.join(', ')}`);
          }
        }
        if (group1.metric === group2.metric) {
          throw new Error('Hai nhóm phải dùng hai chỉ số khác nhau.');
        }
        const next = state.current.generate([
          { changeKey: group1.metric, n: group1.count },
          { changeKey: group2.metric, n: group2.count },
        ]);
        if (!next) throw new Error('Không dựng được danh mục từ tiêu chí này.');
        return report(next, {
          log: `Dựng danh mục: top ${group1.count} ${group1.metric} + top ${group2.count} ${group2.metric}`,
        });
      },
    },

    {
      name: 'get_current_portfolio',
      description:
        'Đọc danh mục đang dựng: từng subnet với tỷ trọng, tổng phân bổ, phần tiền mặt còn lại, kết quả kiểm tra hợp lệ và khoảng cách dedupe tới các danh mục đã lưu.',
      annotations: { readOnlyHint: true },
      inputSchema: { type: 'object', properties: {} },
      execute: async () => report(requirePortfolio(), { log: 'Đọc danh mục hiện tại' }),
    },

    {
      name: 'set_allocation',
      description:
        'Đặt tỷ trọng cho một subnet đã có trong danh mục. Các subnet còn lại được co giãn theo tỷ lệ để tổng vẫn bằng 1. Dùng khi cần nhấn mạnh hoặc giảm bớt một subnet cụ thể.',
      inputSchema: {
        type: 'object',
        properties: {
          netuid: { type: 'integer', minimum: 1 },
          weight: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Tỷ trọng mục tiêu dạng phân số, ví dụ 0.04 nghĩa là 4%.',
          },
        },
        required: ['netuid', 'weight'],
      },
      execute: async ({ netuid, weight }: { netuid: number; weight: number }) => {
        const current = requirePortfolio();
        const key = String(netuid);
        const base = stripAssetClass(current);
        if (!(key in base)) {
          throw new Error(`Subnet ${netuid} không có trong danh mục. Dùng add_subnets để thêm.`);
        }
        if (weight >= 1) throw new Error('weight phải nhỏ hơn 1 để còn chỗ cho subnet khác.');

        const others = Object.entries(base).filter(([k]) => k !== key);
        const othersSum = others.reduce((a, [, v]) => a + v, 0);
        const remaining = 1 - weight;
        const next: Record<string, number> = { [key]: weight };
        if (othersSum > 0) {
          others.forEach(([k, v]) => {
            next[k] = +((v / othersSum) * remaining).toFixed(6);
          });
        }
        const applied = withAssetClass(normalizeToOne(next));
        state.current.applyPortfolio(applied);
        return report(applied, {
          log: `Đặt subnet ${netuid} = ${(weight * 100).toFixed(2)}%`,
        });
      },
    },

    {
      name: 'remove_subnets',
      description:
        'Bỏ một hoặc nhiều subnet khỏi danh mục. Tổng tỷ trọng của các subnet bị bỏ được chia đều cho các subnet còn lại, hoặc chỉ cho những subnet được chỉ định trong receivers.',
      inputSchema: {
        type: 'object',
        properties: {
          netuids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Danh sách netuid cần bỏ.',
          },
          receivers: {
            type: 'array',
            items: { type: 'integer' },
            description:
              'Tuỳ chọn. Chỉ những subnet này nhận lại phần tỷ trọng vừa giải phóng. Bỏ trống thì chia đều cho tất cả subnet còn lại.',
          },
        },
        required: ['netuids'],
      },
      execute: async ({ netuids, receivers }: { netuids: number[]; receivers?: number[] }) => {
        const current = requirePortfolio();
        const base = stripAssetClass(current);
        const missing = netuids.filter((id) => !(String(id) in base));
        if (missing.length) {
          throw new Error(`Subnet không có trong danh mục: ${missing.join(', ')}`);
        }
        if (netuids.length >= Object.keys(base).length) {
          throw new Error('Không thể bỏ toàn bộ subnet trong danh mục.');
        }
        const { weights } = redistributeRemovedWeights(
          base,
          netuids.map(String),
          receivers ? receivers.map(String) : null
        );
        const applied = withAssetClass(normalizeToOne(weights));
        state.current.applyPortfolio(applied);
        return report(applied, { log: `Bỏ ${netuids.length} subnet: ${netuids.join(', ')}` });
      },
    },

    {
      name: 'add_subnets',
      description:
        'Thêm subnet mới vào danh mục. Tỷ trọng cấp cho subnet mới được lấy bớt từ các subnet đang có tỷ trọng lớn nhất: mỗi subnet trong top_n nhả ra take_ratio phần tỷ trọng của chính nó. Phần thu được chia cho các subnet mới theo thứ tự truyền vào, giảm dần (netuid đầu tiên nhận nhiều nhất) hoặc chia đều.',
      inputSchema: {
        type: 'object',
        properties: {
          netuids: {
            type: 'array',
            items: { type: 'integer' },
            description: 'Netuid cần thêm, xếp theo mức ưu tiên giảm dần.',
          },
          top_n: {
            type: 'integer',
            minimum: 1,
            description: 'Số subnet lớn nhất bị lấy bớt tỷ trọng. Mặc định 10.',
          },
          take_ratio: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Tỷ lệ tỷ trọng mà mỗi subnet cho đi phải nhả ra. Mặc định 0.1.',
          },
          mode: { type: 'string', enum: ['decreasing', 'equal'] },
        },
        required: ['netuids'],
      },
      execute: async ({
        netuids,
        top_n = 10,
        take_ratio = 0.1,
        mode = 'decreasing',
      }: {
        netuids: number[];
        top_n?: number;
        take_ratio?: number;
        mode?: SplitMode;
      }) => {
        const current = requirePortfolio();
        const { allData: data } = state.current;
        const known = new Set(data.map((r) => String(r.netuid)));
        const unknown = netuids.filter((id) => !known.has(String(id)));
        if (unknown.length) {
          throw new Error(
            `Subnet chưa có trong dữ liệu đã nạp: ${unknown.join(', ')}. Nạp dữ liệu chứa các subnet này trước, nếu không sẽ thiếu giá mua vào khi lưu.`
          );
        }
        const base = stripAssetClass(current);
        const fresh = netuids.filter((id) => !(String(id) in base));
        if (!fresh.length) throw new Error('Tất cả subnet này đã có trong danh mục.');

        const { weights } = allocateWeightsForNewSubnets(base, fresh.map(String), {
          topN: top_n,
          takeRatio: take_ratio,
          mode,
        });
        const applied = withAssetClass(normalizeToOne(weights));
        state.current.applyPortfolio(applied);
        return report(applied, { log: `Thêm subnet: ${fresh.join(', ')}` });
      },
    },

    {
      name: 'escape_dedupe',
      description:
        'Xáo lại tỷ trọng cho tới khi danh mục đủ khác biệt so với mọi danh mục đã lưu, để không bị cơ chế chống sao chép của Subnet 88 phạt điểm. Biên độ nhiễu được tăng dần cho tới khi khoảng cách vượt ngưỡng an toàn. Thành phần subnet giữ nguyên, chỉ tỷ trọng thay đổi. Gọi tool này khi get_current_portfolio hoặc save_portfolio báo danh mục bị trùng lặp.',
      inputSchema: {
        type: 'object',
        properties: {
          min_distance: {
            type: 'number',
            description: `Khoảng cách tối thiểu cần đạt. Mặc định ${SAFE_DEDUPE_DISTANCE.toFixed(6)} (ngưỡng phạt là ${DD_TRIGGER}, cộng thêm biên an toàn).`,
          },
        },
      },
      execute: async ({ min_distance = SAFE_DEDUPE_DISTANCE }: { min_distance?: number }) => {
        const current = requirePortfolio();
        const { savedPortfolios: saved } = state.current;
        const result = rebalancePortfolioSafe(current, saved, min_distance, dedupeDistance);
        state.current.applyPortfolio(result.portfolio);
        if (!result.ok) {
          return report(result.portfolio, {
            escaped: false,
            achieved_distance: result.minDist,
            hint: 'Không đạt được khoảng cách yêu cầu chỉ bằng cách đổi tỷ trọng. Danh mục có thể có quá ít subnet — thêm subnet bằng add_subnets rồi thử lại.',
            log: `Xáo tỷ trọng nhưng chưa thoát dedupe (đạt ${result.minDist})`,
          });
        }
        return report(result.portfolio, {
          escaped: true,
          achieved_distance: result.minDist,
          log: `Thoát dedupe: khoảng cách đạt ${result.minDist}`,
        });
      },
    },

    {
      name: 'save_portfolio',
      description:
        'Lưu danh mục đang dựng vào danh sách đã lưu. Sẽ bị từ chối nếu danh mục không hợp lệ theo luật Tao/Alpha hoặc bị coi là trùng lặp với một danh mục đã lưu — trong trường hợp trùng lặp, gọi escape_dedupe rồi lưu lại.',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Tên đặt cho danh mục. Nên có để dễ tra cứu sau này.' },
        },
      },
      execute: async ({ name }: { name?: string }) => {
        requirePortfolio();
        const result = state.current.save(name);
        if (!result.ok) throw new Error(result.message);
        return {
          saved: true,
          name: result.name,
          total_saved: result.total,
          log: `Lưu danh mục "${result.name}"`,
        };
      },
    },
  ]);
}
