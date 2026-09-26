import type { Locale } from '@/types/locale';

export interface GuideSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  /** Liên kết hữu ích (KYM, Discord, X…). */
  links?: Array<{ label: string; href: string }>;
}

/**
 * Guide SN88 — phần đầu: luật & scoring chính thức;
 * phần sau: gợi ý thực chiến cho miner (rủi ro / điểm / dạng danh mục).
 * Tham chiếu: github.com/mobiusfund/investing
 */
export const GUIDE_SECTIONS: Record<Locale, GuideSection[]> = {
  vi: [
    // ── Luật & scoring ──────────────────────────────────────────────
    {
      id: 'rules-overview',
      title: 'Luật Subnet 88 (Investing)',
      paragraphs: [
        'SN88 là Bittensor subnet Decentralized AUM: miner nộp chiến lược phân bổ tài sản; validator chấm điểm theo lợi nhuận, rủi ro, slippage và khung thời gian, rồi xếp hạng để phân emission.',
        'Hai asset class hiện có: Tao/Alpha (`_\': 0`) và cổ phiếu Mỹ (`_\': 1`). Không đổi asset class sau khi đã nộp chiến lược.',
      ],
    },
    {
      id: 'rules-alloc',
      title: 'Rule phân bổ (strategy file)',
      paragraphs: [
        'Chiến lược là một dict Python (file trong Investing/strat/, tên file = hotkey ss58). Key `_` là asset class.',
      ],
      bullets: [
        'Tao/Alpha (`_\': 0`): key còn lại là netuid (số nguyên); không short (giá trị ≥ 0); tổng |phân bổ| ≤ 1.',
        'Subnet 0 và netuid không tồn tại được mạng tính như TAO/cash (0% dividend).',
        'US stocks (`_\': 1`): key là ticker (phân biệt hoa thường); cho phép short (giá trị âm); tổng |phân bổ| ≤ 1.',
        'Ticker rỗng `\'\'` hoặc mã không hỗ trợ = USD/cash. Một số ETF thu nhập cố định cũng bị coi là cash khi chấm điểm.',
        'Rebalance = đổi phân bổ hoặc cập nhật timestamp file → miner tự nộp lại; phát sinh slippage + phí stake/unstake (Alpha) hoặc phí giao dịch (cổ phiếu).',
      ],
    },
    {
      id: 'rules-ops',
      title: 'Rule vận hành miner',
      paragraphs: [
        'Chấm điểm hàng ngày: Tao/Alpha lúc 00:00 UTC; US stocks lúc 06:00 UTC. Cập nhật strategy hiện ngay trên dashboard; điểm validator (khớp incentive) xem bằng Investing/bin/validator.',
      ],
      bullets: [
        'US stocks trong phiên: chỉ MOO/MOC — nộp trước 09:28 và 15:50 giờ Đông Mỹ mới được tính.',
        'UID space / emission chia theo asset ratio (API ratio của subnet), sẽ điều chỉnh theo thời gian.',
        'Chống spam UID: coldkey cần stake Alpha (hiện ~192 staked + 64 paid — có thể đổi).',
        'Miner mới: lên dashboard sau ngày 1; immunity ~3 ngày.',
        'Dedupe: khoảng cách Euclid giữa hai vector phân bổ đã chuẩn hoá L1 < 0.01 → bản nộp SAU bị phạt nặng (gần 0 điểm khi mới copy, hồi phục ~30 ngày). Cùng tỷ trọng tương đối nhưng khác cash vẫn bị trùng.',
        'Testnet chỉ để test kết nối — strategy testnet không được chấm.',
      ],
    },
    {
      id: 'rules-score',
      title: 'Công thức tính điểm',
      paragraphs: [
        'score = MAR × LSR × odds% × daily%, trong đó:',
      ],
      bullets: [
        'return% = tổng PnL / fund × 100; risk% = max drawdown%; MAR = return% / risk% (có sàn rủi ro sớm R_init = 5 / √days).',
        'LSR = Σpnl / Σ|pnl| (tương quan Sharpe; thực nghiệm ≈ Sharpe/10).',
        'odds% = 50 + (Kelly/2)×100; Kelly từ tỷ lệ ngày lãi và pavg%/lavg% (chuẩn hoá Mobius Fund).',
        'daily% = tăng trưởng ngày tương đương từ return% trên số ngày đầu tư.',
        'Vốn giả định: Alpha = 2.000 TAO; US stocks = 10.000.000 USD. Alpha cộng cổ tức ủy quyền validator (take mặc định 18%).',
        'Rolling window: hiện 50 ngày cho mọi asset.',
        'Miner < 30 ngày: score × (days/30). Clip outlier lợi nhuận ngày (N = 2).',
        'Phạt short + cash: score × max(1 − short&cash alloc, 0.01).',
        'DEC (Dynamic Emission Control): nếu days > 5, dec = (last_active/20)²; score × (1 − min(dec, 1)) — khuyến khích rebalance định kỳ.',
        'Cash / short (live code): score × max((1 − cash)^CASH_DECAY, 0.01) với CASH_DECAY = 1 — giữ nhiều tiền ngoài danh mục sẽ bị nhân điểm xuống mạnh (sàn 0.01). Chi tiết ở mục “Cash & tổng vốn” bên dưới.',
      ],
    },
    {
      id: 'cash-fund',
      title: 'Cash & tổng vốn giả định — giữ tiền ngoài thì sao?',
      paragraphs: [
        'Validator giả lập quỹ khởi đầu cố định rồi áp đúng bảng phân bổ của bạn mỗi ngày. Phần chưa allocate (và một số key đặc biệt) được tính là cash.',
      ],
      bullets: [
        'Fund giả định: Alpha = 2.000 TAO; US stocks = 10.000.000 USD. Đây là vốn mô phỏng để tính PnL/score — không phải số TAO bạn phải nạp vào app này.',
        'Nếu tổng |trọng số| subnet/ticker = 0.7 → ~30% quỹ là cash. Cash Alpha (subnet 0, netuid lỗi, phần dư) ≈ 0% dividend; cổ phiếu: ticker rỗng / không hỗ trợ / một số ETF thu nhập cố định = USD cash.',
        'Công thức live: score × clip((1 − cash)^1, 0.01, 1). Ví dụ cash 0% → ×1; cash 50% → ×0.5; cash 100% → ×0.01 (sàn). Short cũng làm tăng phần “không deployed meaningfully” theo tinh thần rule short+cash.',
        'PnL ngày chỉ đến từ phần đã allocate (+ dividend Alpha trên phần stake subnet). Giữ cash “an toàn” ngoài book giúp giảm biến động giá nhưng score bị phạt vì mạng muốn bạn deploy vào chiến lược thật.',
        'Muốn điểm cao: deploy gần hết quỹ vào tài sản hợp lệ, đa dạng, thanh khoản tốt — đừng để 40–60% nằm cash trừ khi đang defensive có chủ đích và chấp nhận nhân điểm.',
        '“Giữ cash ngoài ví coldkey thật” ≠ cash trong strategy. Chỉ tỷ trọng trong dict nộp lên mới vào công thức cash của validator.',
      ],
    },

    // ── Gợi ý miner ─────────────────────────────────────────────────
    {
      id: 'playbook',
      title: 'Miner nên làm gì (cách chơi)',
      paragraphs: [
        'Luồng thực tế: dựng danh mục trên app → kiểm tra hợp lệ + dedupe → backtest simst → ghi file strat theo hotkey → theo dõi dashboard / điểm ngày.',
      ],
      bullets: [
        'Mỗi hotkey một “dấu vân tay” phân bổ riêng — không clone JSON cho nhiều key.',
        'Ưu tiên quản lý danh mục dài hạn (MPT/CAPM) hơn trade một mã ngắn hạn — đúng tinh thần scoring (MAR, drawdown, odds).',
        'Rebalance có chủ đích (DEC thưởng hoạt động), nhưng tránh churn vô ích vì slippage/phí.',
        'Nộp Alpha trước chu kỳ 00:00 UTC; cổ phiếu Mỹ trước cửa sổ MOO/MOC nếu muốn khớp phiên.',
        'Backtest bằng Investing/bin/simst trước khi live; nhớ simst có thể lệch block-level so với mainnet.',
      ],
    },
    {
      id: 'risk',
      title: 'Hạn chế rủi ro',
      paragraphs: [
        'Điểm phạt mạnh drawdown, short/cash thừa, copy strategy và ít rebalance. Giảm rủi ro thực tế cũng giúp score ổn định hơn.',
      ],
      bullets: [
        'Không all-in 1 subnet/ticker — slip vào/ra lớn, dễ cắt gốc và làm daily%/MAR xấu.',
        'Giữ trần vị thế (app generate ~5%/subnet) hoặc tương đương diversified book.',
        'Tránh chồng chéo tỷ trọng với strategy khác của bạn (dedupe).',
        'Cash/short chỉ dùng có chủ đích — quá nhiều bị nhân điểm xuống gần 0.01×.',
        'Scale-in / scale-out dần trên mã thanh khoản thấp thay vì một lệnh lớn.',
        'Theo dõi dereg list & subnet 0: chúng thành cash/không dividend nếu còn trong book.',
        'Đừng phụ thuộc một ngày lãi đột biến — outlier bị clip; cửa sổ 50 ngày mới là “sân chơi” thật.',
      ],
    },
    {
      id: 'score-tips',
      title: 'Tip hướng tới điểm cao',
      paragraphs: [
        'Score thưởng lợi nhuận ổn định, xác suất ngày lãi tốt, drawdown thấp, và vẫn còn “skin in the game” (ít cash/short thừa + còn rebalance).',
      ],
      bullets: [
        'Tăng prob (tỷ lệ ngày lãi) và kb (pavg/lavg) — ít ngày lỗ sâu hơn là jackpot một ngày.',
        'Giữ max drawdown thấp để MAR không sụp; chấp nhận return% vừa phải nhưng mượt.',
        'Duy trì hoạt động (timestamp/rebalance) để DEC không ăn hết emission.',
        'Sau ngày 30, hết hệ số days/30 — chuẩn bị book “trưởng thành” trước đó.',
        'Kiểm tra dedupe trước mọi lần nộp; khoảng cách an toàn nên rõ trên 0.01 (app gợi ý ~0.013).',
        'So sánh với chỉ số thị trường Alpha 1H/1D/1W/1M trên app: outperform thị trường dài hạn > bắt nhịp ngắn hạn.',
      ],
    },
    {
      id: 'suggest-alpha',
      title: 'Gợi ý dạng danh mục Alpha',
      paragraphs: [
        'Chọn “dáng” book phù hợp khẩu vị — kết hợp vài lớp thay vì chỉ theo một metric.',
      ],
      bullets: [
        'Core thanh khoản cao (top liquidity): slippage thấp khi cash-in/out — nên là phần lớn tỷ trọng.',
        'Vệ tinh emission mạnh nhưng vẫn trong top thanh khoản vừa phải — cân return và khả năng thoát hàng.',
        'Tránh “⚡ emission only / thanh khoản kém”: vào dễ, ra đắt, drawdown thật cao hơn chart.',
        'Basket tăng trưởng (1D/1W) nhỏ, giới hạn % từng mã — momentum phụ, không phải toàn bộ quỹ.',
        'Fear & Greed extreme fear: có thể nhặt dần core thanh khoản, không FOMO all-in một netuid.',
        'Loại subnet dereg / root sớm; đừng để “cash giả” chiếm chỗ không sinh dividend.',
        'Book đa subnet (8–20+) dễ thoát dedupe và giảm idiosyncratic risk hơn book 2–3 mã.',
        'Khi thị trường Alpha đỏ trên chỉ số 1D/1W: giảm vệ tinh momentum, giữ core thanh khoản.',
        'Khi xanh mạnh: tăng nhẹ vệ tinh nhưng vẫn tôn trọng trần % và kiểm tra dedupe sau mỗi chỉnh.',
        'Tách hotkey theo style (core / satellite / defensive) thay vì copy cùng một dict.',
      ],
    },
    {
      id: 'suggest-stock',
      title: 'Gợi ý dạng danh mục US stocks',
      paragraphs: [
        'Universe chủ yếu large-cap; khớp lệnh quanh open/close — ưu tiên thanh khoản phiên.',
      ],
      bullets: [
        'Core large-cap / high market cap + traded value (pv) cao: slip thấp, dễ MOO/MOC.',
        'Tránh tập trung sector hẹp (một ngành) — beta ngành làm drawdown đồng pha.',
        'Short có kiểm soát: scoring phạt short+cash; short chỉ là hedge, không phải thesis chính.',
        'Hạn chế “cash ETF giả đầu tư” nếu mục tiêu điểm — mạng đã coi nhiều fixed-income ETF là cash.',
        'Rebalance theo lịch (ví dụ weekly) trước cửa sổ 09:28 / 15:50 ET thay vì intraday lung tung.',
        'Kết hợp value (mc ổn) + quality thanh khoản thay vì chỉ chase volume spike một ngày.',
        'Book 15–40 ticker thường đủ đa dạng mà vẫn quản lý được; quá mỏng dễ trùng & lệch điểm.',
        'Sau gap tin lớn: đợi thanh khoản phục hồi rồi mới xoay tỷ trọng lớn.',
      ],
    },
    {
      id: 'suggest-mix',
      title: 'Gợi ý thêm (áp dụng chung)',
      paragraphs: [
        'Một số pattern miner thường dùng để vừa giảm rủi ro vừa giữ cạnh tranh điểm:',
      ],
      bullets: [
        'Barbell: ~60–70% core thanh khoản + ~20–30% satellite alpha + phần nhỏ linh hoạt — không để satellite vượt core.',
        'Defensive mode: khi chỉ số thị trường yếu kéo dài, nâng tỷ trọng core / giảm đòn bẩy momentum.',
        'Dedupe-aware sizing: sau khi chọn tập mã, nhiễu nhẹ tỷ trọng hoặc đổi 1–2 mã vệ tinh giữa các hotkey.',
        'Liquidity ladder: ưu tiên nạp/rút theo bậc thanh khoản (cao → thấp), không rút mã mỏng trước.',
        'Emission≠exit: emission cao chỉ tốt nếu vẫn bán được; luôn đối chiếu tier ⚡💧 trong app.',
        'Nhật ký rebalance: ghi lý do đổi book — tránh chỉnh tay cảm tính làm DEC “ảo” nhưng PnL xấu.',
        'Một machine nhiều miner: mỗi axon/port + mỗi strat file; đừng share cùng allocation.',
        'Ưu tiên ổn định 50 ngày hơn optimize 1 tuần — đúng rolling window của validator.',
      ],
    },
    {
      id: 'register-wallet',
      title: 'Đăng ký wallet & vào Subnet 88',
      paragraphs: [
        'Làm trên máy miner (Ubuntu 22.04 khuyến nghị). Không dùng root. Cần coldkey + hotkey Bittensor. Yêu cầu Alpha chống spam phản ánh trên coldkey — không phải transfer 64 α sang hotkey.',
      ],
      bullets: [
        'Cài btcli / môi trường Bittensor theo docs chính thức (docs.learnbittensor.org / bittensor.com mining guides).',
        'Tạo ví: `btcli wallet new_coldkey --wallet.name <cold>` rồi `btcli wallet new_hotkey --wallet.name <cold> --wallet.hotkey <hot>`.',
        'Nạp TAO vào coldkey (đủ burn register + phí). Kiểm tra burn: `btcli subnet show --netuid 88` hoặc `btcli query burn --netuid 88` (tuỳ bản btcli).',
        'Đăng ký miner mainnet SN88: `btcli subnet register --netuid 88 --wallet.name <cold> --wallet.hotkey <hot>` (một số bản: `btcli tx burned-register --netuid 88 -w <cold>`). Testnet netuid 339 chỉ thử kết nối — strategy testnet không được chấm.',
        'Xác nhận UID: `btcli wallet overview --wallet.name <cold>` — hotkey phải có slot trên netuid 88.',
        'Chống spam UID (README Investing, có thể đổi): trên coldkey cần ~192 Alpha staked + 64 Alpha paid. Tổng cộng phản ánh trên coldkey — không chuyển 64 α vào hotkey, không nhầm với số miner/validator trên explorer.',
        'Stake Alpha SN88 về coldkey (ví dụ): `btcli stake add --netuid 88 --wallet.name <cold> --amount <…>` tới khi phần staked ≥ ~192 α (đối chiếu số live trên ví).',
        '64 α “paid”: khoản Alpha đã chi/trả theo cơ chế subnet, vẫn phản ánh trên coldkey. Theo dõi số dư + message API/KYM khi submit; thiếu thì bổ sung rồi thử lại.',
        'Immunity ~3 ngày sau đăng ký; lên dashboard sau ngày 1.',
      ],
      links: [
        { label: 'Bittensor mining docs', href: 'https://www.bittensor.com/docs/guides/mining' },
        { label: 'GitHub Investing README', href: 'https://github.com/mobiusfund/investing' },
      ],
    },
    {
      id: 'register-kym',
      title: 'KYM + đăng nhập X → nộp JSON từ app này',
      paragraphs: [
        'KYM (Know Your Miner) là giao diện zero-code: Sign in with X → gắn hotkey đã register → dán strategy JSON (copy từ app này) → Submit. Không bắt buộc PM2 nếu chỉ nộp qua KYM.',
      ],
      bullets: [
        'Mở https://kym.investing88.ai/ → Sign in with X. Dùng tài khoản X thật; theo dõi @Investing88ai để cập nhật rule.',
        'Trên app này: Generate / chỉnh danh mục → Copy JSON. Format: object với `"_": 0` (Alpha, key = netuid số) hoặc `"_": 1` (US stocks, key = ticker chuỗi); giá trị = trọng số (short cổ phiếu = số âm).',
        'Ví dụ Alpha: `{"_":0,"3":0.2,"8":0.15,"19":0.1,…}` — phần chưa allocate = cash giả định. Ví dụ stocks: `{"_":1,"AAPL":0.1,"MSFT":0.1,…}`.',
        'Dán JSON vào KYM gắn hotkey đã register SN88 → Submit. Đọc kỹ message API (thiếu stake/paid, dedupe, format…).',
        'Rebalance: sửa trên app → copy JSON mới → submit lại KYM (hoặc cập nhật file `Investing/strat/<ss58>` nếu chạy miner CLI).',
        'Nên cài repo để backtest `Investing/bin/simst` trước khi live.',
        'Theo dõi https://db.investing88.ai — strategy hiện ngay; điểm ngày Alpha 00:00 UTC / stocks 06:00 UTC.',
      ],
      links: [
        { label: 'KYM 88', href: 'https://kym.investing88.ai/' },
        { label: 'Dashboard', href: 'https://db.investing88.ai' },
        { label: 'X @Investing88ai', href: 'https://x.com/Investing88ai' },
        { label: 'Discord Investing', href: 'https://discord.com/channels/799672011265015819/1358854051634221328' },
      ],
    },
    {
      id: 'register-cli',
      title: 'Chạy miner CLI (tuỳ chọn, song song KYM)',
      paragraphs: [
        'Muốn miner tự nộp từ file local (và nhận synapse), cài repo + PM2 theo README chính thức:',
      ],
      bullets: [
        'Setup: `sudo apt update && sudo apt install npm -y && sudo npm install pm2 -g`',
        '`git clone https://github.com/mobiusfund/investing && cd investing`',
        'Tuỳ chọn venv: `python -m venv .venv && . .venv/bin/activate` rồi `python -m pip install -e .`',
        'Tạo `Investing/strat/<hotkey_ss58>` chứa dict phân bổ (copy JSON từ app). Tên file = đúng ss58 hotkey; file rỗng bị bỏ qua.',
        '`pm2 start neurons/miner.py --name investing-miner -- --wallet.name <cold> --wallet.hotkey <hot> --netuid 88`',
        'Testnet thử kết nối: thêm `#339 --subtensor.network test` (nhưng strategy testnet không được chấm).',
        'Nhiều miner một máy: thêm `--axon.port 8092` (+ port khác) và mỗi hotkey một file strat.',
        'Miner gọi `api.rev(ss58)` khi file strat mới hơn `.last-update`. Đổi timestamp (không đổi nội dung) cũng tính rebalance.',
        'Backtest: `Investing/bin/simst -h` / `simst alpha.csv` / `simst stock.csv`.',
        'Điểm khớp incentive on-chain: `Investing/bin/validator` (xem README).',
      ],
    },
  ],

  en: [
    {
      id: 'rules-overview',
      title: 'Subnet 88 rules (Investing)',
      paragraphs: [
        'SN88 is a Bittensor Decentralized AUM subnet: miners submit asset-allocation strategies; validators score return, risk, slippage, and timeframe, then rank for emissions.',
        'Two live asset classes: Tao/Alpha (`_\': 0`) and US stocks (`_\': 1`). You cannot switch asset class after a strategy is submitted.',
      ],
    },
    {
      id: 'rules-alloc',
      title: 'Allocation rules (strategy file)',
      paragraphs: [
        'A strategy is a Python dict (file under Investing/strat/, filename = hotkey ss58). The `_` key is the asset class.',
      ],
      bullets: [
        'Tao/Alpha (`_\': 0`): other keys are integer netuids; no shorts (values ≥ 0); |allocation| sum ≤ 1.',
        'Subnet 0 and nonexistent netuids count as TAO/cash (0% dividend).',
        'US stocks (`_\': 1`): keys are case-sensitive tickers; shorts allowed (negative weights); |allocation| sum ≤ 1.',
        'Empty key `\'\'` or unsupported tickers = USD/cash. Some fixed-income ETFs also count as cash in scoring.',
        'Rebalance = change weights or touch the file timestamp → miner resubmits; incurs slippage + stake/unstake fees (Alpha) or trading fees (stocks).',
      ],
    },
    {
      id: 'rules-ops',
      title: 'Miner operations rules',
      paragraphs: [
        'Daily scoring: Tao/Alpha at 00:00 UTC; US stocks at 06:00 UTC. Strategy updates show on the dashboard immediately; validator-aligned scores via Investing/bin/validator.',
      ],
      bullets: [
        'US stocks in-session: MOO/MOC only — submit before 09:28 and 15:50 Eastern to count.',
        'UID space / emissions follow the subnet asset ratio API (subject to change).',
        'Anti-spam: coldkey Alpha requirement (currently ~192 staked + 64 paid — adjustable).',
        'New miners: appear on the dashboard after day 1; ~3-day immunity.',
        'Dedupe: Euclidean distance between L1-normalized allocation vectors < 0.01 → the later submission is heavily penalized (near-zero when fresh, recovers ~30 days). Same relative weights with different cash still collide.',
        'Testnet is connection-only — testnet strategies are not scored.',
      ],
    },
    {
      id: 'rules-score',
      title: 'Scoring formula',
      paragraphs: [
        'score = MAR × LSR × odds% × daily%, where:',
      ],
      bullets: [
        'return% = total PnL / fund × 100; risk% = max drawdown%; MAR = return% / risk% (early floor R_init = 5 / √days).',
        'LSR = Σpnl / Σ|pnl| (Sharpe-like; empirically ≈ Sharpe/10).',
        'odds% = 50 + (Kelly/2)×100; Kelly from win-day probability and pavg%/lavg% (Mobius normalization).',
        'daily% = equivalent daily growth implied by return% over investing days.',
        'Assumed fund: Alpha = 2,000 TAO; US stocks = $10,000,000. Alpha adds validator-delegation dividends (default 18% take).',
        'Rolling window: currently 50 days for all assets.',
        'Miners < 30 days: score × (days/30). Daily profit outliers clipped (N = 2).',
        'Short + cash penalty: score × max(1 − short&cash alloc, 0.01).',
        'DEC: if days > 5, dec = (last_active/20)²; score × (1 − min(dec, 1)) — rewards periodic rebalancing.',
        'Cash / short (live code): score × max((1 − cash)^CASH_DECAY, 0.01) with CASH_DECAY = 1 — idle cash outside the book multiplies score down hard (floor 0.01). See “Cash & assumed fund” below.',
      ],
    },
    {
      id: 'cash-fund',
      title: 'Cash & assumed fund — what if I keep money outside?',
      paragraphs: [
        'Validators simulate a fixed starting fund and apply your allocation table each day. Unallocated weight (and some special keys) counts as cash.',
      ],
      bullets: [
        'Assumed fund: Alpha = 2,000 TAO; US stocks = $10,000,000. This is simulated capital for PnL/score — not TAO you deposit into this app.',
        'If total |weights| of subnets/tickers = 0.7 → ~30% of the fund is cash. Alpha cash (subnet 0, bad netuids, leftover) ≈ 0% dividend; stocks: empty / unsupported tickers / some fixed-income ETFs = USD cash.',
        'Live formula: score × clip((1 − cash)^1, 0.01, 1). Examples: cash 0% → ×1; cash 50% → ×0.5; cash 100% → ×0.01 (floor). Shorts also inflate the “not meaningfully deployed” spirit of the short+cash rule.',
        'Daily PnL only comes from allocated weight (+ Alpha dividends on subnet stake). “Safe” cash outside the book dampens price swings but the score is penalized because the network wants real deployment.',
        'For high scores: deploy nearly all fund into valid, diversified, liquid assets — don’t leave 40–60% cash unless you are deliberately defensive and accept the multiplier.',
        '“TAO sitting in a real coldkey wallet” ≠ strategy cash. Only weights in the submitted dict enter the validator cash formula.',
      ],
    },
    {
      id: 'playbook',
      title: 'What miners should do',
      paragraphs: [
        'Practical loop: build in this app → validate + dedupe check → simst backtest → write strat file named after hotkey → watch dashboard / daily scores.',
      ],
      bullets: [
        'One allocation fingerprint per hotkey — never clone the same JSON across keys.',
        'Favor long-horizon portfolio management (MPT/CAPM) over single-name gambling — matches how MAR/drawdown/odds are scored.',
        'Rebalance deliberately (DEC likes activity) but avoid fee/slippage churn.',
        'Submit Alpha ahead of the 00:00 UTC cycle; hit US MOO/MOC windows when you need session fills.',
        'Backtest with Investing/bin/simst first; expect some block-level divergence vs live.',
      ],
    },
    {
      id: 'risk',
      title: 'Limit risk',
      paragraphs: [
        'The score already punishes drawdowns, idle books, copies, and excess short/cash. Real-world risk control usually helps the metric too.',
      ],
      bullets: [
        'Never all-in one subnet/ticker — entry/exit slippage can cut principal and wreck daily%/MAR.',
        'Cap position size (app generator ≈ 5%/subnet) or keep an equally diversified book.',
        'Avoid overlapping weights with your other strategies (dedupe).',
        'Use cash/shorts intentionally — too much multiplies score down toward 0.01×.',
        'Scale in/out on thin names instead of one huge ticket.',
        'Watch dereg + subnet 0: they become non-dividend cash if left in the book.',
        'Don’t rely on a one-day jackpot — outliers are clipped; the 50-day window is the real arena.',
      ],
    },
    {
      id: 'score-tips',
      title: 'Tips for higher scores',
      paragraphs: [
        'Score rewards steady returns, good win-day odds, low drawdown, and remaining invested (limited idle cash/short) with ongoing rebalances.',
      ],
      bullets: [
        'Raise win-day probability and kb (pavg/lavg) — fewer deep loss days beat a single spike.',
        'Protect max drawdown so MAR stays healthy; smooth equity > flashy return%.',
        'Stay active (timestamp/rebalance) so DEC does not eat emissions.',
        'After day 30 the days/30 haircut ends — graduate the book before then.',
        'Run dedupe before every submit; keep clear distance above 0.01 (app safe target ≈ 0.013).',
        'Benchmark vs the in-app Alpha 1H/1D/1W/1M index: beat the tape over time, don’t just chase it.',
      ],
    },
    {
      id: 'suggest-alpha',
      title: 'Suggested Alpha portfolio shapes',
      paragraphs: [
        'Pick a book “shape” that matches your risk — combine layers instead of one metric.',
      ],
      bullets: [
        'High-liquidity core (top liquidity): low slippage on cash-in/out — keep this as the majority weight.',
        'Emission satellites that still sit in decent liquidity tiers — balance yield vs exit ability.',
        'Avoid “⚡ emission-only / poor liquidity”: easy entry, expensive exit, real drawdowns worse than charts.',
        'Small growth basket (1D/1W momentum) with tight per-name caps — satellite, not the whole fund.',
        'Extreme Fear readings: accumulate liquid core slowly; don’t FOMO a single netuid.',
        'Drop dereg/root early; don’t let phantom cash crowd out dividend-paying alpha.',
        '8–20+ subnet books are easier to dedupe-separate and less idiosyncratic than 2–3 names.',
        'When the Alpha index is red on 1D/1W: cut momentum satellites, hold liquid core.',
        'When it’s strongly green: add satellites modestly, still respect caps and re-check dedupe.',
        'Split hotkeys by style (core / satellite / defensive) instead of cloning one dict.',
      ],
    },
    {
      id: 'suggest-stock',
      title: 'Suggested US stock portfolio shapes',
      paragraphs: [
        'Universe is mostly large-cap; fills cluster around open/close — trade with session liquidity.',
      ],
      bullets: [
        'Large-cap / high market-cap + high traded value (pv) core: low slip, MOO/MOC friendly.',
        'Avoid single-sector concentration — sector beta creates synchronized drawdowns.',
        'Keep shorts controlled: scoring penalizes short+cash; shorts are hedges, not the main thesis.',
        'Limit “cash ETF disguised as investment” if you care about score — many fixed-income ETFs count as cash.',
        'Rebalance on a calendar (e.g. weekly) before 09:28 / 15:50 ET windows instead of random intraday churn.',
        'Blend stable mc names with liquid quality rather than chasing one-day volume spikes.',
        'Roughly 15–40 tickers is usually diverse yet manageable; ultra-thin books collide and skew scores.',
        'After large news gaps: wait for liquidity to normalize before rotating large weights.',
      ],
    },
    {
      id: 'suggest-mix',
      title: 'More cross-asset suggestions',
      paragraphs: [
        'Patterns miners often use to cut risk while staying competitive on score:',
      ],
      bullets: [
        'Barbell: ~60–70% liquid core + ~20–30% alpha satellites + a small flexible sleeve — never let satellites dominate.',
        'Defensive mode: when the market index stays weak, raise core weight and cut momentum leverage.',
        'Dedupe-aware sizing: after picking names, lightly perturb weights or swap 1–2 satellites across hotkeys.',
        'Liquidity ladder: fund/exit from high → low liquidity; never dump the thinnest names first.',
        'Emission ≠ exit: high emission only helps if you can sell — always cross-check ⚡💧 tiers in-app.',
        'Rebalance journal: note why you changed the book — avoid emotional tweaks that look “active” to DEC but hurt PnL.',
        'Multi-miner on one box: separate axon ports + strat files; never share one allocation.',
        'Optimize for the 50-day window, not a single hot week — that matches validator scoring.',
      ],
    },
    {
      id: 'register-wallet',
      title: 'Register wallet & join Subnet 88',
      paragraphs: [
        'Do this on your miner machine (Ubuntu 22.04 recommended). Do not run as root. You need a Bittensor coldkey + hotkey. Anti-spam Alpha is reflected on the coldkey — you do not transfer 64 α to the hotkey.',
      ],
      bullets: [
        'Install btcli / Bittensor per official docs (docs.learnbittensor.org / bittensor.com mining guides).',
        'Create wallets: `btcli wallet new_coldkey --wallet.name <cold>` then `btcli wallet new_hotkey --wallet.name <cold> --wallet.hotkey <hot>`.',
        'Fund the coldkey with enough TAO for burn register + fees. Check current burn: `btcli subnet show --netuid 88` or `btcli query burn --netuid 88` (btcli version dependent).',
        'Register miner on mainnet SN88: `btcli subnet register --netuid 88 --wallet.name <cold> --wallet.hotkey <hot>` (some builds: `btcli tx burned-register --netuid 88 -w <cold>`). Testnet netuid 339 is connection-only — testnet strategies are not scored.',
        'Confirm UID: `btcli wallet overview --wallet.name <cold>` — the hotkey must hold a slot on netuid 88.',
        'Anti-spam UID (Investing README, adjustable): coldkey needs ~192 Alpha staked + 64 Alpha paid. Totals are reflected on the coldkey — do not send 64 α to the hotkey; don’t confuse with miner/validator counts on explorers.',
        'Stake SN88 Alpha (example): `btcli stake add --netuid 88 --wallet.name <cold> --amount <…>` until staked ≥ ~192 α (cross-check live wallet balances).',
        '64 α “paid”: Alpha spent/paid under subnet mechanics, still reflected on the coldkey. Watch balances + API/KYM messages on submit; top up if short, then retry.',
        '~3-day immunity after register; appear on the dashboard after day 1.',
      ],
      links: [
        { label: 'Bittensor mining docs', href: 'https://www.bittensor.com/docs/guides/mining' },
        { label: 'GitHub Investing README', href: 'https://github.com/mobiusfund/investing' },
      ],
    },
    {
      id: 'register-kym',
      title: 'KYM + Sign in with X → submit JSON from this app',
      paragraphs: [
        'KYM (Know Your Miner) is the zero-code UI: Sign in with X → attach a registered hotkey → paste strategy JSON (copied from this app) → Submit. PM2 is optional if you only submit via KYM.',
      ],
      bullets: [
        'Open https://kym.investing88.ai/ → Sign in with X. Use a real X account; follow @Investing88ai for rule updates.',
        'In this app: Generate / edit the portfolio → Copy JSON. Format: object with `"_": 0` (Alpha, keys = numeric netuids) or `"_": 1` (US stocks, keys = ticker strings); values = weights (stock shorts = negative).',
        'Alpha example: `{"_":0,"3":0.2,"8":0.15,"19":0.1,…}` — unallocated weight = assumed cash. Stocks example: `{"_":1,"AAPL":0.1,"MSFT":0.1,…}`.',
        'Paste into KYM bound to a hotkey already registered on SN88 → Submit. Read API messages carefully (missing stake/paid, dedupe, format…).',
        'Rebalance later: edit here → copy new JSON → resubmit on KYM (or update `Investing/strat/<ss58>` if you run miner CLI).',
        'Still install the repo to backtest with `Investing/bin/simst` before going live.',
        'Track results on https://db.investing88.ai — strategy shows immediately; daily scores Alpha 00:00 UTC / stocks 06:00 UTC.',
      ],
      links: [
        { label: 'KYM 88', href: 'https://kym.investing88.ai/' },
        { label: 'Dashboard', href: 'https://db.investing88.ai' },
        { label: 'X @Investing88ai', href: 'https://x.com/Investing88ai' },
        { label: 'Discord Investing', href: 'https://discord.com/channels/799672011265015819/1358854051634221328' },
      ],
    },
    {
      id: 'register-cli',
      title: 'Run miner CLI (optional, alongside KYM)',
      paragraphs: [
        'To have a miner submit from a local file (and serve synapses), install the repo + PM2 per the official README:',
      ],
      bullets: [
        'Setup: `sudo apt update && sudo apt install npm -y && sudo npm install pm2 -g`',
        '`git clone https://github.com/mobiusfund/investing && cd investing`',
        'Optional venv: `python -m venv .venv && . .venv/bin/activate` then `python -m pip install -e .`',
        'Create `Investing/strat/<hotkey_ss58>` with the allocation dict (copy JSON from this app). Filename must equal the hotkey ss58; empty files are ignored.',
        '`pm2 start neurons/miner.py --name investing-miner -- --wallet.name <cold> --wallet.hotkey <hot> --netuid 88`',
        'Connection testnet: `#339 --subtensor.network test` (testnet strategies are not scored).',
        'Multiple miners on one box: add `--axon.port 8092` (+ other ports) and one strat file per hotkey.',
        'Miner calls `api.rev(ss58)` when the strat file is newer than `.last-update`. Touching the timestamp (no content change) also counts as a rebalance.',
        'Backtest: `Investing/bin/simst -h` / `simst alpha.csv` / `simst stock.csv`.',
        'On-chain score check: `Investing/bin/validator` (see README).',
      ],
    },
  ],
};
