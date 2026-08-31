import { useEffect, useState } from 'react';

// Chỉ giữ chữ số (và một dấu chấm nếu cho phép thập phân). Chuỗi rỗng được giữ nguyên.
export function sanitizeNumericText(raw, { integer = false } = {}) {
  if (raw == null) return '';
  let s = String(raw).replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (integer) return dot === -1 ? s : s.slice(0, dot);
  if (dot === -1) return s;
  return s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
}

// Ô trống / chỉ dấu chấm → 0; còn lại parseFloat, NaN → 0.
export function parseNumericText(s, fallback = 0) {
  if (s == null || s === '' || s === '.') return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

/**
 * Input text chỉ nhận số.
 * - `value` + `onChange(string)`: controlled theo chuỗi hiển thị (ô trống vẫn rỗng).
 * - `value` (number) + `onValue(number)`: ô trống hiển thị rỗng nhưng callback nhận 0.
 */
export default function NumericTextInput({
  value,
  onChange,
  onValue,
  integer = false,
  className,
  ...rest
}) {
  const isStringMode = typeof onChange === 'function';
  const [text, setText] = useState(() => (
    value == null || value === '' ? '' : String(value)
  ));

  useEffect(() => {
    if (isStringMode) return;
    setText((current) => {
      const parsed = parseNumericText(current, 0);
      const num = value == null || value === '' || isNaN(Number(value)) ? 0 : Number(value);
      if (num === parsed) return current;
      return value == null || value === '' ? '' : String(value);
    });
  }, [value, isStringMode]);

  function handleChange(e) {
    const next = sanitizeNumericText(e.target.value, { integer });
    if (isStringMode) {
      onChange(next);
      return;
    }
    setText(next);
    onValue?.(parseNumericText(next, 0));
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      autoComplete="off"
      spellCheck={false}
      value={isStringMode ? (value ?? '') : text}
      onChange={handleChange}
      className={className}
    />
  );
}
