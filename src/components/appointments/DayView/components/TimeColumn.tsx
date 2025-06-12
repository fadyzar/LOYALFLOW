import React, { forwardRef } from 'react';
import { CELL_HEIGHT, TIME_SLOTS } from '../constants';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface TimeColumnProps {
  showCurrentTime: boolean;
  currentTime: Date;
}

export const TimeColumn = forwardRef<HTMLDivElement, TimeColumnProps>(
  function TimeColumn({ showCurrentTime, currentTime }, ref) {
    const calculateCurrentTimePosition = (time: Date) => {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      return (hours * CELL_HEIGHT) + (minutes / 60 * CELL_HEIGHT);
    };

    return (
      <div ref={ref} className="relative h-full">
        <div className="absolute inset-0">
          {TIME_SLOTS.map((hour) => (
            <div 
              key={hour} 
              className="relative border-b border-gray-200 text-sm text-gray-500"
              style={{ 
                height: `${CELL_HEIGHT}px`
              }}
            >
              <div 
                className="absolute right-0 bg-gray-50 px-2.5 py-1 rounded-full font-medium"
                style={{
                  top: '0.5rem',
                  transform: 'translate(-15%, 0)'
                }}
              >
                {format(new Date().setHours(hour, 0, 0, 0), 'HH:mm', { locale: he })}
              </div>
            </div>
          ))}
        </div>
        {showCurrentTime && currentTime && (
          <>
            <div 
              className="absolute right-0 h-0.5 bg-red-500 z-10"
              style={{
                top: `${calculateCurrentTimePosition(currentTime)}px`,
                transform: 'translateY(-50%)',
                width: '100vw',
                right: '0'
              }}
            />
            <div 
              className="absolute right-0 bg-red-500 text-white px-2.5 py-1 rounded-full z-20 font-medium"
              style={{
                top: `${calculateCurrentTimePosition(currentTime)}px`,
                transform: 'translate(-15%, -50%)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                fontSize: '0.9rem'
              }}
            >
              {format(currentTime, 'HH:mm', { locale: he })}
            </div>
          </>
        )}
      </div>
    );
  }
);
