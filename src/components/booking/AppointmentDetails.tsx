import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Scissors, Ban, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface AppointmentDetailsProps {
  appointment: any;
  onClose: () => void;
  onCancel: (id: string) => Promise<void>;
}

export function AppointmentDetails({ appointment, onClose, onCancel }: AppointmentDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancel = async () => {
    try {
      setLoading(true);
      await onCancel(appointment.id);
      toast.success('התור בוטל בהצלחה');
      onClose();
    } catch (error: any) {
      console.error('Error canceling appointment:', error);
      toast.error(error.message || 'שגיאה בביטול התור');
    } finally {
      setLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'booked':
        return 'ממתין לאישור';
      case 'confirmed':
        return 'מאושר';
      case 'completed':
        return 'הושלם';
      case 'canceled':
        return 'בוטל';
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">פרטי תור</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  appointment.status === 'booked' ? 'bg-yellow-100 text-yellow-800' :
                  appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{format(parseISO(appointment.start_time), 'HH:mm', { locale: he })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{format(parseISO(appointment.start_time), 'EEEE, d בMMMM', { locale: he })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{appointment.users.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-gray-400" />
                  <span>{appointment.services.name_he}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          {appointment.status !== 'canceled' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Ban className="h-5 w-5" />
              <span>בטל תור</span>
            </motion.button>
          )}
        </div>

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowCancelConfirm(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">ביטול תור</h3>
                    <p className="text-sm text-gray-500">
                      האם אתה בטוח שברצונך לבטל את התור?
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>מבטל...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="h-5 w-5" />
                        <span>בטל תור</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}