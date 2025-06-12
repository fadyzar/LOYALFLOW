import { parseISO } from 'date-fns';
import { StaffHours, Appointment, TimeSlotStyle } from '../types';
import { timeToMinutes } from '../utils';
import { MINUTES_IN_HOUR } from '../constants';

export function useTimeSlots(staffHours: Record<string, StaffHours>, appointments: Appointment[]) {
  const getTimeSlotStyle = (hour: number, staffId: string): TimeSlotStyle => {
    const hours = staffHours[staffId];
    if (!hours?.is_active) {
      return {
        className: 'bg-gray-50 cursor-not-allowed relative before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_8px,#e5e7eb_8px,#e5e7eb_16px)] before:opacity-50 before:shadow-inner',
        style: {}
      };
    }

    const startMinutes = timeToMinutes(hours.start_time);
    const endMinutes = timeToMinutes(hours.end_time);
    const slotStartMinutes = hour * MINUTES_IN_HOUR;
    const slotEndMinutes = (hour + 1) * MINUTES_IN_HOUR;

    // אם כל השעה מחוץ לשעות העבודה
    if (slotEndMinutes <= startMinutes || slotStartMinutes >= endMinutes) {
      return {
        className: 'bg-gray-50 cursor-not-allowed relative before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_8px,#e5e7eb_8px,#e5e7eb_16px)] before:opacity-50 before:shadow-inner',
        style: {}
      };
    }

    // אם יש חפיפה חלקית
    if (slotStartMinutes < startMinutes || slotEndMinutes > endMinutes) {
      const styles: TimeSlotStyle = {
        className: 'bg-white relative',
        style: {}
      };

      // חלק לא פעיל בתחילת השעה
      if (slotStartMinutes < startMinutes) {
        const inactiveHeight = ((startMinutes - slotStartMinutes) / MINUTES_IN_HOUR) * 100;
        styles.style['--inactive-start'] = `${inactiveHeight}%`;
        styles.className += ' before:absolute before:left-0 before:right-0 before:top-0 before:h-[var(--inactive-start)] before:bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_8px,#e5e7eb_8px,#e5e7eb_16px)] before:opacity-50 before:shadow-inner before:z-10';
      }

      // חלק לא פעיל בסוף השעה
      if (slotEndMinutes > endMinutes) {
        const inactiveHeight = ((slotEndMinutes - endMinutes) / MINUTES_IN_HOUR) * 100;
        styles.style['--inactive-end'] = `${inactiveHeight}%`;
        styles.className += ' after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[var(--inactive-end)] after:bg-[repeating-linear-gradient(45deg,#f3f4f6,#f3f4f6_8px,#e5e7eb_8px,#e5e7eb_16px)] after:opacity-50 after:shadow-inner after:z-10';
      }

      return styles;
    }

    // בדיקת הפסקות
    const breaks = hours.breaks || [];
    for (const breakTime of breaks) {
      const breakStartMinutes = timeToMinutes(breakTime.start_time);
      const breakEndMinutes = timeToMinutes(breakTime.end_time);

      // בדיקה אם יש חפיפה בין ההפסקה לשעה הנוכחית
      if (breakStartMinutes < slotEndMinutes && breakEndMinutes > slotStartMinutes) {
        const startPercentage = Math.max(0, breakStartMinutes - slotStartMinutes) / MINUTES_IN_HOUR * 100;
        const endPercentage = Math.min(100, (breakEndMinutes - slotStartMinutes) / MINUTES_IN_HOUR * 100);
        
        return {
          className: 'bg-white relative before:absolute before:left-0 before:right-0 before:bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_8px,#fde68a_8px,#fde68a_16px)] before:opacity-40 before:shadow-inner before:z-10',
          style: {
            '--break-start': `${startPercentage}%`,
            '--break-height': `${endPercentage - startPercentage}%`
          }
        };
      }
    }

    return {
      className: 'bg-white hover:bg-indigo-50/60 transition-colors cursor-pointer',
      style: {}
    };
  };

  const getAppointmentsForTimeSlot = (hour: number, staffId: string) => {
    return appointments.filter(apt => {
      const startHour = parseISO(apt.start_time).getHours();
      return startHour === hour && apt.staff_id === staffId;
    });
  };

  return { getTimeSlotStyle, getAppointmentsForTimeSlot };
}