import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, ChevronDown } from 'lucide-react';
import { BusinessHours, Break } from '../types';
import { Tooltip } from './Tooltip';

interface DayHoursProps {
  dayName: string;
  hours: BusinessHours;
  breaks: Break[];
  onHoursChange: (field: string, value: any) => void;
  onAddBreak: () => void;
  onDeleteBreak: (id: string) => void;
}

export function DayHours({
  dayName,
  hours,
  breaks,
  onHoursChange,
  onAddBreak,
  onDeleteBreak
}: DayHoursProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { is_active: isActive, start_time: startTime, end_time: endTime } = hours;

  const calculateBreakPercentage = (breakStart: string, breakEnd: string, dayStart: string, dayEnd: string): { start: number; height: number } => {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const dayStartMinutes = toMinutes(dayStart);
    const dayEndMinutes = toMinutes(dayEnd);
    const breakStartMinutes = toMinutes(breakStart);
    const breakEndMinutes = toMinutes(breakEnd);

    const dayLength = dayEndMinutes - dayStartMinutes;
    const startPercentage = ((breakStartMinutes - dayStartMinutes) / dayLength) * 100;
    const heightPercentage = ((breakEndMinutes - breakStartMinutes) / dayLength) * 100;
    
    return {
      start: startPercentage,
      height: heightPercentage
    };
  };

  const calculateBreakDuration = (start: string, end: string): string => {
    const [startHours, startMinutes] = start.split(':').map(Number);
    const [endHours, endMinutes] = end.split(':').map(Number);
    
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes} דקות`;
    if (minutes === 0) return `${hours} שעות`;
    return `${hours} שעות ו-${minutes} דקות`;
  };

  const formatTime = (time: string): string => {
    return time.slice(0, 5); // Remove seconds if present
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl overflow-hidden transition-all ${
        isActive ? 'shadow-md' : 'shadow-sm opacity-75'
      }`}
    >
      {/* Header */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center justify-between flex-1">
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                onChange={(e) => onHoursChange('is_active', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
            <div>
              <h3 className="font-medium text-lg">{dayName}</h3>
            </div>
          </div>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <span className="text-sm">{isExpanded ? 'סגור' : 'ערוך'}</span>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </button>
        </div>

        {/* Desktop Time Inputs */}
        <div className="hidden sm:flex items-center gap-4">
          {isActive && (
            <div className="flex items-center gap-2">
              <Tooltip content="שעת פתיחה">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => onHoursChange('start_time', e.target.value)}
                  className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </Tooltip>
              <span className="text-gray-500">עד</span>
              <Tooltip content="שעת סגירה">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => onHoursChange('end_time', e.target.value)}
                  className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </Tooltip>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100"
          >
            {/* Mobile Time Inputs */}
            <div className="p-4 sm:hidden bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שעת פתיחה
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => onHoursChange('start_time', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שעת סגירה
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => onHoursChange('end_time', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Breaks Section */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900">הפסקות</h4>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onAddBreak}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4" />
                  הוסף הפסקה
                </motion.button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {breaks.map((breakItem) => (
                  <motion.div
                    key={breakItem.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-200 transition-colors"
                  >
                    <div className="relative flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                          <Clock className="h-4 w-4 text-indigo-600" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatTime(breakItem.start_time)}</span>
                            <span className="text-gray-400">-</span>
                            <span className="font-medium">{formatTime(breakItem.end_time)}</span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {calculateBreakDuration(breakItem.start_time, breakItem.end_time)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteBreak(breakItem.id)}
                        className="text-sm text-red-500 hover:text-red-600 hover:underline"
                      >
                        הסר
                      </button>
                    </div>

                    {/* Break Visualization */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div 
                        className="absolute left-0 right-0 bg-yellow-100/40"
                        style={{
                          ...calculateBreakPercentage(
                            breakItem.start_time,
                            breakItem.end_time,
                            startTime,
                            endTime
                          )
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {breaks.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    לא הוגדרו הפסקות ליום זה
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}