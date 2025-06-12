import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { SpecialDate } from '../types';

interface SpecialDateCardProps {
  date: SpecialDate;
  onDelete: (id: string) => void;
}

export function SpecialDateCard({ date, onDelete }: SpecialDateCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="p-4 bg-gray-50 rounded-xl relative group"
    >
      <button
        onClick={() => onDelete(date.id)}
        className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-5 w-5 text-gray-400 hover:text-red-500" />
      </button>
      <div className="flex items-start gap-3">
        {date.is_closed ? (
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
        ) : (
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium">
              {new Date(date.date).toLocaleDateString('he-IL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
          </div>
          {date.is_closed ? (
            <p className="text-sm text-red-600 mt-1">סגור</p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">
              {date.start_time} - {date.end_time}
            </p>
          )}
          {date.note && (
            <p className="text-sm text-gray-500 mt-2">{date.note}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}