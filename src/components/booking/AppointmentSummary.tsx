import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Scissors } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { he } from 'date-fns/locale';

interface AppointmentSummaryProps {
  data: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: string;
    staffId: string;
    staffName: string;
    date: Date;
  };
  onEdit: (field: 'customer' | 'service' | 'datetime') => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function AppointmentSummary({ data, onEdit, onConfirm, loading }: AppointmentSummaryProps) {
  // חילוץ משך זמן השירות
  const getDurationMinutes = (duration: string): number => {
    // נסה לפרסר פורמט של interval מ-PostgreSQL (HH:MM:SS)
    const intervalMatch = duration.match(/(\d+):(\d+):(\d+)/);
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
    const textMatch = duration.match(/(\d+)\s*(minute|hour)s?/);
    if (textMatch) {
      const [_, value, unit] = textMatch;
      return unit === 'hour' ? parseInt(value) * 60 : parseInt(value);
    }

    // אם הערך הוא מספר בלבד, נניח שאלו דקות
    const numericMatch = duration.match(/^(\d+)$/);
    if (numericMatch) {
      return parseInt(numericMatch[1]);
    }

    // ברירת מחדל - 30 דקות
    console.warn('Could not parse duration:', duration);
    return 30;
  };

  const durationMinutes = getDurationMinutes(data.serviceDuration);

  // חישוב זמן סיום
  const endTime = addMinutes(data.date, durationMinutes);

  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">פרטי לקוח</h3>
        </div>
        <div className="space-y-1">
          <p className="font-medium">{data.customerName}</p>
          <p className="text-sm text-gray-500">{data.customerPhone}</p>
          {data.customerEmail && (
            <p className="text-sm text-gray-500">{data.customerEmail}</p>
          )}
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Scissors className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">פרטי שירות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>{data.serviceName}</span>
            <span className="font-medium text-indigo-600">₪{data.servicePrice}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{durationMinutes} דקות</span>
          </div>
        </div>
      </div>

      {/* Date and Time */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">מועד ואיש צוות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">תאריך</span>
            <span>{format(data.date, 'EEEE, d בMMMM', { locale: he })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">שעה</span>
            <span>{format(data.date, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">איש צוות</span>
            <span>{data.staffName}</span>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>קובע תור...</span>
          </>
        ) : (
          <span>אישור וקביעת תור</span>
        )}
      </motion.button>
    </div>
  );
}