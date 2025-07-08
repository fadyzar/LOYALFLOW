import React, { useMemo, useState, useEffect } from 'react';
import { CalendarEvent, DragState } from '../../types/calendar';
import EventCard from './EventCard';
import { useNavigate } from 'react-router-dom';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  dragState: DragState;
  onDragStart: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onTimeSlotDoubleClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  businessOpenTime: string;
  businessCloseTime: string;
  currentTime?: Date;
  dragPreviewEvent?: CalendarEvent | null;
  firstEventRef?: React.RefObject<HTMLDivElement>;
  onTimeSlotClick?: (date: Date) => void; // הוסף prop אופציונלי
}

const CELL_HEIGHT = 80;
const calendarBg = 'linear-gradient(180deg, #fff 0%, #f3f6fa 100%)';

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  dragState,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTimeSlotDoubleClick,
  onEventClick,
  businessOpenTime,
  businessCloseTime,
  currentTime,
  dragPreviewEvent,
  firstEventRef,
  onTimeSlotClick,
}) => {
  const navigate = useNavigate();
  const [showChoice, setShowChoice] = useState<{ open: boolean; hour: number | null }>({ open: false, hour: null });

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === currentDate.toDateString();
    });
  }, [events, currentDate]);

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = event.startTime.getHours();
    const startMinutes = event.startTime.getMinutes();
    return startHour * CELL_HEIGHT + (startMinutes / 60) * CELL_HEIGHT;
  };

  const getEventHeight = (event: CalendarEvent) => {
    const duration = event.endTime.getTime() - event.startTime.getTime();
    const durationMinutes = duration / (1000 * 60);
    return Math.max(20, (durationMinutes / 60) * CELL_HEIGHT);
  };

  const handleTimeSlotDoubleClick = (hour: number) => {
    const slotDate = new Date(currentDate);
    slotDate.setHours(hour, 0, 0, 0);
    onTimeSlotDoubleClick(slotDate);
  };

  const handleTimeSlotClick = (hour: number) => {
    setShowChoice({ open: true, hour });
  };

  const handleChoice = (type: 'event' | 'appointment') => {
    if (showChoice.hour === null) return;
    const slotDate = new Date(currentDate);
    slotDate.setHours(showChoice.hour, 0, 0, 0);
    setShowChoice({ open: false, hour: null });
    if (type === 'appointment') {
      // נווט ליצירת תור חדש
      navigate('/appointments/new');
    }
    // הסר אפשרות ל-event
  };

  const getTimeInMinutes = (timeStr: string | undefined) => {
    // תמיכה גם בפורמט H:mm וגם HH:mm
    if (!timeStr || typeof timeStr !== 'string') return undefined;
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return undefined;
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    if (isNaN(h) || isNaN(m)) return undefined;
    return h * 60 + m;
  };

  const totalHeight = 24 * CELL_HEIGHT;

  // קבל את שעות הפתיחה/סגירה מה-DB (כמו "09:00" ו-"17:00")
  const openMinutes = getTimeInMinutes(businessOpenTime);
  const closeMinutes = getTimeInMinutes(businessCloseTime);

  // חסום לפני ואחרי שעות הפעילות בלבד (לא פעמיים)
  const earlyHeight =
    openMinutes !== undefined && openMinutes > 0
      ? (openMinutes / 60) * CELL_HEIGHT
      : 0;
  const lateHeight =
    closeMinutes !== undefined && closeMinutes < 24 * 60
      ? totalHeight - (closeMinutes / 60) * CELL_HEIGHT
      : 0;

  // Debug: הדפס את שעות הפעילות ואת החישוב
  console.log('DayView businessOpenTime:', businessOpenTime, 'openMinutes:', openMinutes, 'earlyHeight:', earlyHeight);
  console.log('DayView businessCloseTime:', businessCloseTime, 'closeMinutes:', closeMinutes, 'lateHeight:', lateHeight);

  // highlight לשעה הנוכחית
  const now = currentTime || new Date();
  const [nowState, setNowState] = useState(now);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowState(new Date());
    }, 1000); // עדכן כל שנייה
    return () => clearInterval(interval);
  }, []);

  // קו אדום דק
  const getRedLineTop = () => {
    if (nowState.toDateString() !== currentDate.toDateString()) return null;
    const hour = nowState.getHours();
    const minutes = nowState.getMinutes();
    const seconds = nowState.getSeconds();
    // מיקום מדויק לפי דקות ושניות
    return hour * CELL_HEIGHT + ((minutes + seconds / 60) / 60) * CELL_HEIGHT;
  };

  return (
    <div
      className="flex-1 bg-white rounded-lg overflow-hidden"
      style={{
        position: 'relative',
        background: '#fff',
        minHeight: '100vh',
        height: '100%',
        boxShadow: 'none',
        marginTop: 12,
      }}
    >
      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex w-full overflow-y-auto`}
          style={{
            height: '100vh', // גובה מלא של המסך
            maxHeight: '100vh', // לא לחרוג מגובה המסך
            WebkitOverflowScrolling: 'touch',
            touchAction: dragState.isDragging ? 'none' : 'auto',
            position: 'relative',
            background: 'transparent',
          }}
        >
          {/* Time Column */}
          <div className="w-16 border-r border-gray-200 bg-gray-50 flex-shrink-0 z-10 relative">
            <div style={{ height: `${CELL_HEIGHT * 24}px` }}>
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-20 border-b border-gray-100 flex items-start pt-2 px-2"
                >
                  <span className="text-sm text-gray-500 font-medium">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day Column */}
          <div className="flex-1 relative" style={{ background: 'transparent' }}>
            <div style={{ height: `${CELL_HEIGHT * 24}px`, maxHeight: `${CELL_HEIGHT * 24}px`, overflow: 'hidden' }}>
              {/* Overlay for closed hours */}
              {/* חסום לפני שעת הפתיחה */}
              {earlyHeight > 0 && (
                <div
                  className="absolute w-full"
                  style={{
                    top: 0,
                    height: `${earlyHeight}px`,
                    background: 'repeating-linear-gradient(135deg, #f3f4f6 0px, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)',
                    pointerEvents: 'auto',
                    zIndex: 20,
                    borderBottom: '1px solid #e5e7eb',
                    cursor: 'not-allowed',
                    backdropFilter: 'blur(2px) saturate(1.1)',
                    WebkitBackdropFilter: 'blur(2px) saturate(1.1)',
                    boxShadow: '0 2px 16px 0 #e0e7ef30',
                    transition: 'background 0.3s'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8, // היה top: 8, עכשיו bottom: 8
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: '#b91c1c',
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '0.03em',
                      opacity: 0.7,
                      pointerEvents: 'none'
                    }}
                  >
                    מחוץ לשעות פעילות (לפני פתיחה)
                  </div>
                </div>
              )}
              {/* חסום אחרי שעת הסגירה */}
              {lateHeight > 0 && (
                <div
                  className="absolute w-full"
                  style={{
                    top: `${totalHeight - lateHeight}px`, // <-- זה התיקון הקריטי
                    height: `${lateHeight}px`,
                    background: 'repeating-linear-gradient(135deg, #f3f4f6 0px, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)',
                    pointerEvents: 'auto',
                    zIndex: 20,
                    borderTop: '1px solid #e5e7eb',
                    cursor: 'not-allowed',
                    backdropFilter: 'blur(2px) saturate(1.1)',
                    WebkitBackdropFilter: 'blur(2px) saturate(1.1)',
                    boxShadow: '0 -2px 16px 0 #e0e7ef30',
                    transition: 'background 0.3s'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      color: '#b91c1c',
                      fontWeight: 600,
                      fontSize: 13,
                      letterSpacing: '0.03em',
                      opacity: 0.7,
                      pointerEvents: 'none'
                    }}
                  >
                    מחוץ לשעות פעילות (אחרי סגירה)
                  </div>
                </div>
              )}
              {/* Highlight לשעה הנוכחית */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: `${CELL_HEIGHT}px`,
                  top: `${nowState.getHours() * CELL_HEIGHT}px`,
                  background: 'linear-gradient(90deg, #e0e7ff33 0%, #f0f7ff00 100%)',
                  zIndex: 2,
                  pointerEvents: 'none',
                  borderRadius: 12,
                  transition: 'top 0.3s',
                }}
              />

              {/* קו אדום דק לשעה הנוכחית (עם דקות ושניות) */}
              {getRedLineTop() !== null && (
                <div
                  className="absolute left-0 right-0 z-30"
                  style={{
                    top: `${getRedLineTop()}px`,
                    height: '2px',
                    background: '#ef4444',
                    borderRadius: '2px',
                    boxShadow: '0 0 6px 0 #ef4444a0',
                    transition: 'top 0.2s linear',
                  }}
                >
                  {/* הצג את השעה הנוכחית עם דקות (לדוג' 14:37) - בצד ימין */}
                  <span
                    style={{
                      position: 'absolute',
                      right: 8, // היה left: 8, עכשיו right: 8
                      top: -16,
                      fontSize: 13,
                      color: '#ef4444',
                      background: '#fff',
                      padding: '0 6px',
                      borderRadius: 6,
                      fontWeight: 700,
                      boxShadow: '0 1px 4px #ef44441a',
                      letterSpacing: '0.03em',
                      zIndex: 40,
                    }}
                  >
                    {nowState
                      .toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                  </span>
                </div>
              )}

              {/* Time slots */}
              {hours.map(hour => (
                <div key={hour} className="relative">
                  <div
                    className="h-20 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onDoubleClick={() => handleTimeSlotDoubleClick(hour)}
                    onClick={() => handleTimeSlotClick(hour)}
                  />
                  {[1, 2, 3].map(quarter => (
                    <div
                      key={quarter}
                      className="absolute w-full border-b border-gray-50"
                      style={{ top: `${(quarter * CELL_HEIGHT) / 4}px`, height: '1px' }}
                    />
                  ))}
                </div>
              ))}

              {/* Events */}
              <div className="absolute top-0 left-0 right-0 z-20">
                {dayEvents.map((event, idx) => {
                  const eventTop = getEventPosition(event);
                  const eventHeight = getEventHeight(event);
                  let adjustedTop = eventTop;

                  if (dragState.isDragging && dragState.draggedEvent?.id === event.id) {
                    const dragDiff = dragState.currentPosition.y - dragState.startPosition.y;
                    adjustedTop += dragDiff;
                  }

                  return (
                    <div
                      key={event.id}
                      ref={idx === 0 && firstEventRef ? firstEventRef : undefined}
                      className="absolute"
                      style={{
                        top: `${adjustedTop}px`,
                        left: '0px',
                        right: '0px',
                        height: `${eventHeight}px`,
                      }}
                    >
                      <EventCard
                        event={event}
                        onDragStart={onDragStart}
                        onDragMove={onDragMove}
                        onDragEnd={onDragEnd}
                        onEventClick={onEventClick}
                        isDragging={dragState.isDragging && dragState.draggedEvent?.id === event.id}
                      />
                    </div>
                  );
                })}
                {/* אין תורים */}
                {dayEvents.length === 0 && (
                  <div
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center text-gray-300 text-sm select-none pointer-events-none"
                  >
                    אין תורים ליום זה
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* בחירת סוג יצירה */}
      {showChoice.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col gap-4 min-w-[260px]">
            <div className="text-lg font-bold text-gray-700 text-center mb-2"></div>
            {/* השאר רק את כפתור תור חדש */}
            <button
              className="w-full py-2 rounded-lg bg-purple-500 text-white font-semibold hover:bg-purple-600 transition"
              onClick={() => handleChoice('appointment')}
            >
              תור חדש
            </button>
            <button
              className="w-full py-2 rounded-lg bg-gray-100 text-gray-500 font-medium hover:bg-gray-200 transition"
              onClick={() => setShowChoice({ open: false, hour: null })}
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayView;
