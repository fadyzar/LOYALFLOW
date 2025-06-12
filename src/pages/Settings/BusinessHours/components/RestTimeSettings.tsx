import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface RestTimeSettingsProps {
  restTime: number;
  onRestTimeChange: (minutes: number) => void;
}

export function RestTimeSettings({ restTime, onRestTimeChange }: RestTimeSettingsProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">זמן מנוחה בין תורים</h2>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <label htmlFor="rest-time" className="block text-sm font-medium text-gray-700 mb-1">
              זמן מנוחה (בדקות)
            </label>
            <select
              id="rest-time"
              value={restTime}
              onChange={(e) => onRestTimeChange(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value={5}>5 דקות</option>
              <option value={10}>10 דקות</option>
              <option value={15}>15 דקות</option>
              <option value={20}>20 דקות</option>
              <option value={30}>30 דקות</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          זמן המנוחה יתווסף אוטומטית בין כל תור לתור
        </p>
      </div>
    </div>
  );
}