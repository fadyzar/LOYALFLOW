import { BusinessHoursData, Break } from '../types';

export function validateBreaks(breaks: Break[], dayStartTime: string, dayEndTime: string): string | null {
  // Convert times to minutes for easier comparison
  const startMinutes = timeToMinutes(dayStartTime);
  const endMinutes = timeToMinutes(dayEndTime);

  // Sort breaks by start time
  const sortedBreaks = [...breaks].sort((a, b) => 
    timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  );

  let lastEndTime = startMinutes;

  for (const breakItem of sortedBreaks) {
    const breakStart = timeToMinutes(breakItem.start_time);
    const breakEnd = timeToMinutes(breakItem.end_time);

    // Check if break is within working hours
    if (breakStart < startMinutes || breakEnd > endMinutes) {
      return 'הפסקה חייבת להיות בתוך שעות העבודה';
    }

    // Check if break starts before it ends
    if (breakStart >= breakEnd) {
      return 'שעת התחלה של הפסקה חייבת להיות לפני שעת הסיום';
    }

    // Check for overlap with previous break
    if (breakStart < lastEndTime) {
      return 'הפסקות לא יכולות לחפוף';
    }

    lastEndTime = breakEnd;
  }

  return null;
}

export function validateBusinessHours(data: BusinessHoursData): string | null {
  for (const [dayName, hours] of Object.entries(data.regular_hours)) {
    if (!hours.is_active) continue;

    // Validate working hours
    const startMinutes = timeToMinutes(hours.start_time);
    const endMinutes = timeToMinutes(hours.end_time);

    if (startMinutes >= endMinutes) {
      return `שעת התחלה חייבת להיות לפני שעת הסיום ביום ${getDayName(dayName)}`;
    }

    // Validate breaks
    const breakValidation = validateBreaks(hours.breaks, hours.start_time, hours.end_time);
    if (breakValidation) {
      return `${breakValidation} ביום ${getDayName(dayName)}`;
    }
  }

  return null;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function getDayName(day: string): string {
  const dayNames: Record<string, string> = {
    sunday: 'ראשון',
    monday: 'שני',
    tuesday: 'שלישי',
    wednesday: 'רביעי',
    thursday: 'חמישי',
    friday: 'שישי',
    saturday: 'שבת'
  };
  return dayNames[day] || day;
}