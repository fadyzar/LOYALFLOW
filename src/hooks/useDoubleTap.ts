import { useRef } from 'react';

export function useDoubleTap(callback: () => void, delay = 300) {
  const lastTapRef = useRef<number | null>(null);

  const onClick = () => {
    const now = Date.now();

    if (lastTapRef.current && now - lastTapRef.current < delay) {
      callback(); // לחיצה כפולה זוהתה
      lastTapRef.current = null;
    } else {
      lastTapRef.current = now;
    }
  };

  return { onClick };
}
