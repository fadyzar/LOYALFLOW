import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, Plus, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
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

  // יצירת מערך של כל ימי השבוע (ראשון עד שבת)
  const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  // מצא את היום הראשון של השבוע הנוכחי (ראשון)
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay());
  // צור מערך של תאריכים לכל השבוע
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

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

  return (
    <div
      className="bg-white rounded-b-xl px-2 py-1 mb-0"
      style={{
        marginTop: 0,
        paddingTop: 10,
        position: 'fixed',
        top: 0,
        right: 0,
        left: 0,
        zIndex: 50,
        width: '100%',
      }}
    >
      <div className="flex flex-col gap-1">
        {/* פס ימי השבוע עם חצים משני הצדדים */}
        <div className="flex items-center justify-center gap-2 mt-1">
          <button
            onClick={() => onNavigate('prev')}
            className="rounded-full bg-gradient-to-r from-indigo-100 to-blue-50 hover:from-indigo-200 hover:to-blue-100 text-indigo-600 px-2 py-1 font-bold text-lg transition-all shadow-md border border-indigo-100"
            aria-label="שבוע קודם"
            style={{ minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {weekDates.map((date, idx) => {
              const isSelected = date.toDateString() === currentDate.toDateString();
              return (
                <button
                  key={idx}
                  onClick={() => {
                    const diff = Math.round(
                      (date.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (diff < 0) {
                      for (let i = 0; i < Math.abs(diff); i++) onNavigate('prev');
                    } else if (diff > 0) {
                      for (let i = 0; i < diff; i++) onNavigate('next');
                    }
                  }}
                  className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all duration-150 min-w-[48px] ${
                    isSelected
                      ? 'bg-indigo-500 text-white font-bold shadow'
                      : 'bg-gray-100 text-gray-700 hover:bg-indigo-100'
                  }`}
                  style={{ flex: '0 0 auto' }}
                >
                  <span className="text-xs">{weekDays[idx]}</span>
                  <span className="text-base">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate('next')}
            className="rounded-full bg-gradient-to-l from-indigo-100 to-blue-50 hover:from-indigo-200 hover:to-blue-100 text-indigo-600 px-2 py-1 font-bold text-lg transition-all shadow-md border border-indigo-100"
            aria-label="שבוע הבא"
            style={{ minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
    
        {/* כפתור הוספת אירוע, סטטיסטיקות ותפריט תצוגה */}
        <div className="flex items-center mt-1 gap-2">
          <button
            onClick={() => navigate('/Statistics')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-400 to-blue-500 text-white font-semibold shadow hover:from-indigo-500 hover:to-blue-600 transition-all"
            title="מעבר לסטטיסטיקות"
            style={{ marginRight: 0 }}
          >
            <BarChart2 size={18} />
          </button>
         
          {staffList && staffList.length > 0 && onStaffSelect && (
            <div className="flex items-center gap-2">
              <button
                className="p-1 rounded-full bg-gray-100 hover:bg-indigo-100 text-indigo-500 border border-gray-200"
                onClick={() => scrollStaff('left')}
                tabIndex={-1}
                type="button"
              >
                <ChevronRight size={18} />
              </button>
              <div
                ref={staffScrollRef}
                className="flex gap-2 overflow-x-auto scrollbar-none px-1"
                style={{ maxWidth: 320, minWidth: 0 }}
              >
                <button
                  className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200
                    ${!selectedStaffId
                      ? 'bg-indigo-100 text-indigo-700 shadow'
                      : 'bg-gray-50 text-gray-500 hover:bg-indigo-50'}
                  `}
                  onClick={() => onStaffSelect(null)}
                >
                  הצג הכל
                </button>
                {staffList.map((staff) => (
                  <button
                    key={staff.id}
                    className={`px-3 py-1 rounded-lg font-medium text-sm transition-all duration-200 relative overflow-hidden
                      ${selectedStaffId === staff.id
                        ? 'bg-indigo-500 text-white shadow'
                        : 'bg-gray-50 text-gray-700 hover:bg-indigo-100'}
                    `}
                    onClick={() => onStaffSelect(staff.id)}
                  >
                    <span
                      className={`transition-all duration-300 ${
                        selectedStaffId === staff.id ? 'scale-110 font-bold' : 'scale-100'
                      }`}
                    >
                      {staff.name}
                    </span>
                    {selectedStaffId === staff.id && (
                      <span
                        className="absolute left-0 right-0 bottom-0 h-0.5 bg-indigo-400 rounded transition-all duration-300"
                        style={{ opacity: 1 }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <button
                className="p-1 rounded-full bg-gray-100 hover:bg-indigo-100 text-indigo-500 border border-gray-200"
                onClick={() => scrollStaff('right')}
                tabIndex={-1}
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
          <div className="flex-1" />
          {/* תפריט תצוגה חדש */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className={`p-2 rounded-md transition-all duration-150 bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md scale-105`}
              title="בחר תצוגה"
            >
              <Calendar size={20} />
            </button>
            {menuOpen && (
              <div className="absolute left-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <button
                  className={`w-full text-right px-4 py-2 hover:bg-indigo-50 text-sm ${
                    view === 'day' ? 'font-bold text-indigo-600' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onViewChange('day');
                    setMenuOpen(false);
                  }}
                >
                  תצוגת יום
                </button>
                <button
                  className={`w-full text-right px-4 py-2 hover:bg-indigo-50 text-sm ${
                    view === 'week' ? 'font-bold text-indigo-600' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onViewChange('week');
                    setMenuOpen(false);
                  }}
                >
                  תצוגת שבוע
                </button>
                <button
                  className={`w-full text-right px-4 py-2 hover:bg-indigo-50 text-sm ${
                    view === 'month' ? 'font-bold text-indigo-600' : 'text-gray-700'
                  }`}
                  onClick={() => {
                    onViewChange('month');
                    setMenuOpen(false);
                  }}
                >
                  תצוגת חודש
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;