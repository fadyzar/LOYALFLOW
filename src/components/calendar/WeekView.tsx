import React, { useMemo } from 'react';
import { CalendarEvent, DragState } from '../../types/calendar';
import EventCard from './EventCard';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  dragState: DragState;
  onDragStart: (event: CalendarEvent, position: { x: number; y: number }) => void;
  onDragMove: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onTimeSlotDoubleClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  dragState,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTimeSlotDoubleClick,
  onEventClick
}) => {
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek;
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === day.toDateString();
    });
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startHour = event.startTime.getHours();
    const startMinutes = event.startTime.getMinutes();
    const top = (startHour * 60 + startMinutes); // 60px per hour
    return top;
  };

  const handleTimeSlotDoubleClick = (day: Date, hour: number) => {
    const slotDate = new Date(day);
    slotDate.setHours(hour, 0, 0, 0);
    onTimeSlotDoubleClick(slotDate);
  };

  return (
    <div className="flex-1 bg-white rounded-lg overflow-hidden flex flex-col">
      {/* Week header */}
      <div className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="grid grid-cols-8">
          <div className="p-3 text-center text-xs font-medium text-gray-500 border-r border-gray-100">
            שעה
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`p-3 text-center border-l border-gray-100 ${
                day.toDateString() === new Date().toDateString()
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700'
              }`}
            >
              <div className="text-xs font-medium">
                {day.toLocaleDateString('he-IL', { weekday: 'short' })}
              </div>
              <div className="text-lg font-bold mt-1">
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Week grid with proper scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="grid grid-cols-8" style={{ height: `${24 * 60}px` }}>
          {/* Time column */}
          <div className="border-r border-gray-200 bg-gray-50">
            {hours.map(hour => (
              <div
                key={hour}
                className="border-b border-gray-100 flex items-start pt-1 px-2"
                style={{ height: '60px' }}
              >
                <span className="text-xs text-gray-500">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="border-r border-gray-100 relative">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="border-b border-gray-100 relative hover:bg-gray-50 transition-colors cursor-pointer"
                  style={{ height: '60px' }}
                  onDoubleClick={() => handleTimeSlotDoubleClick(day, hour)}
                />
              ))}
              
              {/* Events for this day */}
              <div className="absolute top-0 left-0 right-0 pointer-events-none">
                {getEventsForDay(day).map(event => (
                  <div
                    key={event.id}
                    className="pointer-events-auto"
                    style={{
                      top: `${getEventPosition(event)}px`
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
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekView;