import { useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { parseNumericText, sanitizeNumericText } from '@/utils/numeric';
import { cn } from '@/utils/classNames';

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>;

export interface NumericTextInputProps extends NativeInputProps {
  /** Chuỗi (chế độ string) hoặc số (chế độ number). */
  value?: string | number | null;
  /** Có `onChange(string)` → controlled theo chuỗi hiển thị (ô trống vẫn rỗng). */
  onChange?: (text: string) => void;
  /** Có `onValue(number)` (và không có onChange) → ô trống hiển thị rỗng nhưng callback nhận 0. */
  onValue?: (value: number) => void;
  /** Chỉ nhận số nguyên. */
  integer?: boolean;
}

/**
 * Input text chỉ nhận số.
 * - `value` + `onChange(string)`: controlled theo chuỗi hiển thị (ô trống vẫn rỗng).
 * - `value` (number) + `onValue(number)`: ô trống hiển thị rỗng nhưng callback nhận 0.
 */
export function NumericTextInput({
  value,
  onChange,
  onValue,
  integer = false,
  className,
  ...rest
}: NumericTextInputProps) {
  const isStringMode = typeof onChange === 'function';
  const [text, setText] = useState<string>(() => (value == null || value === '' ? '' : String(value)));

  // Chế độ number: đồng bộ lại chuỗi hiển thị khi giá trị bên ngoài đổi THỰC SỰ
  // (khác giá trị đã parse từ chuỗi đang gõ) — để không phá chuỗi đang nhập dở.
  // Dùng pattern "adjust state on prop change" (so với giá trị lần render trước)
  // thay vì effect, để không gây thêm một lượt render.
  const [prevValue, setPrevValue] = useState(value);
  if (!isStringMode && value !== prevValue) {
    setPrevValue(value);
    const parsed = parseNumericText(text, 0);
    const num = value == null || value === '' || isNaN(Number(value)) ? 0 : Number(value);
    if (num !== parsed) setText(value == null || value === '' ? '' : String(value));
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
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
      className={cn('field font-mono tabular-nums', className)}
    />
  );
}
