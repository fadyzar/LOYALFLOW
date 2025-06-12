import { format, addMinutes, parseISO, addHours } from 'date-fns';
import { he } from 'date-fns/locale';

// המרת תאריך לתצוגה
export function formatDate(date: Date | string, formatStr: string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: he });
}

// המרת תאריך UTC לזמן מקומי (ישראל)
export function utcToLocal(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addHours(d, 2); // +2 hours for Israel
}

// המרת תאריך מקומי ל-UTC
export function localToUtc(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return addHours(d, -2); // -2 hours for Israel
}

// יצירת תאריך עם שעה ספציפית
export function setTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

// הוספת דקות לתאריך
export function addMinutesToDate(date: Date, minutes: number): Date {
  return addMinutes(date, minutes);
}

// פירוק מחרוזת זמן PostgreSQL לדקות
export function parsePostgresInterval(interval: string | undefined | null): number {
  if (!interval) return 30; // ברירת מחדל - 30 דקות

  // נסה לפרסר פורמט של interval מ-PostgreSQL (HH:MM:SS)
  const intervalMatch = interval.match(/(\d+):(\d+):(\d+)/);
  if (intervalMatch) {
    const [_, hours, minutes, seconds] = intervalMatch;
    // אם יש ערך בשדה השעות, נכפיל ב-60 דקות
    // אם יש ערך בשדה הדקות, נוסיף אותו
    // אם יש ערך בשדה השניות ואין ערכים בשדות האחרים, נניח שזה דקות
    if (parseInt(hours) > 0 || parseInt(minutes) > 0) {
      return parseInt(hours) * 60 + parseInt(minutes);
    } else if (parseInt(seconds) > 0) {
      return parseInt(seconds);
    }
  }

  // נסה לפרסר פורמט של "X minutes" או "X hours"
  const textMatch = interval.match(/(\d+)\s*(minute|hour)s?/);
  if (textMatch) {
    const [_, value, unit] = textMatch;
    return unit === 'hour' ? parseInt(value) * 60 : parseInt(value);
  }

  // אם הערך הוא מספר בלבד, נניח שאלו דקות
  const numericMatch = interval.match(/^(\d+)$/);
  if (numericMatch) {
    return parseInt(numericMatch[1]);
  }

  // ברירת מחדל - 30 דקות
  console.warn('Could not parse duration:', interval);
  return 30;
}

// המרת דקות למחרוזת זמן PostgreSQL
export function minutesToPostgresInterval(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:00`;
}

// בדיקה אם תאריך הוא UTC
export function isUtcDate(date: string): boolean {
  return date.endsWith('Z') || date.includes('+');
}

// המרת תאריך לפורמט הנכון בהתאם לצורך
export function normalizeDate(date: string | Date, forAppointment = false): Date {
  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    // אם זה תור ואנחנו רוצים להציג אותו, נוסיף 3 שעות
    if (forAppointment) {
      return utcToLocal(parsedDate);
    }
    return parsedDate;
  }
  return date;
}

// המרת תאריך לפורמט UTC לשמירה
export function normalizeForStorage(date: Date): string {
  return localToUtc(date).toISOString();
}