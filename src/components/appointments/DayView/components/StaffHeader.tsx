import React, { forwardRef, useMemo } from 'react';
import { Staff, StaffHours } from '../types';

interface StaffHeaderProps {
  staff: Staff[];
  staffHours: Record<string, StaffHours>;
}

export const StaffHeader = forwardRef<HTMLDivElement, StaffHeaderProps>(
  function StaffHeader({ staff, staffHours }, ref) {
    // הגנה על staff ריק או staffHours ריק
    if (!Array.isArray(staff) || staff.length === 0) {
      return null;
    }

    // השתמש ב-useMemo כדי לחשב once בלבד
    const { anyOpen, debugInfo } = useMemo(() => {
      let anyOpen = false;
      const debugInfo: any[] = [];
      for (const member of staff) {
        const hours = staffHours[member.id];
        const open =
          hours &&
          hours.is_active !== false &&
          typeof hours.start_time === 'string' &&
          typeof hours.end_time === 'string' &&
          hours.start_time !== hours.end_time;
        debugInfo.push({
          name: member.name,
          hours,
          open
        });
        if (open) anyOpen = true;
      }
      return { anyOpen, debugInfo };
    }, [staff, staffHours]);

    // Debug: הדפס פעם אחת בלבד
    console.log('[StaffHeader] debugInfo:', debugInfo);
    console.log('[StaffHeader] anyOpen:', anyOpen);

    // Debug: הדפס שעות פעילות אמיתיות
    debugInfo.forEach((info) => {
      if (info.hours) {
        console.log(
          `[StaffHeader] ${info.name} שעות פעילות: ${info.hours.start_time} - ${info.hours.end_time} | is_active: ${info.hours.is_active}`
        );
      } else {
        console.log(`[StaffHeader] ${info.name} אין שעות פעילות`);
      }
    });

    if (!anyOpen) {
      console.log('%c[StaffHeader] סניף סגור היום', 'color: red; font-weight: bold; font-size: 18px;');
      return (
        <div className="w-full flex items-center justify-center py-8">
          <span className="text-lg font-bold text-red-600 bg-red-50 px-6 py-3 rounded-xl shadow">
            הסניף סגור היום
          </span>
        </div>
      );
    }

    // אחרת, הצג את כותרת אנשי הצוות הרגילה
    return (
      <div ref={ref} className="flex-1 overflow-x-auto scrollbar-none">
        <div
          className="inline-flex"
          style={{
            minWidth: `calc(200px * ${staff.length})`
          }}
        >
          {staff.map((member) => {
            const hours = staffHours[member.id];
            const isClosed =
              !hours ||
              hours.is_active === false ||
              typeof hours.start_time !== 'string' ||
              typeof hours.end_time !== 'string' ||
              hours.start_time === hours.end_time;

            return (
              <div key={member.id} className="w-[200px] h-14 border-b border-r border-gray-200 bg-white flex items-center justify-center">
                <div className="flex flex-col items-center justify-center w-full h-full">
                  <span className="text-sm font-medium text-center w-full">{member.name}</span>
                  {isClosed && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full mt-1 text-center w-full">
                      סגור היום
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
