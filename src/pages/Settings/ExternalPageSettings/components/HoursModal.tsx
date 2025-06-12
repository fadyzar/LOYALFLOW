import React from 'react';
import { motion } from 'framer-motion';
import { X, Clock } from 'lucide-react';

interface BusinessHours {
  regular_hours: Record<string, {
    is_active: boolean;
    start_time: string;
    end_time: string;
    breaks: Array<{
      start_time: string;
      end_time: string;
    }>;
  }>;
  special_dates: Array<{
    date: string;
    is_closed: boolean;
    start_time?: string;
    end_time?: string;
  }>;
}

interface HoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  hours: BusinessHours;
}

const DAYS = [
  { id: 'sunday', label: 'ראשון' },
  { id: 'monday', label: 'שני' },
  { id: 'tuesday', label: 'שלישי' },
  { id: 'wednesday', label: 'רביעי' },
  { id: 'thursday', label: 'חמישי' },
  { id: 'friday', label: 'שישי' },
  { id: 'saturday', label: 'שבת' }
];

export function HoursModal({ isOpen, onClose, hours }: HoursModalProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Clock className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold">שעות פעילות</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {DAYS.map((day) => {
            const dayHours = hours.regular_hours[day.id];
            if (!dayHours) return null;

            return (
              <div key={day.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{day.label}</span>
                  {!dayHours.is_active ? (
                    <span className="text-red-600">סגור</span>
                  ) : (
                    <span className="text-gray-600">
                      {dayHours.start_time} - {dayHours.end_time}
                    </span>
                  )}
                </div>

                {/* הפסקות */}
                {dayHours.is_active && dayHours.breaks.length > 0 && (
                  <div className="pr-4 border-r-2 border-gray-100">
                    {dayHours.breaks.map((breakItem, index) => (
                      <div key={index} className="text-sm text-gray-500">
                        הפסקה: {breakItem.start_time} - {breakItem.end_time}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ימים מיוחדים */}
          {hours.special_dates.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-medium mb-4">ימים מיוחדים</h3>
              <div className="space-y-4">
                {hours.special_dates.map((date, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span>{new Date(date.date).toLocaleDateString('he-IL')}</span>
                    {date.is_closed ? (
                      <span className="text-red-600">סגור</span>
                    ) : (
                      <span className="text-gray-600">
                        {date.start_time} - {date.end_time}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}