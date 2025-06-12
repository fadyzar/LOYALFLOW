import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Scissors, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface RecurringAppointmentSummaryProps {
  appointments: Array<{
    date: Date;
    serviceId: string;
    serviceName: string;
    staffId: string;
    staffName: string;
    time: string;
  }>;
  customerName: string;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
}

export function RecurringAppointmentSummary({
  appointments,
  customerName,
  onConfirm,
  onBack,
  loading
}: RecurringAppointmentSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="bg-indigo-50 p-4 rounded-xl">
        <p className="text-indigo-800">
          אתה עומד לקבוע {appointments.length} תורים קבועים עבור {customerName}
        </p>
      </div>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
        <h3 className="font-medium">פירוט התורים:</h3>
        
        {appointments.map((appointment, index) => (
          <div 
            key={index}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {format(appointment.date, 'EEEE, d בMMMM', { locale: he })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{appointment.time}</span>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                <span>{appointment.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>{appointment.staffName}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
        >
          <ArrowRight className="h-5 w-5" />
          חזרה
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onConfirm}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>קובע תורים...</span>
            </>
          ) : (
            <span>אישור וקביעת תורים</span>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}