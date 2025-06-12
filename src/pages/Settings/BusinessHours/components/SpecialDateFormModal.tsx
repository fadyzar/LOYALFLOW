import React from 'react';
import { motion } from 'framer-motion';
import { SpecialDate } from '../types';

interface SpecialDateFormModalProps {
  formData: Partial<SpecialDate>;
  onFormChange: (data: Partial<SpecialDate>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function SpecialDateFormModal({
  formData,
  onFormChange,
  onClose,
  onSubmit
}: SpecialDateFormModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl p-6 w-full max-w-md"
      >
        <h3 className="text-lg font-medium mb-4">הוספת יום מיוחד</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תאריך
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => onFormChange({ ...formData, date: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_closed"
              checked={formData.is_closed}
              onChange={(e) => onFormChange({ ...formData, is_closed: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="is_closed" className="text-sm font-medium text-gray-700">
              סגור ביום זה
            </label>
          </div>
          {!formData.is_closed && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שעת פתיחה
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => onFormChange({ ...formData, start_time: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שעת סגירה
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => onFormChange({ ...formData, end_time: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              הערה
            </label>
            <input
              type="text"
              value={formData.note}
              onChange={(e) => onFormChange({ ...formData, note: e.target.value })}
              placeholder="למשל: ערב חג"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ביטול
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            הוסף
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}