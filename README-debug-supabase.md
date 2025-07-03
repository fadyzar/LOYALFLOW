import React, { useMemo } from 'react';
import { CalendarEvent, DragState } from '../../types/calendar';
import EventCard from './EventCard';

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
  currentTime?: Date; // הוסף פרופ חדש
}

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
}) => {
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
    return startHour * 80 + (startMinutes / 60) * 80;
  };

  const getEventHeight = (event: CalendarEvent) => {
    const duration = event.endTime.getTime() - event.startTime.getTime();
    const durationMinutes = duration / (1000 * 60);
    return Math.max(20, (durationMinutes / 60) * 80);
  };

  const handleTimeSlotDoubleClick = (hour: number) => {
    const slotDate = new Date(currentDate);
    slotDate.setHours(hour, 0, 0, 0);
    onTimeSlotDoubleClick(slotDate);
  };

  const getTimeInMinutes = (timeStr: string | undefined) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // עדכון: אם אין שעות פעילות (מחרוזת ריקה), חסום את כל האזור
  const totalHeight = 24 * 80;
  let openMinutes = getTimeInMinutes(businessOpenTime);
  let closeMinutes = getTimeInMinutes(businessCloseTime);

  // אם אין שעות פעילות בכלל, חסום הכל
  const noBusinessHours =
    !businessOpenTime ||
    !businessCloseTime ||
    businessOpenTime === businessCloseTime ||
    openMinutes >= closeMinutes;

  const earlyHeight = noBusinessHours ? 0 : (openMinutes / 60) * 80;
  const lateHeight = noBusinessHours ? totalHeight : totalHeight - (closeMinutes / 60) * 80;

  // חישוב מיקום קו אדום לפי השעה הנוכחית
  const getRedLineTop = () => {
    const now = currentTime || new Date();
    if (now.toDateString() !== currentDate.toDateString()) return null;
    const hour = now.getHours();
    const minutes = now.getMinutes();
    return hour * 80 + (minutes / 60) * 80;
  };

  return (
    <div className="flex-1 bg-white rounded-lg overflow-hidden" style={{ position: 'relative', background: '#fff' }}>
      {/* Header */}
      <div className="flex border-b border-gray-200 bg-white">
        <div className="w-16 p-3 border-r border-gray-200 bg-gray-50">
          <span className="text-xs text-gray-500 font-medium">שעה</span>
        </div>
        <div className="flex-1 p-3 text-center">
          <span className="text-sm font-medium text-gray-700">
            {currentDate.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`flex w-full overflow-y-auto ${dragState.isDragging ? 'overflow-y-hidden' : ''}`}
          style={{
            height: 'calc(100vh - 200px)',
            WebkitOverflowScrolling: 'touch',
            touchAction: dragState.isDragging ? 'none' : 'auto',
            position: 'relative'
          }}
        >
          {/* Time Column */}
          <div className="w-16 border-r border-gray-200 bg-gray-50 flex-shrink-0">
            <div style={{ height: `${totalHeight}px` }}>
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
          <div className="flex-1 relative">
            <div style={{ height: `${totalHeight}px` }}>
              {/* Overlay for closed hours (block interaction & modern blur) */}
              <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                {earlyHeight > 0 && (
                  <div
                    className="absolute w-full"
                    style={{
                      top: 0,
                      height: `${earlyHeight}px`,
                      background: 'rgba(245,245,250,0.85)',
                      pointerEvents: 'auto',
                      zIndex: 20,
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'not-allowed',
                      backdropFilter: 'blur(4px) saturate(1.2)',
                      WebkitBackdropFilter: 'blur(4px) saturate(1.2)',
                      boxShadow: '0 2px 16px 0 #e0e7ef30',
                      transition: 'background 0.3s'
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
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
                      מחוץ לשעות פעילות
                    </div>
                  </div>
                )}
                {lateHeight > 0 && (
                  <div
                    className="absolute w-full"
                    style={{
                      bottom: 0,
                      height: `${lateHeight}px`,
                      background: 'rgba(245,245,250,0.85)',
                      pointerEvents: 'auto',
                      zIndex: 20,
                      borderTop: '1px solid #e5e7eb',
                      cursor: 'not-allowed',
                      backdropFilter: 'blur(4px) saturate(1.2)',
                      WebkitBackdropFilter: 'blur(4px) saturate(1.2)',
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
                      מחוץ לשעות פעילות
                    </div>
                  </div>
                )}
              </div>

              {/* קו אדום דק לשעה הנוכחית */}
              {getRedLineTop() !== null && (
                <div
                  className="absolute left-0 right-0 z-30"
                  style={{
                    top: `${getRedLineTop()}px`,
                    height: '2px',
                    background: 'linear-gradient(90deg, #ef4444 0%, #fff0 100%)',
                    borderRadius: 2,
                    boxShadow: '0 0 4px 0 #ef4444aa'
                  }}
                />
              )}

              {/* Time slots */}
              {hours.map(hour => (
                <div key={hour} className="relative">
                  <div
                    className="h-20 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    onDoubleClick={() => handleTimeSlotDoubleClick(hour)}
                  />
                  {[1, 2, 3].map(quarter => (
                    <div
                      key={quarter}
                      className="absolute w-full border-b border-gray-50"
                      style={{ top: `${(quarter * 80) / 4}px`, height: '1px' }}
                    />
                  ))}
                </div>
              ))}

              {/* Events */}
              <div className="absolute top-0 left-0 right-0 z-20">
                {dayEvents.map(event => {
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
                      className="absolute"
                      style={{
                        top: `${adjustedTop}px`,
                        left: '4px',
                        right: '4px',
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
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;

# המלצות לאיתור ופתרון בעיות קליטת נתונים מ-Supabase (שעות פעילות/מידע עסקי)

1. **ודא שהנתונים ב-Supabase תקינים**
   - בדוק בטבלת `business_hours` שהשדה `regular_hours` הוא מסוג JSON ולא טקסט.
   - ודא שהמבנה תואם למה שהקוד שלך מצפה (מפתחות באנגלית, ערכים תקינים, is_active וכו').
   - בדוק שאין ערכים ריקים/שגויים (למשל start_time == end_time).

2. **הדפס את כל הנתונים שמתקבלים מהשרת**
   - בכל שליפה (`select`) הדפס ל-console את כל האובייקט שמתקבל (`console.log('business_hours data:', data)`).
   - הדפס גם את הערכים שאתה שולף מתוך ה-JSON (`console.log('regularHours:', regularHours)`).

3. **טפל בכל מקרה של ערך ריק או לא תקין**
   - אם `regular_hours` הוא מחרוזת, המר אותו ל-JSON (`JSON.parse`).
   - אם חסר מפתח ליום מסוים, הצג הודעה מתאימה או חסום את כל היומן.
   - אם שעות הפתיחה/סגירה לא תקינות, חסום הכל.

4. **השתמש ב-Loading/Error State**
   - אל תציג את היומן עד שה-business נטען מה-context.
   - אם אין שעות פעילות, הצג הודעה ברורה למשתמש (ולא רק חסימה ויזואלית).

5. **ודא שהקוד לא משתמש בערכי ברירת מחדל**
   - אל תעביר ערך ברירת מחדל ל-DayView (למשל '12:00'), אלא רק את מה שמגיע מה-DB.
   - אם אין שעות פעילות, העבר מחרוזת ריקה או undefined.

6. **הפרד בין שליפת נתונים לבין הצגה**
   - בצע את כל הלוגיקה של שליפת נתונים והמרה ל-state במקום אחד (למשל ב-useEffect).
   - בקומפוננטות ההצגה (DayView) תסמוך רק על מה שמגיע מהפרופס.

7. **בדוק את ה-context**
   - ודא שה-business נטען לפני שאתה מנסה לשלוף שעות פעילות.
   - הוסף הדפסות debug ב-AuthProvider וב-CalendarPage.

8. **דוגמה ללוגיקה מומלצת לשליפת שעות פעילות**
   ```typescript
   // ...existing code...
   const { data, error } = await supabase
     .from('business_hours')
     .select('regular_hours, special_dates')
     .eq('business_id', businessId)
     .single();

   if (error || !data) {
     setBusinessHours(null);
     return;
   }

   const regularHours = typeof data.regular_hours === 'string'
     ? JSON.parse(data.regular_hours)
     : data.regular_hours;

   const todayHours = regularHours && regularHours[currentDayName];
   if (todayHours && todayHours.is_active && todayHours.start_time && todayHours.end_time) {
     setBusinessHours({ start_time: todayHours.start_time, end_time: todayHours.end_time });
   } else {
     setBusinessHours(null);
   }
   ```

9. **אם עדיין לא מסתדר:**
   - הדפס את כל מה שמתקבל מה-DB ושלח את הפלט.
   - בדוק שאין הבדל בין מה שמוצג ב-Supabase לבין מה שמתקבל בקוד.
   - נסה לשלוף את הנתונים ישירות ב-console של Supabase ולוודא שהם תקינים.

---

**סיכום:**  
הבעיה לרוב נובעת ממבנה נתונים לא עקבי, טיפוס לא נכון (JSON/טקסט), או שימוש בערכי ברירת מחדל בקוד.  
הדפסה מסיבית של כל שלב תעזור לאתר את מקור הבעיה.