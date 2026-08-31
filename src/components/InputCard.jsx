import { useState, useRef } from 'react';

export default function InputCard({ onSubmit, onClear, loadedCount }) {
  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState('');
  const [charCount, setCharCount] = useState(0);
  const textareaRef = useRef(null);

  function handleInput(e) {
    setCharCount(e.target.value.length);
    setError('');
  }

  function handleSubmit() {
    const raw = textareaRef.current.value.trim();
    try {
      let parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
        const arrKey = Object.keys(parsed).find(
          (k) =>
            Array.isArray(parsed[k]) &&
            parsed[k].length > 0 &&
            typeof parsed[k][0] === 'object'
        );
        if (arrKey) parsed = parsed[arrKey];
        else parsed = [parsed];
      }
      if (!Array.isArray(parsed)) parsed = [parsed];
      if (!parsed.length || typeof parsed[0] !== 'object')
        throw new Error('Cần array of objects');
      setError('');
      setCollapsed(true);
      onSubmit(parsed);
    } catch (e) {
      setError('⚠ ' + e.message);
    }
  }

  function handleClear() {
    textareaRef.current.value = '';
    setCharCount(0);
    setError('');
    setCollapsed(false);
    onClear();
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Card Head */}
      <div
        className={`flex items-center justify-between px-8 py-3 bg-slate-800 cursor-pointer select-none ${collapsed ? '' : 'border-b border-slate-700'}`}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-4">
          <span className="text-violet-500 text-xs transition-transform duration-200">
            {collapsed ? '▸' : '▾'}
          </span>
          <span className="text-xs font-bold tracking-wider text-slate-400">
            DATA INPUT
          </span>
          {loadedCount > 0 && (
            <span className="bg-emerald-400 text-slate-950 text-xs font-bold px-4 rounded-xl">
              ✓ {loadedCount} subnets
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          Paste JSON array hoặc single object
        </span>
      </div>

      {/* Card Body */}
      {!collapsed && (
        <div className="p-8">
          <textarea
            ref={textareaRef}
            className={`w-full min-h-40 bg-slate-950 border rounded-lg text-emerald-400 font-mono text-xs p-4 resize-y outline-none leading-relaxed transition-colors duration-200 focus:border-violet-500 ${
              error ? 'border-red-400' : 'border-slate-700'
            }`}
            placeholder={`[
  { "netuid": 1, "name": "...", "price_change_1_day": "2.5", ... },
  { "netuid": 2, ... }
]`}
            onInput={handleInput}
          />
          {error && (
            <div className="text-red-400 text-xs mt-4">{error}</div>
          )}
          <div className="flex items-center gap-4 flex-wrap mt-8">
            <button
              className="px-8 py-4 border-none rounded-lg bg-violet-500 text-white font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:bg-violet-400"
              onClick={handleSubmit}
            >
              ▶ SUBMIT DATA
            </button>
            {loadedCount > 0 && (
              <button
                className="px-8 py-4 bg-transparent text-slate-400 border border-slate-600 rounded-lg font-mono text-xs font-bold tracking-wider cursor-pointer transition-all duration-150 hover:text-red-400 hover:border-red-400"
                onClick={handleClear}
              >
                ✕ CLEAR
              </button>
            )}
            <span className="ml-auto text-xs text-slate-600">
              {charCount} ký tự
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
