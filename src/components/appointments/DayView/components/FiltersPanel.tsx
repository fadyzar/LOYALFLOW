import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface FiltersPanelProps {
  staff: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  selectedStaff: string | 'all';
  onStaffChange: (staffId: string | 'all') => void;
  onClose: () => void;
}

export function FiltersPanel({ staff, selectedStaff, onStaffChange, onClose }: FiltersPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white border-t border-gray-200 p-4"
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סינון לפי איש צוות
          </label>
          <select
            value={selectedStaff}
            onChange={(e) => onStaffChange(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">כל אנשי הצוות</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            חיפוש לקוח
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="הקלד שם לקוח..."
              className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            סטטוס
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">הכל</option>
            <option value="booked">הוזמן</option>
            <option value="confirmed">אושר</option>
            <option value="completed">הושלם</option>
            <option value="canceled">בוטל</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}