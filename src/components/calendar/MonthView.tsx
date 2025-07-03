import React, { useMemo } from 'react';
import { CalendarEvent } from '../../types/calendar';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
}

const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onDateSelect
}) => {
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return { days, firstDay, lastDay };
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  const isCurrentMonth = (day: Date) => {
    return day.getMonth() === currentDate.getMonth();
  };

  const isToday = (day: Date) => {
    const today = new Date();
    return day.toDateString() === today.toDateString();
  };

  return (
    <div className="flex-1 bg-white rounded-lg overflow-hidden">
      {/* Week headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((day, index) => (
          <div
            key={index}
            className="p-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-7 h-full">
        {monthData.days.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          const isInCurrentMonth = isCurrentMonth(day);
          const isTodayDate = isToday(day);
          
          return (
            <div
              key={index}
              className={`
                border-r border-b border-gray-100 p-2 cursor-pointer hover:bg-gray-50 transition-colors
                ${!isInCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
                ${isTodayDate ? 'bg-blue-50' : ''}
              `}
              onClick={() => onDateSelect(day)}
            >
              <div className={`
                text-sm font-medium mb-1
                ${isTodayDate ? 'text-blue-600' : isInCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
              `}>
                {day.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    className="text-xs px-1 py-0.5 rounded truncate"
                    style={{
                      backgroundColor: `${event.color}20`,
                      color: event.color
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 2} נוספים
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthView;