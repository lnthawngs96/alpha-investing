/** Giá trị được chấp nhận trong `cn()`: chuỗi, hoặc falsy để bỏ qua. */
export type ClassValue = string | false | null | undefined | 0;

/**
 * Ghép class Tailwind có điều kiện, bỏ qua giá trị falsy.
 * Ví dụ: cn('px-2', active && 'bg-accent', error ? 'border-negative' : 'border-line')
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
