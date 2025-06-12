import React from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar } from 'lucide-react';

interface RecurringAppointmentConfirmationProps {
  appointmentsCount: number;
  onDone: () => void;
}

export function RecurringAppointmentConfirmation({
  appointmentsCount,
  onDone
}: RecurringAppointmentConfirmationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center py-8 text-center"
    >
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">התורים נקבעו בהצלחה!</h3>
      
      <p className="text-gray-600 mb-6">
        נקבעו {appointmentsCount} תורים קבועים בהצלחה.
        <br />
        ניתן לצפות בתורים ביומן.
      </p>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onDone}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
      >
        <Calendar className="h-5 w-5" />
        <span>סיום</span>
      </motion.button>
    </motion.div>
  );
}