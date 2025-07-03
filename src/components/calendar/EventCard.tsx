import React, { useRef, useCallback } from 'react';
import { CalendarEvent } from '../../types/calendar';

interface EventCardProps {
  event: CalendarEvent;
  onDragStart: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onEventClick: (event: CalendarEvent) => void;
  isDragging?: boolean;
  style?: React.CSSProperties;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  onDragStart,
  onDragMove,
  onDragEnd,
  onEventClick,
  isDragging = false,
  style
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const dragState = useRef({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    longPressTriggered: false,
    hasMoved: false
  });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    
    dragState.current = {
      isDragging: false,
      startPos: { x: touch.clientX, y: touch.clientY },
      longPressTriggered: false,
      hasMoved: false
    };

    // Start long press timer (500ms like iOS)
    longPressTimer.current = setTimeout(() => {
      if (!dragState.current.hasMoved) {
        dragState.current.longPressTriggered = true;
        dragState.current.isDragging = true;
        
        // Add haptic feedback simulation
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Visual feedback
        if (cardRef.current) {
          cardRef.current.style.transform = 'scale(1.05)';
          cardRef.current.style.zIndex = '1000';
          cardRef.current.style.opacity = '0.9';
          cardRef.current.style.boxShadow = '0 10px 25px rgba(0,0,0,0.3)';
        }
        
        onDragStart(event, dragState.current.startPos);
        console.log('🚀 Drag started for:', event.title);
      }
    }, 500);
  }, [event, onDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - dragState.current.startPos.x);
    const deltaY = Math.abs(touch.clientY - dragState.current.startPos.y);
    
    // If moved more than 10px, consider it as movement
    if (deltaX > 10 || deltaY > 10) {
      dragState.current.hasMoved = true;
      
      // If we haven't triggered long press yet, cancel it
      if (!dragState.current.longPressTriggered && longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        return;
      }
    }

    if (dragState.current.isDragging && dragState.current.longPressTriggered) {
      // Don't call preventDefault here - it causes the error
      e.stopPropagation();
      
      // Update drag position
      onDragMove({ x: touch.clientX, y: touch.clientY });
      console.log('📱 Dragging to:', touch.clientY);
    }
  }, [onDragMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }

    // If it was a simple tap (no movement, no long press), handle as click
    if (!dragState.current.hasMoved && !dragState.current.longPressTriggered) {
      console.log('👆 Simple tap on:', event.title);
      onEventClick(event);
    }

    if (dragState.current.isDragging && dragState.current.longPressTriggered) {
      console.log('🎯 Drag ended for:', event.title);
      onDragEnd();
      
      // Reset visual state
      if (cardRef.current) {
        cardRef.current.style.transform = '';
        cardRef.current.style.zIndex = '';
        cardRef.current.style.opacity = '';
        cardRef.current.style.boxShadow = '';
      }
    }

    // Reset state
    dragState.current = {
      isDragging: false,
      startPos: { x: 0, y: 0 },
      longPressTriggered: false,
      hasMoved: false
    };
  }, [onDragEnd, onEventClick, event]);

  // Handle regular click for desktop
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🖱️ Desktop click on:', event.title);
    onEventClick(event);
  }, [onEventClick, event]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const duration = event.endTime.getTime() - event.startTime.getTime();
  const durationMinutes = duration / (1000 * 60);
  const height = Math.max(40, (durationMinutes / 60) * 80);

  return (
    <div
      ref={cardRef}
      className={`
        w-full rounded-lg shadow-md border-l-4 overflow-hidden
        transition-all duration-200 select-none cursor-pointer
        ${isDragging ? 'opacity-70 scale-105 z-50' : 'z-10'}
        hover:shadow-lg active:scale-95
      `}
      style={{
        backgroundColor: `${event.color}20`,
        borderLeftColor: event.color,
        height: `${height}px`,
        touchAction: 'none', // This prevents default touch behaviors
        ...style
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      <div className="p-2 h-full flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-800 truncate">
            {event.title}
          </h3>
          {!event.isAllDay && (
            <p className="text-xs text-gray-600">
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </p>
          )}
        </div>
        {event.description && (
          <p className="text-xs text-gray-500 truncate mt-1">
            {event.description}
          </p>
        )}
      </div>
    </div>
  );
};

export default EventCard;