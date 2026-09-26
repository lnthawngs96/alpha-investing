import type { AssetProfile, MetricKey, Portfolio, SaveResult, SavedPortfolioRecord, Selection, SubnetRow } from '@/types';
import { DD_TRIGGER, SAFE_DEDUPE_DISTANCE, TOP_N_MAX } from '@/constants/portfolio';
import { ALPHA_PROFILE } from '@/constants/assets';
import type { SplitMode } from '@/constants/editor';
import { tt } from '@/i18n';
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
import { describePortfolio, localizeForAsset } from './portfolioOps';

/** Một nhóm tiêu chí theo cách agent gọi (một hoặc nhiều metric + count). */
interface AgentSelection {
  /** Một chỉ số (tương thích cũ) hoặc mảng chỉ số trong cùng nhóm. */
  metric?: MetricKey;
  metrics?: MetricKey[];
  count: number;
}

function selectionSchemaFor(metricKeys: readonly MetricKey[]) {
  return {
    type: 'object',
    properties: {
      metric: { type: 'string', enum: metricKeys, description: 'Một chỉ số (tương thích).' },
      metrics: {
        type: 'array',
        items: { type: 'string', enum: metricKeys },
        minItems: 1,
        description: 'Nhiều chỉ số trong cùng nhóm (ưu tiên hơn metric).',
      },
      count: { type: 'integer', minimum: 1, maximum: TOP_N_MAX },
    },
    required: ['count'],
  } as const;
}

/**
 * Định danh theo cách agent truyền: alpha dùng `netuid`/`netuids` (số nguyên),
 * cổ phiếu Mỹ dùng `ticker`/`tickers` (chuỗi). Đọc cả hai để execute dùng chung.
 */
interface AgentIdArgs {
  netuid?: number | string;
  ticker?: string;
  netuids?: Array<number | string>;
  tickers?: string[];
}

function agentKeys(g: AgentSelection): MetricKey[] {
  if (Array.isArray(g.metrics) && g.metrics.length) return g.metrics;
  if (g.metric) return [g.metric];
  return [];
}

export interface PortfolioToolsDeps {
  /** false → không đăng ký tool nào (builder của mục đầu tư đang ẩn). Mặc định true. */
  enabled?: boolean;
  /** Mục đầu tư của builder (mặc định alpha). */
  profile?: AssetProfile;
  allData: SubnetRow[];
  savedPortfolios: SavedPortfolioRecord[];
  portfolio: Portfolio | null;
  applyPortfolio: (next: Portfolio) => void;
  generate: (selections: Selection[]) => Portfolio | null;
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
  const profile = deps.profile ?? ALPHA_PROFILE;
  const isAlpha = profile.key === 'alpha';
  const METRIC_KEYS = profile.metricKeys;
  const selectionSchema = selectionSchemaFor(METRIC_KEYS);
  // Alpha giữ nguyên văn bản; cổ phiếu Mỹ đổi subnet → mã, netuid → ticker…
  const L = (text: string) => localizeForAsset(profile, text);
  const idKey = profile.idField;
  const idsKey = `${profile.idField}s`;
  const idSchema = isAlpha ? { type: 'integer', minimum: 1 } : { type: 'string' };
  const idItemSchema = isAlpha ? { type: 'integer' } : { type: 'string' };

  const nameMap = () => buildNameMap(state.current.allData);

  const requirePortfolio = (): Portfolio => {
    const p = state.current.portfolio;
    if (!p) throw new Error(tt('agentTools.noPortfolio'));
    return p;
  };

  const report = (p: Portfolio, extra: Record<string, unknown> = {}) => ({
    ...describePortfolio(p, state.current.savedPortfolios, nameMap()),
    ...extra,
  });

  useWebMCPTools(deps.enabled === false ? [] : [
    {
      name: 'generate_portfolio',
      description: L(
        'Dựng một danh mục mới từ một hoặc nhiều nhóm tiêu chí (groups[]). Mỗi nhóm chọn top N subnet theo một hoặc nhiều chỉ số (metrics[]); các nhóm được gộp tuần tự và loại trùng (nhóm sau lấy subnet kế tiếp nếu bị trùng). Trong một nhóm, các chỉ số được lấy xen kẽ (round-robin) cho đủ N. Các nhóm không được trùng chỉ số. Danh mục cuối phân bổ giảm dần theo thanh khoản, trần 5% mỗi subnet, tổng bằng 1. Ghi đè danh mục đang dựng. Có thể truyền group1/group2 (tương thích cũ) thay cho groups. Nếu tab không phải "portfolio", gọi switch_tab("portfolio") để người dùng thấy kết quả.'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          groups: {
            type: 'array',
            minItems: 1,
            maxItems: METRIC_KEYS.length,
            items: selectionSchema,
            description: 'Danh sách nhóm tiêu chí (ưu tiên). Mỗi phần tử: metrics[] + count.',
          },
          group1: { ...selectionSchema, description: 'Tương thích cũ — nhóm 1 nếu không truyền groups.' },
          group2: { ...selectionSchema, description: 'Tương thích cũ — nhóm 2 nếu không truyền groups.' },
        },
      },
      execute: async ({
        groups,
        group1,
        group2,
      }: {
        groups?: AgentSelection[];
        group1?: AgentSelection;
        group2?: AgentSelection;
      }) => {
        const { allData: data } = state.current;
        if (!data.length) {
          throw new Error(isAlpha ? tt('agentTools.noAlphaData') : tt('agentTools.noStockData'));
        }

        const rawGroups: AgentSelection[] =
          Array.isArray(groups) && groups.length
            ? groups
            : [group1, group2].filter((g): g is AgentSelection => Boolean(g));

        if (!rawGroups.length) {
          throw new Error(tt('agentTools.needGroups'));
        }

        const parsed: { keys: MetricKey[]; count: number }[] = [];
        const seen = new Set<MetricKey>();
        for (let i = 0; i < rawGroups.length; i++) {
          const label = `groups[${i}]`;
          const g = rawGroups[i];
          const keys = agentKeys(g);
          if (!keys.length) throw new Error(tt('agentTools.groupNeedMetric', { label }));
          for (const m of keys) {
            if (!METRIC_KEYS.includes(m)) {
              throw new Error(
                tt('agentTools.groupBadMetric', { label, metric: m, list: METRIC_KEYS.join(', ') })
              );
            }
            if (seen.has(m)) {
              throw new Error(tt('agentTools.metricDupGroups', { metric: m }));
            }
            seen.add(m);
          }
          const count = Math.floor(Number(g.count));
          if (!Number.isFinite(count) || count < 1) {
            throw new Error(tt('agentTools.groupBadCount', { label }));
          }
          parsed.push({ keys, count: Math.min(count, TOP_N_MAX) });
        }

        const selections: Selection[] = parsed.map(({ keys, count }) => ({
          changeKey: keys[0],
          changeKeys: keys,
          n: count,
        }));
        const next = state.current.generate(selections);
        if (!next) throw new Error(tt('agentTools.generateFailed'));
        return report(next, {
          log: tt('agentTools.generateLog', {
            count: parsed.length,
            detail: parsed.map((p) => `top ${p.count} [${p.keys.join(', ')}]`).join(' + '),
          }),
        });
      },
    },

    {
      name: 'get_current_portfolio',
      description: L(
        'Đọc danh mục đang dựng: từng subnet với tỷ trọng, tổng phân bổ, phần tiền mặt còn lại, kết quả kiểm tra hợp lệ và khoảng cách dedupe tới các danh mục đã lưu.'
      ),
      annotations: { readOnlyHint: true },
      inputSchema: { type: 'object', properties: {} },
      execute: async () => report(requirePortfolio(), { log: tt('agentTools.readPortfolio') }),
    },

    {
      name: 'set_allocation',
      description: L(
        'Đặt tỷ trọng cho một subnet đã có trong danh mục. Các subnet còn lại được co giãn theo tỷ lệ để tổng vẫn bằng 1. Dùng khi cần nhấn mạnh hoặc giảm bớt một subnet cụ thể.'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          [idKey]: idSchema,
          weight: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Tỷ trọng mục tiêu dạng phân số, ví dụ 0.04 nghĩa là 4%.',
          },
        },
        required: [idKey, 'weight'],
      },
      execute: async (args: AgentIdArgs & { weight: number }) => {
        const netuid = args.netuid ?? args.ticker;
        const { weight } = args;
        if (netuid == null || String(netuid) === '') throw new Error(tt('agentTools.needId', { idKey }));
        const current = requirePortfolio();
        const key = String(netuid);
        const base = stripAssetClass(current);
        if (!(key in base)) {
          throw new Error(L(tt('agentTools.notInPortfolio', { id: String(netuid) })));
        }
        if (weight >= 1) throw new Error(L(tt('agentTools.weightTooHigh')));

        const others = Object.entries(base).filter(([k]) => k !== key);
        const othersSum = others.reduce((a, [, v]) => a + v, 0);
        const remaining = 1 - weight;
        const next: Record<string, number> = { [key]: weight };
        if (othersSum > 0) {
          others.forEach(([k, v]) => {
            next[k] = +((v / othersSum) * remaining).toFixed(6);
          });
        }
        const applied = withAssetClass(normalizeToOne(next), profile.assetClass);
        state.current.applyPortfolio(applied);
        return report(applied, {
          log: L(tt('agentTools.setWeight', { id: String(netuid), pct: (weight * 100).toFixed(2) })),
        });
      },
    },

    {
      name: 'remove_subnets',
      description: L(
        'Bỏ một hoặc nhiều subnet khỏi danh mục. Tổng tỷ trọng của các subnet bị bỏ được chia đều cho các subnet còn lại, hoặc chỉ cho những subnet được chỉ định trong receivers.'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          [idsKey]: {
            type: 'array',
            items: idItemSchema,
            description: L('Danh sách netuid cần bỏ.'),
          },
          receivers: {
            type: 'array',
            items: idItemSchema,
            description: L(
              'Tuỳ chọn. Chỉ những subnet này nhận lại phần tỷ trọng vừa giải phóng. Bỏ trống thì chia đều cho tất cả subnet còn lại.'
            ),
          },
        },
        required: [idsKey],
      },
      execute: async (args: AgentIdArgs & { receivers?: Array<number | string> }) => {
        const netuids = args.netuids ?? args.tickers;
        const { receivers } = args;
        if (!Array.isArray(netuids) || !netuids.length) {
          throw new Error(tt('agentTools.needIds', { idsKey }));
        }
        const current = requirePortfolio();
        const base = stripAssetClass(current);
        const missing = netuids.filter((id) => !(String(id) in base));
        if (missing.length) {
          throw new Error(L(tt('agentTools.missingInPortfolio', { ids: missing.join(', ') })));
        }
        if (netuids.length >= Object.keys(base).length) {
          throw new Error(L(tt('agentTools.cannotRemoveAll')));
        }
        const { weights } = redistributeRemovedWeights(
          base,
          netuids.map(String),
          receivers ? receivers.map(String) : null
        );
        const applied = withAssetClass(normalizeToOne(weights), profile.assetClass);
        state.current.applyPortfolio(applied);
        return report(applied, {
          log: L(tt('agentTools.removeLog', { count: netuids.length, ids: netuids.join(', ') })),
        });
      },
    },

    {
      name: 'add_subnets',
      description: L(
        'Thêm subnet mới vào danh mục. Tỷ trọng cấp cho subnet mới được lấy bớt từ các subnet đang có tỷ trọng lớn nhất: mỗi subnet trong top_n nhả ra take_ratio phần tỷ trọng của chính nó. Phần thu được chia cho các subnet mới theo thứ tự truyền vào, giảm dần (netuid đầu tiên nhận nhiều nhất) hoặc chia đều.'
      ),
      inputSchema: {
        type: 'object',
        properties: {
          [idsKey]: {
            type: 'array',
            items: idItemSchema,
            description: L('Netuid cần thêm, xếp theo mức ưu tiên giảm dần.'),
          },
          top_n: {
            type: 'integer',
            minimum: 1,
            description: L('Số subnet lớn nhất bị lấy bớt tỷ trọng. Mặc định 10.'),
          },
          take_ratio: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: L('Tỷ lệ tỷ trọng mà mỗi subnet cho đi phải nhả ra. Mặc định 0.1.'),
          },
          mode: { type: 'string', enum: ['decreasing', 'equal'] },
        },
        required: [idsKey],
      },
      execute: async (
        args: AgentIdArgs & {
          top_n?: number;
          take_ratio?: number;
          mode?: SplitMode;
        }
      ) => {
        const netuids = args.netuids ?? args.tickers;
        const { top_n = 10, take_ratio = 0.1, mode = 'decreasing' } = args;
        if (!Array.isArray(netuids) || !netuids.length) {
          throw new Error(tt('agentTools.needIds', { idsKey }));
        }
        const current = requirePortfolio();
        const { allData: data } = state.current;
        const known = new Set(data.map((r) => String(r.netuid)));
        const unknown = netuids.filter((id) => !known.has(String(id)));
        if (unknown.length) {
          throw new Error(L(tt('agentTools.unknownInData', { ids: unknown.join(', ') })));
        }
        const base = stripAssetClass(current);
        const fresh = netuids.filter((id) => !(String(id) in base));
        if (!fresh.length) throw new Error(L(tt('agentTools.alreadyInPortfolio')));

        const { weights } = allocateWeightsForNewSubnets(base, fresh.map(String), {
          topN: top_n,
          takeRatio: take_ratio,
          mode,
        });
        const applied = withAssetClass(normalizeToOne(weights), profile.assetClass);
        state.current.applyPortfolio(applied);
        return report(applied, { log: L(tt('agentTools.addLog', { ids: fresh.join(', ') })) });
      },
    },

    {
      name: 'escape_dedupe',
      description: L(
        'Xáo lại tỷ trọng cho tới khi danh mục đủ khác biệt so với mọi danh mục đã lưu, để không bị cơ chế chống sao chép của Subnet 88 phạt điểm. Biên độ nhiễu được tăng dần cho tới khi khoảng cách vượt ngưỡng an toàn. Thành phần subnet giữ nguyên, chỉ tỷ trọng thay đổi. Gọi tool này khi get_current_portfolio hoặc save_portfolio báo danh mục bị trùng lặp.'
      ),
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
            hint: L(tt('agentTools.escapeFailHint')),
            log: tt('agentTools.escapeFailLog', { dist: String(result.minDist) }),
          });
        }
        return report(result.portfolio, {
          escaped: true,
          achieved_distance: result.minDist,
          log: tt('agentTools.escapeOkLog', { dist: String(result.minDist) }),
        });
      },
    },

    {
      name: 'save_portfolio',
      description: L(
        'Lưu danh mục đang dựng vào danh sách đã lưu. Sẽ bị từ chối nếu danh mục không hợp lệ theo luật Tao/Alpha hoặc bị coi là trùng lặp với một danh mục đã lưu — trong trường hợp trùng lặp, gọi escape_dedupe rồi lưu lại.'
      ),
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
          log: tt('agentTools.saveLog', { name: result.name }),
        };
      },
    },
  ]);
}
