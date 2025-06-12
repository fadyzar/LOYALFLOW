import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Clock } from 'lucide-react';
import { useAvailableSlots } from '../../hooks/useAvailableSlots';

interface DateTimeSelectorProps {
  selectedDate: Date;
  selectedTime: string;
  staffId: string;
  serviceId: string;
  onChange: (date: Date, time: string) => void;
}

export function DateTimeSelector({ selectedDate, selectedTime, staffId, serviceId, onChange }: DateTimeSelectorProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const { slots, loading } = useAvailableSlots(currentDate, staffId, serviceId);

  // יצירת מערך של 5 ימים קדימה מהיום הנבחר
  const days = Array.from({ length: 5 }, (_, i) => addDays(currentDate, i));

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(prev => addDays(prev, -5))}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          
          <div className="flex gap-2">
            {days.map((day) => (
              <motion.button
                key={day.toISOString()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(day, selectedTime)}
                className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'bg-indigo-600 text-white'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-xs font-medium">
                  {format(day, 'EEEE', { locale: he }).replace('יום ', '')}
                </span>
                <span className="text-base font-bold mt-0.5">
                  {format(day, 'd', { locale: he })}
                </span>
                <span className="text-xs mt-0.5">
                  {format(day, 'MMM', { locale: he })}
                </span>
              </motion.button>
            ))}
          </div>

          <button
            onClick={() => setCurrentDate(prev => addDays(prev, 5))}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="font-medium mb-4">בחר שעה</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => (
              <motion.button
                key={slot.time}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange(selectedDate, slot.time)}
                disabled={!slot.available}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-colors ${
                  selectedTime === slot.time
                    ? 'bg-indigo-600 text-white'
                    : slot.available
                    ? 'bg-gray-50 hover:bg-gray-100'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{slot.time}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}