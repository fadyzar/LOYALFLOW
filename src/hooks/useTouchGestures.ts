import { useCallback, useRef } from 'react';
import { TouchGesture } from '../types/calendar';

interface UseTouchGesturesProps {
  onGesture: (gesture: TouchGesture) => void;
  threshold?: number;
}

export const useTouchGestures = ({ onGesture, threshold = 50 }: UseTouchGesturesProps) => {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const tapCount = useRef(0);
  const tapTimer = useRef<NodeJS.Timeout>();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Long press detection
    if (deltaTime > 500 && distance < 10) {
      onGesture({
        type: 'longpress',
        position: { x: touch.clientX, y: touch.clientY }
      });
      touchStart.current = null;
      return;
    }

    // Swipe detection
    if (distance > threshold && deltaTime < 300) {
      let direction: 'left' | 'right' | 'up' | 'down';
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onGesture({
        type: 'swipe',
        direction,
        position: { x: touch.clientX, y: touch.clientY }
      });
      touchStart.current = null;
      return;
    }

    // Tap detection (including double tap)
    if (distance < 10 && deltaTime < 300) {
      tapCount.current++;
      
      if (tapCount.current === 1) {
        tapTimer.current = setTimeout(() => {
          onGesture({
            type: 'tap',
            position: { x: touch.clientX, y: touch.clientY }
          });
          tapCount.current = 0;
        }, 300);
      } else if (tapCount.current === 2) {
        if (tapTimer.current) {
          clearTimeout(tapTimer.current);
        }
        onGesture({
          type: 'doubletap',
          position: { x: touch.clientX, y: touch.clientY }
        });
        tapCount.current = 0;
      }
    }

    touchStart.current = null;
  }, [onGesture, threshold]);

  return {
    handleTouchStart,
    handleTouchEnd
  };
};