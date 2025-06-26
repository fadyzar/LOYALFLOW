import { useRef } from 'react';

export function useLongPress(callback: () => void, ms = 300) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    timerRef.current = setTimeout(callback, ms);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPointerDown: start,  // ⬅️ עובד גם בטאץ' וגם בעכבר
    onPointerUp: clear,
    onPointerMove: clear,
    onPointerCancel: clear,
  };
}

