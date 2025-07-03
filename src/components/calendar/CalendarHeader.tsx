import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, List, Grid3X3, Plus } from 'lucide-react';
import { CalendarView } from '../../types/calendar';

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

  const viewIcons = {
    day: List,
    week: Calendar,
    month: Grid3X3
  };

  return (
    <div className="bg-white shadow-lg rounded-b-2xl px-4 py-3 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <h1 className="text-xl font-bold text-gray-800 text-center flex-1">
          {formatHeaderDate()}
        </h1>
        
        <div className="flex items-center space-x-2">
          {/* Add Event Button */}
          <button
            onClick={onAddEvent}
            className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-md"
          >
            <Plus size={20} />
          </button>
          
          {/* View Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {(['day', 'week', 'month'] as CalendarView[]).map((viewType) => {
              const Icon = viewIcons[viewType];
              return (
                <button
                  key={viewType}
                  onClick={() => onViewChange(viewType)}
                  className={`p-2 rounded-md transition-all ${
                    view === viewType
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
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