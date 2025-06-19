import { format, addMinutes } from 'date-fns';

interface WorkingHours {
  is_active: boolean;
  start_time: string;
  end_time: string;
}

interface Appointment {
  start: string;
  end: string;
}

interface StaffData {
  workingHours: WorkingHours;
  breaks: { start_time: string; end_time: string }[];
  appointments: Appointment[];
  settings?: {
    rest_time?: number;
  };
}

export function getAvailableTimeSlots(
  staff: StaffData,
  currentDate: Date,
  serviceDurationMinutes: number
): { time: Date; available: boolean; isBreak: boolean }[] {
  if (
    !staff?.workingHours?.is_active ||
    typeof staff?.workingHours?.start_time !== 'string' ||
    typeof staff?.workingHours?.end_time !== 'string'
  ) {
    return [];
  }

  const slots: { time: Date; available: boolean; isBreak: boolean }[] = [];
  const processedTimes = new Set<string>();

  const [startHours, startMinutes] = staff.workingHours.start_time.split(':').map(Number);
  const [endHours, endMinutes] = staff.workingHours.end_time.split(':').map(Number);

  let currentTime = new Date(currentDate);
  currentTime.setHours(startHours, startMinutes, 0, 0);

  const endTime = new Date(currentDate);
  endTime.setHours(endHours, endMinutes, 0, 0);

  while (currentTime <= endTime) {
    const timeStr = format(currentTime, 'HH:mm');

    if (!processedTimes.has(timeStr)) {
      const isBreakTime = isTimeInBreak(currentTime, staff.breaks || []);
      const isAvailable = isTimeAvailable(currentTime, staff, serviceDurationMinutes);
      const appointmentEnd = addMinutes(currentTime, serviceDurationMinutes);
      const hasEnoughTime = appointmentEnd <= endTime;

      if ((isAvailable || isBreakTime) && hasEnoughTime) {
        slots.push({
          time: new Date(currentTime),
          available: isAvailable,
          isBreak: isBreakTime
        });
        processedTimes.add(timeStr);
      }
    }

    currentTime = addMinutes(currentTime, 20);
  }

  return slots;
}

function isTimeInBreak(time: Date, breaks: { start_time: string; end_time: string }[]) {
  return breaks.some(b => {
    const [startH, startM] = b.start_time.split(':').map(Number);
    const [endH, endM] = b.end_time.split(':').map(Number);

    const breakStart = new Date(time);
    breakStart.setHours(startH, startM, 0, 0);

    const breakEnd = new Date(time);
    breakEnd.setHours(endH, endM, 0, 0);

    return time >= breakStart && time < breakEnd;
  });
}

function isTimeAvailable(time: Date, staff: StaffData, serviceDurationMinutes: number) {
  const [startH, startM] = staff.workingHours.start_time.split(':').map(Number);
  const [endH, endM] = staff.workingHours.end_time.split(':').map(Number);

  const workStart = new Date(time);
  workStart.setHours(startH, startM, 0, 0);

  const workEnd = new Date(time);
  workEnd.setHours(endH, endM, 0, 0);

  const appointmentEnd = addMinutes(time, serviceDurationMinutes);

  if (time < workStart || appointmentEnd > workEnd) {
    return false;
  }

  return !staff.appointments.some(apt => {
    const [aptStartH, aptStartM] = apt.start.split(':').map(Number);
    const [aptEndH, aptEndM] = apt.end.split(':').map(Number);

    const aptStart = new Date(time);
    aptStart.setHours(aptStartH, aptStartM, 0, 0);

    const aptEnd = new Date(time);
    aptEnd.setHours(aptEndH, aptEndM, 0, 0);

    const aptEndWithRest = addMinutes(aptEnd, staff.settings?.rest_time || 0);

    return (
      (time >= aptStart && time < aptEndWithRest) ||
      (appointmentEnd > aptStart && appointmentEnd <= aptEndWithRest) ||
      (time <= aptStart && appointmentEnd >= aptEndWithRest)
    );
  });
}
