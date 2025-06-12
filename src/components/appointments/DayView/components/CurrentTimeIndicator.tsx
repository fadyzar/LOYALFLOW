import React from 'react';
import { CELL_HEIGHT } from '../constants';

interface CurrentTimeIndicatorProps {
  currentTime: Date;
  staffCount: number;
}

export function CurrentTimeIndicator({ currentTime, staffCount }: CurrentTimeIndicatorProps) {
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    const totalMinutes = (hours * 60) + minutes;
    const hoursFromMidnight = totalMinutes / 60;
    return `${Math.round(hoursFromMidnight * CELL_HEIGHT)}px`; // עיגול מדויק
  };

  return (
    <div 
      className="absolute left-0 right-0 pointer-events-none"
      style={{ 
        top: getCurrentTimePosition(),
        width: `${staffCount * 200}px`,
        zIndex: 100
      }}
    >
      <div className="absolute -translate-y-1/2 left-0 right-0 flex items-center">
        <div className="bg-[#ff3b30] text-white rounded-full px-2.5 py-1 text-[14px] whitespace-nowrap min-w-[3.5rem] text-center shadow-lg">
          {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex-1 h-px bg-[#ff3b30] shadow-lg" />
      </div>
    </div>
  );
}