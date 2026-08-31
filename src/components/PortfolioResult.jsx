import { useState, useRef } from 'react';
import { normalize, formatMetric } from '../utils/helpers';
import { validateTaoAlphaPortfolio } from '../utils/portfolio';
import { sanitizeNumericText } from './NumericTextInput';

export default function PortfolioResult({
  portfolio,
  filteredSubnets,
  metricField,
  editMode,
  onToggleEdit,
  onRegenerate,
  onApplyEdit,
  onSave,
}) {
  const [copyLabel, setCopyLabel] = useState('⎘ COPY JSON');
  const inputRefs = useRef({});

  const entries = Object.entries(portfolio)
    .filter(([k]) => k !== '_')
    .sort((a, b) => b[1] - a[1]);
  const validation = validateTaoAlphaPortfolio(portfolio);
  const { valid, errors, total, cash } = validation;

  function formatPortfolio(obj) {
    // Build chuỗi JSON thủ công để giữ thứ tự value cao → thấp.
    // (JSON.stringify luôn duyệt key số nguyên theo thứ tự tăng dần nên không dùng được ở đây.)
    // Giữ key '_' (asset class Tao/Alpha) ở đầu.
    const sorted = Object.entries(obj)
      .filter(([k]) => k !== '_')
      .sort((a, b) => b[1] - a[1]);
    const lines = [
      `  "_": ${obj._ ?? 0}`,
      ...sorted.map(([k, v]) => `  ${k}: ${v}`),
    ];
    return `{\n${lines.join(',\n')}\n}`;
  }

  function handleCopy() {
    if (!valid) return;
    navigator.clipboard
      .writeText(formatPortfolio(portfolio))
      .then(() => {
        setCopyLabel('✓ ĐÃ COPY');
        setTimeout(() => setCopyLabel('⎘ COPY JSON'), 2000);
      });
  }

  function handleApply() {
    const netuids = Object.keys(portfolio).filter((k) => k !== '_');
    const vals = netuids.map((id) => {
      const el = inputRefs.current[id];
      const v = el ? parseFloat(el.value) : portfolio[id] * 100;
      return isNaN(v) ? 0 : Math.max(0, v);
    });
    const norm = normalize(vals);
    const newPortfolio = { _: 0 };
    netuids.forEach((id, i) => {
      newPortfolio[id] = norm[i];
    });
    onApplyEdit(newPortfolio);
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 flex flex-col gap-4 min-w-0 overflow-hidden flex-1 min-h-0">
      {/* Head */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-bold tracking-wider text-slate-400">
            PORTFOLIO ALLOCATION
          </div>
          <div className="text-xs text-slate-400 mt-4">
            Tổng:{' '}
            <span className={valid ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {total.toFixed(6)}
            </span>
            {cash > 0 && (
              <span className="text-slate-500"> · Cash: {cash.toFixed(6)}</span>
            )}
            <span className={`ml-2 ${valid ? 'text-emerald-400' : 'text-red-400'}`}>
              {valid ? '✓ Hợp lệ (Tao/Alpha)' : '✕ Không hợp lệ'}
            </span>
          </div>
          {!valid && (
            <ul className="text-xs text-red-400 mt-2 list-disc pl-4 space-y-1">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-4 flex-wrap">
          <button
            className="px-4 py-4 bg-transparent border border-slate-600 rounded-lg text-slate-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:text-slate-100 hover:border-slate-400 whitespace-nowrap"
            onClick={onToggleEdit}
          >
            {editMode ? '✕ HỦY' : '✎ CHỈNH SỬA'}
          </button>
          <button
            className="px-4 py-4 bg-violet-500/10 border border-violet-500 rounded-lg text-violet-500 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-violet-500 hover:text-white whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleCopy}
            disabled={!valid}
          >
            {copyLabel}
          </button>
          <button
            className="px-4 py-4 bg-transparent border border-slate-600 rounded-lg text-slate-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:text-slate-100 hover:border-slate-400 whitespace-nowrap"
            onClick={onRegenerate}
          >
            ⟳ TẠO LẠI
          </button>
          <button
            className="px-4 py-4 bg-emerald-400/10 border border-emerald-400 rounded-lg text-emerald-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-emerald-400 hover:text-slate-950 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={onSave}
            disabled={!valid}
          >
            ⬇ LƯU DANH MỤC
          </button>
          {editMode && (
            <button
              className="px-4 py-4 bg-transparent border border-emerald-400 rounded-lg text-emerald-400 font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-emerald-400 hover:text-slate-950 whitespace-nowrap"
              onClick={handleApply}
            >
              ✓ ÁP DỤNG & CÂN BẰNG
            </button>
          )}
        </div>
      </div>

      {/* Bar list */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
        {entries.map(([netuid, weight]) => {
          const s = filteredSubnets.find((x) => String(x.netuid) === netuid);
          const pct = (weight * 100).toFixed(2);
          return (
            <div key={netuid} className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-violet-500 min-w-[32px]">
                  #{netuid}
                </span>
                <span className="text-xs text-slate-100 flex-1">
                  {s?.name || 'Unknown'}
                </span>
                {s && metricField && !isNaN(parseFloat(s[metricField])) && (() => {
                  const val = parseFloat(s[metricField]);
                  return (
                    <span className={`text-xs ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatMetric(val, metricField)}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-700 rounded overflow-hidden">
                  <div
                    className="h-full rounded bg-gradient-to-r from-violet-500 to-emerald-400 transition-[width] duration-400 ease-out"
                    style={{ width: `${Math.min(100, weight * 100)}%` }}
                  />
                </div>
                {editMode ? (
                  <input
                    ref={(el) => (inputRefs.current[netuid] = el)}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    defaultValue={pct}
                    onChange={(e) => {
                      e.target.value = sanitizeNumericText(e.target.value);
                    }}
                    className="w-20 bg-slate-950 border border-violet-500 rounded-lg text-slate-100 font-mono text-xs px-4 py-4 outline-none text-right"
                  />
                ) : (
                  <span className="text-xs text-slate-100 min-w-[60px] text-right tabular-nums">
                    {pct}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON output */}
      <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden shrink-0 max-h-[160px]">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-bold tracking-wider text-slate-600">
          JSON OUTPUT
        </div>
        <div className="px-6 py-2 font-mono text-xs text-emerald-400 leading-relaxed whitespace-pre overflow-auto max-h-[120px]">
          {formatPortfolio(portfolio)}
        </div>
      </div>
    </div>
  );
}
