import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, BarChart2 } from 'lucide-react';
import { CalendarView } from '../../types/calendar';
import { useNavigate } from 'react-router-dom';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onAddEvent: () => void;
  staffList?: { id: string; name: string }[]; // הוסף אופציונלי
  selectedStaffId?: string | null;
  onStaffSelect?: (id: string | null) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onAddEvent,
  staffList = [],
  selectedStaffId,
  onStaffSelect,
}) => {
  const formatHeaderDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      ...(view === 'day' && { day: 'numeric' })
    };
    return currentDate.toLocaleDateString('he-IL', options);
  };

  const formatDayName = () =>
    currentDate.toLocaleDateString('he-IL', { weekday: 'long' });

  const viewIcons = {
    day: List,
    week: Calendar,
    month: Grid3X3
  };

  // Infinite scroll: הצג 4 ימים סביב currentDate (2 אחורה, היום, 1 קדימה)
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    setScrollOffset(0);
  }, [currentDate]);

  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

  // גלילה אינסופית: 6 ימים סביב currentDate + offset
  const weekDaysShort = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(currentDate.getDate() + 3 - i - scrollOffset);
    return d;
  }).reverse(); // הפוך את הסדר כך שהיום הימני ביותר הוא היום האחרון במערך

  // גרירה רק על הקוביות עצמן (לא על כל ה-div)
  const dragState = useRef<{ startX: number; dragging: boolean }>({ startX: 0, dragging: false });

  const handleDayPointerDown = (e: React.PointerEvent) => {
    dragState.current.dragging = true;
    dragState.current.startX = e.clientX;
  };
  const handleDayPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 40) {
      if (dx < 0) setScrollOffset((prev) => prev + 1); // גרירה שמאלה - קדימה
      else setScrollOffset((prev) => prev - 1);        // גרירה ימינה - אחורה
      dragState.current.startX = e.clientX;
    }
  };
  const handleDayPointerUp = () => {
    dragState.current.dragging = false;
  };

  // גלילה עם גלגלת עכבר
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) {
      // גלילה אופקית בלבד
      if (e.deltaX > 0) setScrollOffset((prev) => prev + 1);
      else if (e.deltaX < 0) setScrollOffset((prev) => prev - 1);
    }
  };

  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // גלילה של אנשי צוות
  const staffScrollRef = useRef<HTMLDivElement>(null);
  const [staffScrollLeft, setStaffScrollLeft] = useState(0);

  const scrollStaff = (dir: 'left' | 'right') => {
    if (!staffScrollRef.current) return;
    const el = staffScrollRef.current;
    const scrollAmount = 120;
    if (dir === 'left') {
      el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      setStaffScrollLeft(el.scrollLeft - scrollAmount);
    } else {
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setStaffScrollLeft(el.scrollLeft + scrollAmount);
    }
  };

  // סגור את התפריט בלחיצה מחוץ
  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // פונקציה לקפיצה ליום הנוכחי
  const handleGoToToday = () => {
    onViewChange('day');
    // קפוץ ליום הנוכחי
    if (typeof onNavigate === 'function') {
      // נווט עד שמגיעים ליום הנוכחי
      // (בהנחה ש-onNavigate('today') לא קיים, אז אפשר להוסיף prop או פשוט להפעיל setCurrentDate(new Date()) מההורה)
      window.dispatchEvent(new CustomEvent('calendar-goto-today'));
    }
  };

  return (
  <div className="bg-white rounded-b-xl px-2 py-1 mb-0 fixed top-0 left-0 right-0 z-50 w-full shadow-md"
       style={{ background: 'linear-gradient(90deg, #f8f9fc 0%, #eef1ff 50%, #fefefe 100%)', paddingBottom: 0}}>
    
    <div className="flex justify-between items-start gap-3 w-full flex-nowrap">
      
      {/* כפתורי צד ימין */}
      <div className="flex flex-col items-end gap-2 shrink-0 w-[40px] mt-2">
        {/* כפתור תצוגה */}
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} title="בחר תצוגה"
            className="rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md hover:scale-110 transition-all w-[34px] h-[34px] flex items-center justify-center">
            <Calendar size={17} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              {['day', 'week', 'month'].map((v) => (
                <button key={v} className={`w-full text-right px-4 py-2 hover:bg-indigo-50 text-sm ${
                    view === v ? 'font-bold text-indigo-600' : 'text-gray-700'}`}
                  onClick={() => { onViewChange(v as CalendarView); setMenuOpen(false); }}>
                  {v === 'day' ? 'תצוגת יום' : v === 'week' ? 'תצוגת שבוע' : 'תצוגת חודש'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* היום */}
        <button onClick={handleGoToToday} title="עבור להיום"
          className="rounded-full bg-gradient-to-r from-indigo-400 to-blue-400 text-white shadow-md hover:scale-110 transition-all w-[34px] h-[34px] text-sm font-bold flex items-center justify-center">
          היום
        </button>

        {/* סטטיסטיקה */}
        <button onClick={() => navigate('/Statistics')} title="סטטיסטיקות"
          className="rounded-full bg-gradient-to-r from-indigo-400 to-blue-500 text-white shadow-md hover:scale-110 transition-all w-[34px] h-[34px] flex items-center justify-center">
          <BarChart2 size={17} />
        </button>
      </div>

      {/* פילטרים (ימים וצוותים) */}
      <div className="flex flex-col gap-2 grow min-w-0 overflow-hidden">
        {/* פילטר ימים - החזר אותו לראשון */}
        <div className="relative w-full">
          {/* חיצים */}
          <button onClick={() => setScrollOffset(prev => prev - 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/70 border border-gray-300 rounded-full p-1 hover:bg-indigo-100"
            style={{ width: 32, height: 32 }}>
            <ChevronRight size={20} />
          </button>

          <button onClick={() => setScrollOffset(prev => prev + 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/70 border border-gray-300 rounded-full p-1 hover:bg-indigo-100"
            style={{ width: 32, height: 32 }}>
            <ChevronLeft size={20} />
          </button>

          {/* ימים */}
          <div
            className="mx-[40px] overflow-x-auto scrollbar-none flex items-center gap-1 select-none justify-center"
            style={{
              direction: 'rtl',
              background: 'linear-gradient(90deg,rgba(255, 255, 255, 0) 60%,rgba(230, 240, 255, 0) 100%)',
              borderRadius: 16,
              padding: '6px 12px',
              boxShadow: '0 2px 8px #e0e7ef22',
              backdropFilter: 'blur(4px)',
            }}
          >
            {weekDates.map(date => {
              const isSelected = date.toDateString() === currentDate.toDateString();
              const dayIdx = date.getDay();
              return (
                <button key={date.toISOString()} onClick={() => {
                    if (!isSelected) {
                      onViewChange('day');
                      window.dispatchEvent(new CustomEvent('calendar-goto-date', { detail: date }));
                    }
                  }}
                  onPointerDown={handleDayPointerDown}
                  onPointerMove={handleDayPointerMove}
                  onPointerUp={handleDayPointerUp}
                  onPointerLeave={handleDayPointerUp}
                  className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all min-w-[48px] ${
                    isSelected ? 'bg-indigo-500 text-white font-bold shadow' :
                    'bg-gray-100 text-gray-700 hover:bg-indigo-100'}`}
                  style={{ flex: '0 0 auto', cursor: 'grab' }}>
                  <span className="text-xs">{weekDaysShort[dayIdx]}</span>
                  <span className="text-base">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>
        {/* פילטר צוותים - מתחת לימים */}
        {staffList.length > 0 && onStaffSelect && (
          <div className="relative w-full mb-0.5 mt-0.5">
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-0 m-0 bg-transparent hover:bg-transparent shadow-none border-none"
              onClick={() => scrollStaff('left')}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* חץ מודרני: SVG דק ללא מסגרת וללא רקע */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M7 5l4 4-4 4" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-0 m-0 bg-transparent hover:bg-transparent shadow-none border-none"
              onClick={() => scrollStaff('right')}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {/* חץ מודרני: SVG דק ללא מסגרת וללא רקע */}
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M11 5l-4 4 4 4" stroke="#6366f1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div
              ref={staffScrollRef}
              className="mx-[40px] flex gap-2 overflow-x-auto px-1 scrollbar-none justify-center"
              style={{
                direction: 'rtl',
                background: 'linear-gradient(90deg,rgba(255, 255, 255, 0) 60%,rgba(230, 240, 255, 0) 100%)',
                borderRadius: 16,
                padding: '6px 12px',
                boxShadow: '0 2px 8px #e0e7ef22',
                backdropFilter: 'blur(4px)',
              }}
            >
              <button onClick={() => onStaffSelect(null)}
                className={`px-3 py-1 rounded-lg font-medium text-sm ${
                  !selectedStaffId ? 'bg-indigo-100 text-indigo-700 shadow' :
                  'bg-gray-50 text-gray-500 hover:bg-indigo-50'}`}>
                הצג הכל
              </button>
              {staffList.map(staff => (
                <button key={staff.id} onClick={() => onStaffSelect(staff.id)}
                  className={`px-3 py-1 rounded-lg font-medium text-sm ${
                    selectedStaffId === staff.id ? 'bg-indigo-500 text-white shadow' :
                    'bg-gray-50 text-gray-700 hover:bg-indigo-100'}`}>
                  <span className={`${selectedStaffId === staff.id ? 'scale-110 font-bold' : 'scale-100'} transition-all duration-300`}>
                    {staff.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

};
export default CalendarHeader;