export function isPrimitive(v) {
  return v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);
}

export function formatBig(n, key) {
  const abs = Math.abs(n);
  if (key && /(_tao|market_cap|volume|liquidity|alpha|flow)/.test(key)) {
    if (abs >= 1e15) return (n / 1e15).toFixed(3) + 'P';
    if (abs >= 1e12) return (n / 1e12).toFixed(3) + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(3) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(3) + 'M';
  }
  return n.toLocaleString();
}

// Định dạng chỉ số hiển thị theo loại field: field tăng trưởng (…change…) hiện %,
// còn lại (liquidity, price, emission, market_cap…) hiện số thực (rút gọn nếu là số lớn).
export function formatMetric(n, key) {
  if (!key || /change/.test(key)) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  }
  return formatBig(n, key);
}

export function escHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normalize(arr) {
  const sum = arr.reduce((a, b) => a + b, 0);
  if (sum === 0) return arr.map(() => +(1 / arr.length).toFixed(6));
  return arr.map((v) => +(v / sum).toFixed(6));
}

// Tính lại tỷ trọng khi bỏ bớt subnet khỏi một danh mục.
// Tổng tỷ trọng của các subnet bị bỏ (pool) được chia ĐỀU cho các subnet nhận:
//   - receiverIds = null/undefined (mặc định) → chia đều cho TẤT CẢ subnet còn lại;
//   - receiverIds là mảng → chỉ đúng các subnet đó nhận;
//   - mảng rỗng → KHÔNG subnet nào nhận (pool bị bỏ, người gọi tự chuẩn hoá phần còn lại).
// base: { netuid: tỷ trọng } — đơn vị tuỳ người gọi (component dùng %), hàm không tự chuẩn hoá.
// Trả về { weights, pool, targets, share, remainingIds }.
export function redistributeRemovedWeights(base, removedIds = [], receiverIds = null) {
  const removed = new Set(removedIds.map(String));
  const remainingIds = Object.keys(base).filter((id) => !removed.has(id));
  const pool = [...removed].reduce((a, id) => a + (base[id] || 0), 0);
  const targets = receiverIds
    ? receiverIds.map(String).filter((id) => remainingIds.includes(id))
    : remainingIds;
  const share = targets.length ? pool / targets.length : 0;
  const isTarget = new Set(targets);
  const weights = Object.fromEntries(
    remainingIds.map((id) => [id, (base[id] || 0) + (isTarget.has(id) ? share : 0)])
  );
  return { weights, pool, targets, share, remainingIds };
}

// Lấy bớt tỷ trọng của N subnet lớn nhất để cấp cho các subnet MỚI thêm vào danh mục.
//
// Mỗi subnet trong top N bị trừ takeRatio phần tỷ trọng CỦA CHÍNH NÓ (không phải điểm phần
// trăm tuyệt đối): subnet 4% với takeRatio = 0.1 → nhả 0.4%, còn 3.6%. Tổng nhả ra (pool)
// chia cho các subnet mới theo thứ tự truyền vào (newIds[0] = ưu tiên cao nhất):
//   - mode 'decreasing' (mặc định): giảm dần đều theo cấp số cộng — subnet thứ i trong m
//     subnet nhận pool * (m - i) / (m(m+1)/2), tức subnet đầu nhận nhiều nhất;
//   - mode 'equal': chia đều pool / m.
//
// base: { netuid: tỷ trọng } — đơn vị tuỳ người gọi (component dùng %), hàm không chuẩn hoá.
// newIds đã có sẵn trong base sẽ bị bỏ qua. Không có subnet mới → trả lại base nguyên vẹn.
// Trả về { weights, pool, taken, shares, donorIds }.
export function allocateWeightsForNewSubnets(
  base,
  newIds = [],
  { topN = 10, takeRatio = 0.1, mode = 'decreasing' } = {}
) {
  const weights = { ...base };
  const ids = [...new Set(newIds.map(String))].filter((id) => !(id in base));
  const taken = {};
  const shares = {};
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

// Xếp hạng subnet theo một field giảm dần (bỏ subnet 0 và giá trị không phải số).
// Trả về Map: netuid (string) → thứ hạng bắt đầu từ 1 (1 = cao nhất).
// Dùng để biết một subnet trong danh mục có nằm trong top emission / top thanh khoản
// của data table hiện tại hay không.
export function buildRankIndex(data, field) {
  const index = new Map();
  (data || [])
    .filter((r) => Number(r.netuid) !== 0 && !isNaN(parseFloat(r[field])))
    .sort((a, b) => parseFloat(b[field]) - parseFloat(a[field]))
    .forEach((r, i) => index.set(String(r.netuid), i + 1));
  return index;
}

export function getFilteredSubnets(data, filterKey = 'price_change_1_day', min = -Infinity, max = Infinity) {
  return data
    .filter((r) => {
      const v = parseFloat(r[filterKey]);
      return !isNaN(v) && v >= min && v <= max;
    })
    .sort(
      (a, b) =>
        parseFloat(b[filterKey]) - parseFloat(a[filterKey])
    );
}

export function buildColumns(data) {
  const allKeys = [...new Set(data.flatMap((r) => Object.keys(r)))];
  return allKeys.filter((k) => data.some((r) => isPrimitive(r[k])));
}

// Sort tất cả subnet (exclude subnet 0) theo changeKey giảm dần, lấy top N.
// Subnet tăng nhiều nhất ở đầu; nếu không đủ subnet tăng thì lấy tiếp subnet giảm ít nhất.
// Subnet không có field changeKey bị đẩy xuống cuối.
export function getTopNByChange(data, n, changeKey) {
  const pool = data.filter((r) => Number(r.netuid) !== 0);
  const count = Math.min(Math.max(1, Math.floor(n)), pool.length);
  return [...pool]
    .sort((a, b) => {
      const av = parseFloat(a[changeKey]);
      const bv = parseFloat(b[changeKey]);
      return (isNaN(bv) ? -Infinity : bv) - (isNaN(av) ? -Infinity : av);
    })
    .slice(0, count);
}

// Chọn subnet theo NHIỀU điều kiện lọc rồi gộp lại, đảm bảo không trùng subnet.
// selections: [{ changeKey, n }, …] — xử lý tuần tự theo thứ tự truyền vào.
// Mỗi selection đóng góp đúng n subnet phân biệt: duyệt list đã sort giảm dần theo changeKey,
// bỏ qua subnet đã được chọn ở selection trước và lấy tiếp subnet kế tiếp cho đủ n
// (vd top-10 tăng trưởng nếu trùng với top-50 thanh khoản thì lấy subnet tăng trưởng kế tiếp).
// Luôn loại subnet 0.
// Trả về { subnets, groups } — groups giữ membership từng nhóm để UI xoá/thêm theo cụm.
export function getMixedSubnetsGrouped(data, selections) {
  const pool = data.filter((r) => Number(r.netuid) !== 0);
  const chosen = [];
  const chosenIds = new Set();
  const groups = [];
  for (const { changeKey, n } of selections || []) {
    const count = Math.max(0, Math.floor(n));
    const netuids = [];
    if (count) {
      const sorted = [...pool].sort((a, b) => {
        const av = parseFloat(a[changeKey]);
        const bv = parseFloat(b[changeKey]);
        return (isNaN(bv) ? -Infinity : bv) - (isNaN(av) ? -Infinity : av);
      });
      let added = 0;
      for (const s of sorted) {
        if (added >= count) break;
        const id = String(s.netuid);
        if (chosenIds.has(id)) continue;
        chosenIds.add(id);
        chosen.push(s);
        netuids.push(id);
        added++;
      }
    }
    groups.push({ changeKey, n: count, netuids });
  }
  return { subnets: chosen, groups };
}

// Giữ API cũ: chỉ trả mảng subnet đã gộp (thứ tự theo lượt chọn).
export function getMixedSubnets(data, selections) {
  return getMixedSubnetsGrouped(data, selections).subnets;
}

// Suy ra membership nhóm cho một danh mục đã lưu.
// Ưu tiên `saved.groups` (đã persist). Thiếu thì ước lượng lại từ selections + data hiện tại
// (giao với netuid còn trong portfolio). Subnet không thuộc nhóm nào → "other".
export function resolvePortfolioGroups(saved, currentData = []) {
  const inPortfolio = new Set(
    Object.keys(saved?.portfolio || {}).filter((k) => k !== '_')
  );
  if (!inPortfolio.size) return [];

  const labelOf = (changeKey) => {
    if (changeKey === 'other') return 'Khác / chưa phân nhóm';
    return changeKey;
  };

  if (Array.isArray(saved?.groups) && saved.groups.length) {
    const seen = new Set();
    const groups = saved.groups.map((g) => {
      const netuids = (g.netuids || [])
        .map(String)
        .filter((id) => inPortfolio.has(id) && !seen.has(id));
      netuids.forEach((id) => seen.add(id));
      return {
        changeKey: g.changeKey,
        n: g.n ?? netuids.length,
        netuids,
        label: g.label || labelOf(g.changeKey),
      };
    });
    const orphan = [...inPortfolio].filter((id) => !seen.has(id));
    if (orphan.length) {
      groups.push({
        changeKey: 'other',
        n: orphan.length,
        netuids: orphan,
        label: 'Khác / chưa phân nhóm',
      });
    }
    return groups.filter((g) => g.netuids.length > 0);
  }

  if (Array.isArray(saved?.selections) && saved.selections.length && currentData?.length) {
    const { groups: rebuilt } = getMixedSubnetsGrouped(currentData, saved.selections);
    const seen = new Set();
    const groups = rebuilt.map((g) => {
      const netuids = g.netuids.filter((id) => inPortfolio.has(id) && !seen.has(id));
      netuids.forEach((id) => seen.add(id));
      return { ...g, n: netuids.length, label: labelOf(g.changeKey) };
    });
    const orphan = [...inPortfolio].filter((id) => !seen.has(id));
    if (orphan.length) {
      groups.push({
        changeKey: 'other',
        n: orphan.length,
        netuids: orphan,
        label: 'Khác / chưa phân nhóm',
      });
    }
    return groups.filter((g) => g.netuids.length > 0);
  }

  return [
    {
      changeKey: 'other',
      n: inPortfolio.size,
      netuids: [...inPortfolio],
      label: 'Khác / chưa phân nhóm',
    },
  ];
}

// Tạo portfolio phân bổ giảm dần đều (cấp số cộng) theo rank emission.
// Subnet emission cao nhất → weight lớn nhất; chênh lệch giữa mọi cặp liền kề = 1/sumRanks.
// Tổng = 1.0, mọi weight > 0 → hợp lệ với rule Tao/Alpha.
export function generateDecreasingPortfolio(subnets) {
  const valid = subnets.filter(
    (s) => /^\d+$/.test(String(s.netuid)) && Number(s.netuid) !== 0
  );
  if (!valid.length) return null;
  const n = valid.length;
  const sumRanks = (n * (n + 1)) / 2;
  const portfolio = { _: 0 };
  let assigned = 0;
  valid.forEach((s, i) => {
    const rank = n - i; // vị trí 0 → rank n (cao nhất), vị trí n-1 → rank 1 (thấp nhất)
    if (i === n - 1) {
      portfolio[s.netuid] = +(1 - assigned).toFixed(6); // phần dư để tổng = 1 chính xác
    } else {
      const w = +(rank / sumRanks).toFixed(6);
      portfolio[s.netuid] = w;
      assigned = +(assigned + w).toFixed(6);
    }
  });
  return portfolio;
}

// Áp ±(amount) multiplicative random lên mỗi subnet, clamp > 0, normalize tổng = 1.
// Trả về portfolio mới (không mutate bản gốc).
export function rebalancePortfolio(portfolio, amount = 0.05) {
  const entries = Object.entries(portfolio).filter(([k]) => k !== '_');
  if (!entries.length) return { ...portfolio };

  const noised = entries.map(([netuid, weight]) => {
    // ±amount của chính trọng số subnet đó (multiplicative)
    const delta = weight * (Math.random() * 2 - 1) * amount;
    return [netuid, Math.max(0.001, weight + delta)]; // clamp > 0 (no shorting)
  });

  const norm = normalize(noised.map(([, v]) => v));
  const newPortfolio = { _: portfolio._ ?? 0 };
  noised.forEach(([netuid], i) => {
    newPortfolio[netuid] = norm[i];
  });
  return newPortfolio;
}

// Rebalance nhưng ĐẢM BẢO kết quả không bị dedupe: khoảng cách tới mọi danh mục
// trong `avoid` (và tới bản gốc) phải ≥ minDist. Tăng dần biên độ nhiễu rồi thử lại.
// Với danh mục 1 subnet (luôn chuẩn hoá về {netuid:1}) thì không thể thoát dedupe
// bằng cách đổi tỷ trọng → trả về best-effort kèm cờ ok=false.
// Trả về { portfolio, ok, minDist } (minDist là khoảng cách nhỏ nhất tới avoid∪{gốc}).
export function rebalancePortfolioSafe(portfolio, avoid = [], minDist = 0, dedupeDistance = null) {
  const others = [portfolio, ...avoid.map((o) => (o && o.portfolio ? o.portfolio : o))];
  // Không có hàm khoảng cách → giữ hành vi cũ (rebalance ±5% đơn thuần).
  if (typeof dedupeDistance !== 'function') {
    return { portfolio: rebalancePortfolio(portfolio), ok: true, minDist: null };
  }
  const distToOthers = (p) =>
    others.reduce((m, o) => Math.min(m, dedupeDistance(p, o)), Infinity);

  let best = null;
  let bestDist = -Infinity;
  // Tăng biên độ nhiễu 5% → 60% để chắc chắn vượt ngưỡng trên danh mục nhiều subnet.
  for (const amount of [0.05, 0.1, 0.2, 0.35, 0.5, 0.6]) {
    for (let t = 0; t < 40; t++) {
      const cand = rebalancePortfolio(portfolio, amount);
      const d = distToOthers(cand);
      if (d > bestDist) { bestDist = d; best = cand; }
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

// Tạo portfolio giảm dần nhẹ theo thứ tự subnet đầu vào (subnet đầu = trọng số cao nhất).
// Dùng cho lọc theo thanh khoản: subnet thanh khoản cao → value cao → slippage thấp → ít rủi ro,
// đồng thời tránh chia đều khiến subnet thanh khoản thấp gánh slippage cao.
//
// Slope tuyến tính đối xứng quanh mức đều (1/n): w_i = equal + (mid - i) * step.
//   - Tổng deviation = 0 → tổng = 1 (full đầu tư).
//   - Trần value cao nhất = maxWeight (mặc định 0.05): step ≤ (maxWeight - equal) / mid.
//   - Sàn value thấp nhất > 0 (giữ margin): step ≤ 0.9 * equal / mid.
// step = min của hai ràng buộc → vừa "không cách nhau quá xa" vừa cap ≤ maxWeight.
// Khi n nhỏ tới mức equal ≥ maxWeight (n ≲ 20) thì không thể vừa giảm dần vừa cap → fallback chia đều.
export function generateLiquidityWeightedPortfolio(subnets, maxWeight = 0.05) {
  const valid = (subnets || []).filter(
    (s) => /^\d+$/.test(String(s.netuid)) && Number(s.netuid) !== 0
  );
  const n = valid.length;
  if (!n) return null;
  if (n === 1) return { _: 0, [valid[0].netuid]: 1 };

  const equal = 1 / n;
  const mid = (n - 1) / 2;
  const stepTopCap = (maxWeight - equal) / mid; // ≤ 0 khi equal ≥ maxWeight
  const stepBottom = (0.9 * equal) / mid; // giữ value thấp nhất > 0
  const step = Math.max(0, Math.min(stepBottom, stepTopCap));

  const raw = valid.map((s, i) => +(equal + (mid - i) * step).toFixed(6));
  // Dồn sai số làm tròn vào phần tử giữa để không phá thứ tự giảm dần và không vượt trần.
  const sum = raw.reduce((a, b) => a + b, 0);
  const diff = +(1 - sum).toFixed(6);
  const midIdx = Math.floor(n / 2);
  raw[midIdx] = +(raw[midIdx] + diff).toFixed(6);

  const portfolio = { _: 0 };
  valid.forEach((s, i) => {
    portfolio[s.netuid] = raw[i];
  });
  return portfolio;
}

export function generateEqualPortfolio(positiveSubnets) {
  // Chỉ giữ subnet có netuid là số nguyên (rule Tao/Alpha: key phải là netuid)
  const subnets = (positiveSubnets || []).filter((s) =>
    /^\d+$/.test(String(s.netuid))
  );
  if (!subnets.length) return null;
  const n = subnets.length;
  const equal = +(1 / n).toFixed(6);
  // Asset class Tao/Alpha = 0
  const portfolio = { _: 0 };
  let assigned = 0;
  subnets.forEach((s, i) => {
    // Phần dư dồn vào phần tử cuối để tổng đúng bằng 1.0 (full đầu tư)
    const w = i === n - 1 ? +(1 - assigned).toFixed(6) : equal;
    portfolio[s.netuid] = w;
    assigned = +(assigned + equal).toFixed(6);
  });
  return portfolio;
}
