import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Repeat, Check, AlertTriangle } from 'lucide-react';
import { format, addWeeks, addDays, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { RecurringAppointmentForm } from './RecurringAppointmentForm';
import { RecurringAppointmentSummary } from './RecurringAppointmentSummary';
import { RecurringAppointmentConfirmation } from './RecurringAppointmentConfirmation';
import { useRecurringAppointments } from '../../hooks/useRecurringAppointments';
import toast from 'react-hot-toast';

interface RecurringAppointmentModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'form' | 'summary' | 'confirmation';

export function RecurringAppointmentModal({ 
  customerId, 
  customerName, 
  onClose, 
  onSuccess 
}: RecurringAppointmentModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>('form');
  const [loading, setLoading] = useState(false);
  const { createRecurringAppointments } = useRecurringAppointments();
  
  const [formData, setFormData] = useState({
    serviceId: '',
    serviceName: '',
    servicePrice: 0,
    serviceDuration: '',
    staffId: '',
    staffName: '',
    startDate: new Date(),
    time: '09:00',
    recurrenceType: 'weekly' as 'weekly' | 'daily',
    recurrenceCount: 4,
    recurrenceDays: [0, 1, 2, 3, 4, 5, 6].filter(day => day === new Date().getDay()),
  });

  const [generatedAppointments, setGeneratedAppointments] = useState<any[]>([]);

  const handleFormSubmit = () => {
    // Generate preview of appointments
    const appointments = [];
    const startDate = new Date(formData.startDate);
    const [hours, minutes] = formData.time.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    
    if (formData.recurrenceType === 'weekly') {
      for (let i = 0; i < formData.recurrenceCount; i++) {
        const weekDate = addWeeks(startDate, i);
        for (const day of formData.recurrenceDays) {
          const currentDay = weekDate.getDay();
          const daysToAdd = (day - currentDay + 7) % 7;
          const appointmentDate = addDays(weekDate, daysToAdd);
          
          appointments.push({
            date: appointmentDate,
            serviceId: formData.serviceId,
            serviceName: formData.serviceName,
            staffId: formData.staffId,
            staffName: formData.staffName,
            time: formData.time,
          });
        }
      }
    } else {
      // Daily recurrence
      for (let i = 0; i < formData.recurrenceCount; i++) {
        const appointmentDate = addDays(startDate, i);
        appointments.push({
          date: appointmentDate,
          serviceId: formData.serviceId,
          serviceName: formData.serviceName,
          staffId: formData.staffId,
          staffName: formData.staffName,
          time: formData.time,
        });
      }
    }
    
    setGeneratedAppointments(appointments);
    setCurrentStep('summary');
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      
      const appointmentsToCreate = generatedAppointments.map(apt => ({
        customerId,
        serviceId: apt.serviceId,
        staffId: apt.staffId,
        startTime: apt.date.toISOString(),
        notes: `תור קבוע - נוצר אוטומטית`
      }));
      
      await createRecurringAppointments(appointmentsToCreate);
      
      setCurrentStep('confirmation');
      toast.success('התורים הקבועים נקבעו בהצלחה');
    } catch (error: any) {
      console.error('Error creating recurring appointments:', error);
      toast.error(error.message || 'שגיאה ביצירת תורים קבועים');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  // Hide bottom nav when modal is open
  React.useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Repeat className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">תורים קבועים</h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 'form' && 'קביעת תורים קבועים עבור ' + customerName}
                  {currentStep === 'summary' && 'אישור תורים קבועים'}
                  {currentStep === 'confirmation' && 'התורים נקבעו בהצלחה'}
                </p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentStep === 'form' && (
              <RecurringAppointmentForm
                key="form"
                formData={formData}
                onChange={setFormData}
                onSubmit={handleFormSubmit}
              />
            )}
            
            {currentStep === 'summary' && (
              <RecurringAppointmentSummary
                key="summary"
                appointments={generatedAppointments}
                customerName={customerName}
                onConfirm={handleConfirm}
                onBack={() => setCurrentStep('form')}
                loading={loading}
              />
            )}
            
            {currentStep === 'confirmation' && (
              <RecurringAppointmentConfirmation
                key="confirmation"
                appointmentsCount={generatedAppointments.length}
                onDone={handleDone}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}