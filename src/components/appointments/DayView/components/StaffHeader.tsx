import React, { forwardRef } from 'react';
import { Staff, StaffHours } from '../types';

interface StaffHeaderProps {
  staff: Staff[];
  staffHours: Record<string, StaffHours>;
}

export const StaffHeader = forwardRef<HTMLDivElement, StaffHeaderProps>(
  function StaffHeader({ staff, staffHours }, ref) {
    return (
      <div ref={ref} className="flex-1 overflow-x-auto scrollbar-none">
        <div className="inline-flex min-w-[calc(200px*var(--staff-count))]" style={{ '--staff-count': staff.length } as any}>
          {staff.map((member) => {
            const hours = staffHours[member.id];
            return (
              <div key={member.id} className="w-[200px] h-14 border-b border-r border-gray-200 bg-white">
                <div className="h-full w-full flex flex-col items-center justify-center">
                  <span className="text-sm font-medium">{member.name}</span>
                  {hours?.is_active === false && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full mt-1">
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
