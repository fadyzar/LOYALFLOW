import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, Plus, BarChart2 } from 'lucide-react';
import { CalendarView } from '../../types/calendar';
import { useNavigate } from 'react-router-dom';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onAddEvent: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onAddEvent
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

  return (
    <div className="bg-white shadow-lg rounded-b-2xl px-4 py-3 mb-4">
      <div className="flex flex-col gap-2">
        {/* גלילה מודרנית בין ימים */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('prev')}
            className="rounded-full bg-gradient-to-r from-indigo-100 to-blue-50 hover:from-indigo-200 hover:to-blue-100 text-indigo-600 px-3 py-1 font-bold text-lg transition-all shadow-md border border-indigo-100"
            aria-label="יום קודם"
            style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col items-center px-2">
            <span className="text-xl font-bold text-indigo-700 tracking-wide leading-tight">
              {formatDayName()}
            </span>
            <span className="text-base text-gray-600 font-medium leading-tight">
              {formatHeaderDate()}
            </span>
          </div>
          <button
            onClick={() => onNavigate('next')}
            className="rounded-full bg-gradient-to-l from-indigo-100 to-blue-50 hover:from-indigo-200 hover:to-blue-100 text-indigo-600 px-3 py-1 font-bold text-lg transition-all shadow-md border border-indigo-100"
            aria-label="יום הבא"
            style={{ minWidth: 40, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronRight size={22} />
          </button>
        </div>
        {/* פס ימי השבוע לגלילה/בחירה */}
        <div className="flex items-center justify-center gap-1 mt-2 overflow-x-auto scrollbar-none">
          {weekDates.map((date, idx) => {
            const isSelected =
              date.toDateString() === currentDate.toDateString();
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
        {/* כפתור הוספת אירוע, סטטיסטיקות ותצוגות - סטטיסטיקות הכי ימינה */}
        <div className="flex items-center mt-2 gap-2">
          <button
            onClick={() => navigate('/Statistics')}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-400 to-blue-500 text-white font-semibold shadow hover:from-indigo-500 hover:to-blue-600 transition-all"
            title="מעבר לסטטיסטיקות"
            style={{ marginRight: 0 }}
          >
            <BarChart2 size={18} />
            סטטיסטיקות
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 shadow-inner">
            {(['day', 'week', 'month'] as CalendarView[]).map((viewType) => {
              const Icon = viewIcons[viewType];
              return (
                <button
                  key={viewType}
                  onClick={() => onViewChange(viewType)}
                  className={`p-2 rounded-md transition-all duration-150 ${
                    view === viewType
                      ? 'bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow-md scale-105'
                      : 'text-gray-600 hover:bg-indigo-50'
                  }`}
                  title={viewType === 'day' ? 'יום' : viewType === 'week' ? 'שבוע' : 'חודש'}
                >
                  <Icon size={18} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;