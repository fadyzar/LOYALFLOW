import { parseISO } from 'date-fns';
import { MINUTES_IN_DAY, MINUTES_IN_HOUR, CELL_HEIGHT } from './constants';

export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * MINUTES_IN_HOUR + minutes;
};

export const calculateAppointmentPosition = (startTime: string, endTime: string) => {
  const startDate = parseISO(startTime);
  const endDate = parseISO(endTime);
  
  // חישוב מדויק של דקות
  const startMinutes = startDate.getHours() * MINUTES_IN_HOUR + startDate.getMinutes();
  const endMinutes = endDate.getHours() * MINUTES_IN_HOUR + endDate.getMinutes();
  
  const heightInMinutes = endMinutes - startMinutes;
  const heightInHours = heightInMinutes / MINUTES_IN_HOUR;
  const heightInPixels = Math.max(Math.round(heightInHours * CELL_HEIGHT), 24); // עיגול מדויק

  const startInHours = startMinutes / MINUTES_IN_HOUR;
  const topInPixels = Math.round(startInHours * CELL_HEIGHT); // עיגול מדויק

  return {
    top: `${topInPixels}px`,
    height: `${heightInPixels}px`,
    left: '0.25rem',
    right: '0.25rem',
    position: 'absolute' as const,
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden' as const,
    zIndex: 20
  };
};

export const getStatusColor = (status: string, isPaid?: boolean, hasInvoice?: boolean) => {
  const baseClasses = 'shadow-lg border overflow-hidden';
  
  switch (status) {
    case 'booked':
      return `${baseClasses} bg-yellow-50 text-yellow-800 border-yellow-200 shadow-yellow-100/20`;
    case 'confirmed':
      return `${baseClasses} bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100/20`;
    case 'completed':
      if (isPaid && hasInvoice) {
        return `${baseClasses} bg-indigo-50 text-indigo-800 border-indigo-200 shadow-indigo-100/20`;
      }
      if (isPaid) {
        return `${baseClasses} bg-green-50 text-green-800 border-green-200 shadow-green-100/20`;
      }
      return `${baseClasses} bg-gray-50 text-gray-800 border-gray-200 shadow-gray-100/20`;
    case 'canceled':
      return `${baseClasses} bg-red-50 text-red-800 border-red-200 shadow-red-100/20`;
    case 'no_show':
      return `${baseClasses} bg-orange-50 text-orange-800 border-orange-200 shadow-orange-100/20`;
    default:
      return `${baseClasses} bg-gray-50 text-gray-800 border-gray-200 shadow-gray-100/20`;
  }
};