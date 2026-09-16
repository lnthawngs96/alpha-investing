import { useEffect, type RefObject } from 'react';

/**
 * Gọi `onOutside` khi người dùng click / chạm bên ngoài phần tử `ref`,
 * hoặc bấm Escape. Dùng để đóng popover / menu.
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (el && !el.contains(e.target as Node)) onOutside();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOutside();
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, onOutside, enabled]);
}
