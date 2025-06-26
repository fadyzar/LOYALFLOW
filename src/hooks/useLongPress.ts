import { useRef } from 'react';

/**
 * קריאה ללחיצה ארוכה (Long Press)
 * @param callback הפונקציה שתופעל אחרי זמן ההמתנה
 * @param ms זמן ההמתנה בלחיצה (ברירת מחדל: 300ms)
 */
export function useLongPress(callback: () => void, ms = 300) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const targetRef = useRef<EventTarget | null>(null);

  // זיהוי מובייל
  const isMobile = typeof window !== 'undefined' &&
    /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(window.navigator.userAgent);

  const start = (e: React.PointerEvent) => {
    // מניעת ברירת מחדל (zoom/magnifier) רק במובייל
    if (isMobile && e.pointerType === 'touch') {
      e.preventDefault();
    }
    // לוודא שזו רק אצבע אחת ולא עט/עכבר נוסף
    if (e.pointerType === 'touch' || e.pointerType === 'mouse') {
      console.log('👆 Pointer Down:', e.pointerType);
      targetRef.current = e.target;
      timerRef.current = setTimeout(() => {
        console.log('⏱ לחיצה ארוכה הופעלה');
        callback();
      }, ms);
    }
  };

  const clear = (e: React.PointerEvent) => {
    console.log('🛑 Pointer Up:', e.pointerType);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerMove: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    // מניעת תפריט הקשר/מגדלת רק במובייל
    onContextMenu: isMobile ? (e: React.MouseEvent) => e.preventDefault() : undefined,
  };
}
