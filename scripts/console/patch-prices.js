// Vá GIÁ LƯU (prices) + TÊN SUBNET (names) vào các danh mục đang có trong localStorage.
// Chỉ đụng 2 field đó — phân bổ, tên danh mục, mọi chỉnh sửa của bạn giữ nguyên.
// Dán vào DevTools Console CỦA TAB APP (localhost:5173) rồi Enter, sau đó reload.
(() => {
  const KEY = 'subnet_saved_portfolios';
  const PATCH = [{"savedAt":"2026-07-11T02:16:04.000Z","name":"UID 174","prices":{"1":0.008553,"4":0.054155,"5":0.014627,"8":0.029989,"9":0.033313,"10":0.006679,"11":0.008496,"12":0.005723,"13":0.006832,"14":0.010261,"17":0.010391,"19":0.010482,"25":0.004439,"28":0.012525,"30":0.004328,"33":0.006126,"34":0.012313,"41":0.006296,"43":0.005476,"44":0.037126,"46":0.007284,"48":0.005442,"50":0.005766,"51":0.053651,"52":0.006717,"53":0.012593,"56":0.017939,"61":0.006501,"62":0.01187,"63":0.008872,"64":0.073024,"68":0.0223,"75":0.01661,"77":0.007234,"79":0.008735,"85":0.006603,"93":0.010733,"95":0.046969,"107":0.048191,"120":0.055855},"names":{"1":"Apex","4":"Targon","5":"Hone","8":"Vanta","9":"iota","10":"Pareton","11":"TrajectoryRL","12":"Compute Horde","13":"Data Universe","14":"Cacheon","17":"404—GEN","19":"blockmachine","25":"Mainframe","28":"gm","30":"Endure Network","33":"ReadyAI","34":"BitMind","41":"Almanac","43":"Graphite","44":"Score","46":"Zipcode","48":"Quantum Compute","50":"Synth","51":"lium.io","52":"Dojo","53":"engy","56":"Gradients","61":"RedTeam","62":"Ridges","63":"Enigma","64":"Chutes","68":"NOVA","75":"Hippius","77":"Liquidity","79":"MVTRX","85":"Vidaio","93":"Bitcast","95":"Actual","107":"Minos","120":"Affine"}},{"savedAt":"2026-07-10T11:08:59.000Z","name":"UID 245","prices":{"1":0.008585,"5":0.014596,"8":0.029983,"9":0.033201,"12":0.005708,"13":0.006882,"14":0.010595,"17":0.010088,"18":0.007685,"19":0.010488,"28":0.013239,"29":0.003387,"30":0.004351,"33":0.006215,"34":0.012287,"41":0.006474,"43":0.005461,"44":0.037388,"46":0.007203,"48":0.005484,"50":0.00582,"51":0.053324,"52":0.006722,"56":0.017918,"62":0.011989,"63":0.008798,"64":0.072752,"68":0.02222,"75":0.016545,"77":0.007254,"79":0.008584,"81":0.008561,"93":0.010667,"95":0.04962,"120":0.055551},"names":{"1":"Apex","5":"Hone","8":"Vanta","9":"iota","12":"Compute Horde","13":"Data Universe","14":"Cacheon","17":"404—GEN","18":"Zeus","19":"blockmachine","28":"gm","29":"hoτfloaτ","30":"Endure Network","33":"ReadyAI","34":"BitMind","41":"Almanac","43":"Graphite","44":"Score","46":"Zipcode","48":"Quantum Compute","50":"Synth","51":"lium.io","52":"Dojo","56":"Gradients","62":"Ridges","63":"Enigma","64":"Chutes","68":"NOVA","75":"Hippius","77":"Liquidity","79":"MVTRX","81":"deprecated","93":"Bitcast","95":"Actual","120":"Affine"}}];

  let list;
  try { list = JSON.parse(localStorage.getItem(KEY)); } catch { list = null; }
  if (!Array.isArray(list) || !list.length) {
    console.error('✗ localStorage chưa có danh mục nào. Hãy nhập restore-portfolios.json trước.');
    return;
  }

  let patched = 0;
  const notFound = [];
  for (const p of PATCH) {
    const rec = list.find((r) => r && r.savedAt === p.savedAt);
    if (!rec) { notFound.push(p.name); continue; }
    // Chỉ điền giá cho subnet CÒN trong danh mục — nếu bạn đã bỏ subnet nào thì
    // không nhét giá thừa vào.
    const keep = new Set(Object.keys(rec.portfolio || {}).filter((k) => k !== '_'));
    rec.prices = {};
    rec.names = {};
    let n = 0;
    for (const k of keep) {
      if (p.prices[k] != null) { rec.prices[k] = p.prices[k]; n++; }
      if (p.names[k] != null) rec.names[k] = p.names[k];
    }
    console.log('✓', rec.name || p.name, '→', n + '/' + keep.size, 'subnet có giá lưu');
    patched++;
  }
  if (notFound.length) console.warn('⚠ Không tìm thấy danh mục:', notFound);
  if (!patched) { console.error('✗ Không vá được gì.'); return; }

  const s = JSON.stringify(list);
  localStorage.setItem(KEY, s);
  try { sessionStorage.setItem(KEY, s); } catch {}
  console.log('%c✓ Xong — RELOAD trang (Cmd+R) để thấy cột GIÁ LƯU.', 'color:#4ade80;font-weight:bold');
})();
