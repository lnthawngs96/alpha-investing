import type { Portfolio, SubnetRow, WeightMap } from '@/types';
import { LIQUIDITY_MAX_WEIGHT, TAO_ALPHA_ASSET_CLASS } from '@/constants/portfolio';
import type { SplitMode } from '@/constants/editor';
import type { PortfolioLike } from './portfolioValidation';
import { unwrapPortfolio } from './portfolioValidation';

/**
 * Toán học phân bổ tỷ trọng: chuẩn hoá, chia lại, trích bớt, sinh danh mục,
 * xáo trọng số thoát dedupe. Các hàm ở đây thuần tuý — không đụng React / storage.
 */

// ============================================================================
// Chuẩn hoá & chuyển đổi
// ============================================================================

/** Chuẩn hoá mảng về tổng = 1 (làm tròn 6 chữ số). Tổng 0 → chia đều. */
export function normalize(arr: number[]): number[] {
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return arr.map(() => +(1 / arr.length).toFixed(6));
  return arr.map((v) => +(v / sum).toFixed(6));
}

/**
 * Bóc key '_' (asset class) ra để có map netuid → trọng số THUẦN.
 * Các hàm toán học nhận map thuần, nên phải bóc trước và gắn lại sau —
 * quên bước này thì '_' bị coi như một subnet và ăn mất một phần tỷ trọng.
 */
export function stripAssetClass(portfolio: Portfolio | WeightMap | null | undefined): WeightMap {
  const out: WeightMap = {};
  for (const [k, v] of Object.entries(portfolio || {})) {
    if (k !== '_') out[k] = Number(v) || 0;
  }
  return out;
}

/** Gắn lại key '_' vào map trọng số thuần, làm tròn 6 chữ số. */
export function withAssetClass(weights: WeightMap | null | undefined, assetClass = TAO_ALPHA_ASSET_CLASS): Portfolio {
  const out: Portfolio = { _: assetClass };
  for (const [k, v] of Object.entries(weights || {})) {
    out[k] = +Number(v).toFixed(6);
  }
  return out;
}

/**
 * Chuẩn hoá về tổng đúng 1.0, dồn sai số làm tròn vào phần tử lớn nhất để không
 * tạo ra trọng số âm ở phần tử nhỏ. Phần tử ≤ 0 bị loại.
 */
export function normalizeToOne(weights: WeightMap): WeightMap {
  const entries = Object.entries(weights).filter(([, v]) => Number(v) > 0);
  const sum = entries.reduce((a, [, v]) => a + Number(v), 0);
  if (!entries.length || sum <= 0) return {};
  const scaled: Array<[string, number]> = entries.map(([k, v]) => [k, +(Number(v) / sum).toFixed(6)]);
  const total = scaled.reduce((a, [, v]) => a + v, 0);
  const diff = +(1 - total).toFixed(6);
  if (diff !== 0) {
    let maxIdx = 0;
    scaled.forEach(([, v], i) => {
      if (v > scaled[maxIdx][1]) maxIdx = i;
    });
    scaled[maxIdx][1] = +(scaled[maxIdx][1] + diff).toFixed(6);
  }
  return Object.fromEntries(scaled);
}

/**
 * Dựng portfolio từ danh sách netuid + mảng giá trị đã chuẩn hoá (theo cùng thứ tự).
 * Dùng cho editor: người dùng gõ % → normalize → portfolio { _: 0, ... }.
 */
export function buildNormalizedPortfolio(
  netuids: string[],
  rawValues: number[],
  assetClass = TAO_ALPHA_ASSET_CLASS
): Portfolio {
  const norm = normalize(rawValues);
  const portfolio: Portfolio = { _: assetClass };
  netuids.forEach((id, i) => {
    portfolio[id] = norm[i];
  });
  return portfolio;
}

// ============================================================================
// Chia lại tỷ trọng khi bỏ / thêm subnet
// ============================================================================

export interface RedistributeResult {
  weights: WeightMap;
  /** Tổng tỷ trọng của các subnet bị bỏ. */
  pool: number;
  /** Các subnet thực sự nhận phần chia. */
  targets: string[];
  /** Phần mỗi subnet nhận được. */
  share: number;
  /** Các subnet còn lại (không bị bỏ). */
  remainingIds: string[];
}

/**
 * Tính lại tỷ trọng khi bỏ bớt subnet khỏi một danh mục.
 * Tổng tỷ trọng của các subnet bị bỏ (pool) được chia ĐỀU cho các subnet nhận:
 *   - receiverIds = null/undefined (mặc định) → chia đều cho TẤT CẢ subnet còn lại;
 *   - receiverIds là mảng → chỉ đúng các subnet đó nhận;
 *   - mảng rỗng → KHÔNG subnet nào nhận (pool bị bỏ, người gọi tự chuẩn hoá phần còn lại).
 * base: { netuid: tỷ trọng } — đơn vị tuỳ người gọi (component dùng %), hàm không tự chuẩn hoá.
 */
export function redistributeRemovedWeights(
  base: WeightMap,
  removedIds: Array<string | number> = [],
  receiverIds: Array<string | number> | null = null
): RedistributeResult {
  const removed = new Set(removedIds.map(String));
  const remainingIds = Object.keys(base).filter((id) => !removed.has(id));
  const pool = [...removed].reduce((a, id) => a + (base[id] || 0), 0);
  const targets = receiverIds
    ? receiverIds.map(String).filter((id) => remainingIds.includes(id))
    : remainingIds;
  const share = targets.length ? pool / targets.length : 0;
  const isTarget = new Set(targets);
  const weights: WeightMap = Object.fromEntries(
    remainingIds.map((id) => [id, (base[id] || 0) + (isTarget.has(id) ? share : 0)])
  );
  return { weights, pool, targets, share, remainingIds };
}

export interface AllocateOptions {
  topN?: number;
  takeRatio?: number;
  mode?: SplitMode;
}

export interface AllocateResult {
  weights: WeightMap;
  /** Tổng phần trích được từ các subnet lớn. */
  pool: number;
  /** Phần bị trích của từng subnet cho đi. */
  taken: WeightMap;
  /** Phần mỗi subnet mới nhận. */
  shares: WeightMap;
  /** Các subnet cho đi (top N lớn nhất). */
  donorIds: string[];
}

/**
 * Lấy bớt tỷ trọng của N subnet lớn nhất để cấp cho các subnet MỚI thêm vào danh mục.
 *
 * Mỗi subnet trong top N bị trừ takeRatio phần tỷ trọng CỦA CHÍNH NÓ (không phải điểm phần
 * trăm tuyệt đối): subnet 4% với takeRatio = 0.1 → nhả 0.4%, còn 3.6%. Tổng nhả ra (pool)
 * chia cho các subnet mới theo thứ tự truyền vào (newIds[0] = ưu tiên cao nhất):
 *   - mode 'decreasing' (mặc định): giảm dần đều theo cấp số cộng — subnet thứ i trong m
 *     subnet nhận pool * (m - i) / (m(m+1)/2), tức subnet đầu nhận nhiều nhất;
 *   - mode 'equal': chia đều pool / m.
 *
 * base: { netuid: tỷ trọng } — đơn vị tuỳ người gọi (component dùng %), hàm không chuẩn hoá.
 * newIds đã có sẵn trong base sẽ bị bỏ qua. Không có subnet mới → trả lại base nguyên vẹn.
 */
export function allocateWeightsForNewSubnets(
  base: WeightMap,
  newIds: Array<string | number> = [],
  { topN = 10, takeRatio = 0.1, mode = 'decreasing' }: AllocateOptions = {}
): AllocateResult {
  const weights: WeightMap = { ...base };
  const ids = [...new Set(newIds.map(String))].filter((id) => !(id in base));
  const taken: WeightMap = {};
  const shares: WeightMap = {};
  if (!ids.length) return { weights, pool: 0, taken, shares, donorIds: [] };

  const ratio = Math.min(1, Math.max(0, takeRatio));
  const donorIds = Object.entries(base)
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(0, Math.floor(topN)))
    .map(([id]) => id);

  let pool = 0;
  for (const id of donorIds) {
    const t = (base[id] || 0) * ratio;
    if (t <= 0) continue;
    taken[id] = t;
    weights[id] = (base[id] || 0) - t;
    pool += t;
  }

  const m = ids.length;
  const sumRanks = (m * (m + 1)) / 2;
  ids.forEach((id, i) => {
    const s = mode === 'equal' ? pool / m : (pool * (m - i)) / sumRanks;
    shares[id] = s;
    weights[id] = s;
  });
  return { weights, pool, taken, shares, donorIds };
}

// ============================================================================
// Sinh danh mục
// ============================================================================

/** Chỉ giữ subnet có netuid là số nguyên và khác 0 (rule Tao/Alpha: key phải là netuid). */
function validNonRootSubnets(subnets: SubnetRow[] | null | undefined): SubnetRow[] {
  return (subnets || []).filter((s) => /^\d+$/.test(String(s.netuid)) && Number(s.netuid) !== 0);
}

/** Cổ phiếu Mỹ: định danh (`netuid` = ticker) phải là chuỗi không rỗng. */
function validTickers(rows: SubnetRow[] | null | undefined): SubnetRow[] {
  return (rows || []).filter((s) => String(s.netuid ?? '').trim() !== '');
}

/**
 * Tạo portfolio phân bổ giảm dần đều (cấp số cộng) theo rank emission.
 * Subnet emission cao nhất → weight lớn nhất; chênh lệch giữa mọi cặp liền kề = 1/sumRanks.
 * Tổng = 1.0, mọi weight > 0 → hợp lệ với rule Tao/Alpha.
 */
export function generateDecreasingPortfolio(subnets: SubnetRow[]): Portfolio | null {
  const valid = validNonRootSubnets(subnets);
  if (!valid.length) return null;
  const n = valid.length;
  const sumRanks = (n * (n + 1)) / 2;
  const portfolio: Portfolio = { _: 0 };
  let assigned = 0;
  valid.forEach((s, i) => {
    const rank = n - i; // vị trí 0 → rank n (cao nhất), vị trí n-1 → rank 1 (thấp nhất)
    if (i === n - 1) {
      portfolio[String(s.netuid)] = +(1 - assigned).toFixed(6); // phần dư để tổng = 1 chính xác
    } else {
      const w = +(rank / sumRanks).toFixed(6);
      portfolio[String(s.netuid)] = w;
      assigned = +(assigned + w).toFixed(6);
    }
  });
  return portfolio;
}

/**
 * Tạo portfolio giảm dần nhẹ theo thứ tự subnet đầu vào (subnet đầu = trọng số cao nhất).
 * Dùng cho lọc theo thanh khoản: subnet thanh khoản cao → value cao → slippage thấp → ít rủi ro,
 * đồng thời tránh chia đều khiến subnet thanh khoản thấp gánh slippage cao.
 *
 * Slope tuyến tính đối xứng quanh mức đều (1/n): w_i = equal + (mid - i) * step.
 *   - Tổng deviation = 0 → tổng = 1 (full đầu tư).
 *   - Trần value cao nhất = maxWeight (mặc định 0.05): step ≤ (maxWeight - equal) / mid.
 *   - Sàn value thấp nhất > 0 (giữ margin): step ≤ 0.9 * equal / mid.
 * step = min của hai ràng buộc → vừa "không cách nhau quá xa" vừa cap ≤ maxWeight.
 * Khi n nhỏ tới mức equal ≥ maxWeight (n ≲ 20) thì không thể vừa giảm dần vừa cap → fallback chia đều.
 *
 * `assetClass` = 1 (cổ phiếu Mỹ): key là ticker thay vì netuid, cùng công thức (thứ tự
 * đầu vào do phía gọi quyết định, vd sắp xếp theo vốn hoá).
 */
export function generateLiquidityWeightedPortfolio(
  subnets: SubnetRow[] | null | undefined,
  maxWeight = LIQUIDITY_MAX_WEIGHT,
  assetClass = TAO_ALPHA_ASSET_CLASS
): Portfolio | null {
  const valid = assetClass === TAO_ALPHA_ASSET_CLASS ? validNonRootSubnets(subnets) : validTickers(subnets);
  const n = valid.length;
  if (!n) return null;
  if (n === 1) return { _: assetClass, [String(valid[0].netuid)]: 1 };

  const equal = 1 / n;
  const mid = (n - 1) / 2;
  const stepTopCap = (maxWeight - equal) / mid; // ≤ 0 khi equal ≥ maxWeight
  const stepBottom = (0.9 * equal) / mid; // giữ value thấp nhất > 0
  const step = Math.max(0, Math.min(stepBottom, stepTopCap));

  const raw = valid.map((_s, i) => +(equal + (mid - i) * step).toFixed(6));
  // Dồn sai số làm tròn vào phần tử giữa để không phá thứ tự giảm dần và không vượt trần.
  const sum = raw.reduce((a, b) => a + b, 0);
  const diff = +(1 - sum).toFixed(6);
  const midIdx = Math.floor(n / 2);
  raw[midIdx] = +(raw[midIdx] + diff).toFixed(6);

  const portfolio: Portfolio = { _: assetClass };
  valid.forEach((s, i) => {
    portfolio[String(s.netuid)] = raw[i];
  });
  return portfolio;
}

/** Chia đều cho mọi subnet; phần dư làm tròn dồn vào phần tử cuối để tổng đúng bằng 1.0. */
export function generateEqualPortfolio(positiveSubnets: SubnetRow[] | null | undefined): Portfolio | null {
  // Chỉ giữ subnet có netuid là số nguyên (rule Tao/Alpha: key phải là netuid)
  const subnets = (positiveSubnets || []).filter((s) => /^\d+$/.test(String(s.netuid)));
  if (!subnets.length) return null;
  const n = subnets.length;
  const equal = +(1 / n).toFixed(6);
  // Asset class Tao/Alpha = 0
  const portfolio: Portfolio = { _: 0 };
  let assigned = 0;
  subnets.forEach((s, i) => {
    // Phần dư dồn vào phần tử cuối để tổng đúng bằng 1.0 (full đầu tư)
    const w = i === n - 1 ? +(1 - assigned).toFixed(6) : equal;
    portfolio[String(s.netuid)] = w;
    assigned = +(assigned + equal).toFixed(6);
  });
  return portfolio;
}

// ============================================================================
// Rebalance (xáo tỷ trọng) — thoát dedupe
// ============================================================================

/**
 * Áp ±(amount) multiplicative random lên mỗi subnet, clamp > 0, normalize tổng = 1.
 * Trả về portfolio mới (không mutate bản gốc).
 */
export function rebalancePortfolio(portfolio: Portfolio, amount = 0.05): Portfolio {
  const entries = Object.entries(portfolio).filter(([k]) => k !== '_');
  if (!entries.length) return { ...portfolio };

  const noised: Array<[string, number]> = entries.map(([netuid, weight]) => {
    // ±amount của chính trọng số subnet đó (multiplicative)
    const delta = weight * (Math.random() * 2 - 1) * amount;
    return [netuid, Math.max(0.001, weight + delta)]; // clamp > 0 (no shorting)
  });

  const norm = normalize(noised.map(([, v]) => v));
  const newPortfolio: Portfolio = { _: portfolio._ ?? 0 };
  noised.forEach(([netuid], i) => {
    newPortfolio[netuid] = norm[i];
  });
  return newPortfolio;
}

export interface SafeRebalanceResult {
  portfolio: Portfolio;
  ok: boolean;
  /** Khoảng cách nhỏ nhất tới avoid ∪ {gốc}; null nếu không có hàm khoảng cách. */
  minDist: number | null;
}

/** Biên độ nhiễu thử lần lượt: 5% → 60% để chắc chắn vượt ngưỡng trên danh mục nhiều subnet. */
const REBALANCE_AMOUNTS = [0.05, 0.1, 0.2, 0.35, 0.5, 0.6] as const;
/** Số lần thử với mỗi biên độ. */
const REBALANCE_ATTEMPTS = 40;

/**
 * Rebalance nhưng ĐẢM BẢO kết quả không bị dedupe: khoảng cách tới mọi danh mục
 * trong `avoid` (và tới bản gốc) phải ≥ minDist. Tăng dần biên độ nhiễu rồi thử lại.
 * Với danh mục 1 subnet (luôn chuẩn hoá về {netuid:1}) thì không thể thoát dedupe
 * bằng cách đổi tỷ trọng → trả về best-effort kèm cờ ok=false.
 */
export function rebalancePortfolioSafe(
  portfolio: Portfolio,
  avoid: PortfolioLike[] = [],
  minDist = 0,
  dedupeDistance: ((a: unknown, b: unknown) => number) | null = null
): SafeRebalanceResult {
  const others: unknown[] = [portfolio, ...avoid.map((o) => unwrapPortfolio(o) ?? o)];
  // Không có hàm khoảng cách → giữ hành vi cũ (rebalance ±5% đơn thuần).
  if (typeof dedupeDistance !== 'function') {
    return { portfolio: rebalancePortfolio(portfolio), ok: true, minDist: null };
  }
  const distToOthers = (p: Portfolio) =>
    others.reduce<number>((m, o) => Math.min(m, dedupeDistance(p, o)), Infinity);

  let best: Portfolio | null = null;
  let bestDist = -Infinity;
  for (const amount of REBALANCE_AMOUNTS) {
    for (let t = 0; t < REBALANCE_ATTEMPTS; t++) {
      const cand = rebalancePortfolio(portfolio, amount);
      const d = distToOthers(cand);
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
      if (d >= minDist) {
        return { portfolio: cand, ok: true, minDist: Number.isFinite(d) ? +d.toFixed(6) : null };
      }
    }
  }
  return {
    portfolio: best || rebalancePortfolio(portfolio),
    ok: false,
    minDist: Number.isFinite(bestDist) ? +bestDist.toFixed(6) : null,
  };
}
