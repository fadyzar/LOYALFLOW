import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Plus,
  Mail, 
  Lock, 
  Phone, 
  User,
  Package,
  Scissors,
  Calendar,
  CreditCard,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { CustomerAuth } from '../auth/CustomerAuth';
import { ServiceSelector } from './ServiceSelector';
import { StaffDateTimeSelector } from './StaffDateTimeSelector';
import { AppointmentSummary } from './AppointmentSummary';
import { supabase } from '../../lib/supabase';
import { format, addDays, isSameDay } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface BookingWizardProps {
  businessId: string;
  onClose: () => void;
  onSuccess: (appointmentId: string) => void;
}

type Step = 'customer' | 'service' | 'datetime' | 'summary';

interface ExistingAppointment {
  id: string;
  start_time: string;
  service_name: string;
  staff_name: string;
  is_same_day: boolean;
}

export function BookingWizard({ businessId, onClose, onSuccess }: BookingWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [loading, setLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [customerData, setCustomerData] = useState<any>(null);
  const [showExistingAppointmentModal, setShowExistingAppointmentModal] = useState(false);
  const [existingAppointment, setExistingAppointment] = useState<ExistingAppointment | null>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    serviceId: '',
    serviceName: '',
    servicePrice: '',
    serviceDuration: '00:30:00', // ברירת מחדל - 30 דקות
    staffId: '',
    staffName: '',
    date: new Date(),
    time: '09:00'
  });

  // Hide bottom nav when modal is open
  useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const customerPhone = localStorage.getItem('customerPhone');
    if (!customerPhone) {
      setCustomerData(null);
      return;
    }

    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .eq('phone', customerPhone)
        .single();

      if (error || !customer) {
        localStorage.removeItem('customerPhone');
        setCustomerData(null);
        return;
      }

      setCustomerData(customer);
      setFormData(prev => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email
      }));
    } catch (error) {
      console.error('Error checking auth:', error);
      setCustomerData(null);
    }
  };

  const handleServiceSelect = async (serviceId: string) => {
    if (!customerData) {
      setShowAuth(true);
      return;
    }

    try {
      const { data: service, error } = await supabase
        .from('services')
        .select('name_he, price, duration')
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      let finalPrice = service.price;
      let finalDuration = service.duration;

      if (formData.staffId) {
        const { data: staffService, error: staffServiceError } = await supabase
          .from('staff_services')
          .select('price, duration')
          .eq('staff_id', formData.staffId)
          .eq('service_id', serviceId)
          .single();

        if (staffServiceError && staffServiceError.code !== 'PGRST116') throw staffServiceError;

        if (staffService) {
          finalPrice = staffService.price || finalPrice;
          finalDuration = staffService.duration || finalDuration;
        }
      }

      setFormData(prev => ({ 
        ...prev, 
        serviceId,
        serviceName: service.name_he,
        servicePrice: finalPrice.toString(),
        serviceDuration: finalDuration
      }));
      setCurrentStep('datetime');
    } catch (error: any) {
      console.error('Error loading service details:', error);
      toast.error('שגיאה בטעינת פרטי השירות');
    }
  };

  const handleDateTimeSelect = async (date: Date, time: string, staffId: string) => {
    if (!staffId) {
      toast.error('יש לבחור איש צוות');
      return;
    }

    if (!time) {
      try {
        const { data: staff, error } = await supabase
          .from('users')
          .select('name')
          .eq('id', staffId)
          .single();

        if (error) throw error;

        const { data: staffService, error: staffServiceError } = await supabase
          .from('staff_services')
          .select('price, duration')
          .eq('staff_id', staffId)
          .eq('service_id', formData.serviceId)
          .single();

        if (staffServiceError && staffServiceError.code !== 'PGRST116') throw staffServiceError;

        setFormData(prev => ({ 
          ...prev, 
          staffId,
          staffName: staff.name,
          servicePrice: staffService?.price?.toString() || prev.servicePrice,
          serviceDuration: staffService?.duration || prev.serviceDuration
        }));
      } catch (error: any) {
        console.error('Error loading staff details:', error);
        toast.error('שגיאה בטעינת פרטי איש הצוות');
      }
      return;
    }

    try {
      const { data: staff, error } = await supabase
        .from('users')
        .select('name')
        .eq('id', staffId)
        .single();

      if (error) throw error;

      const { data: staffService, error: staffServiceError } = await supabase
        .from('staff_services')
        .select('price, duration')
        .eq('staff_id', staffId)
        .eq('service_id', formData.serviceId)
        .single();

      if (staffServiceError && staffServiceError.code !== 'PGRST116') throw staffServiceError;

      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hours, minutes, 0, 0);

      setFormData(prev => ({ 
        ...prev, 
        date: appointmentDate,
        time,
        staffId,
        staffName: staff.name,
        servicePrice: staffService?.price?.toString() || prev.servicePrice,
        serviceDuration: staffService?.duration || prev.serviceDuration
      }));
      setCurrentStep('summary');
    } catch (error: any) {
      console.error('Error loading staff details:', error);
      toast.error('שגיאה בטעינת פרטי איש הצוות');
    }
  };

  const handleConfirm = async () => {
    if (!customerData) {
      setShowAuth(true);
      return;
    }

    try {
      setLoading(true);

      // בדיקת תורים קיימים
      const existingAppointment = await checkExistingAppointments();
      if (existingAppointment) {
        setExistingAppointment(existingAppointment);
        setShowExistingAppointmentModal(true);
        setLoading(false);
        return;
      }

      await createAppointment();
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'שגיאה בקביעת התור');
      setLoading(false);
    }
  };

  const checkExistingAppointments = async () => {
    if (!customerData?.id) return null;

    try {
      // בדיקת תורים קיימים ב-3 ימים הקרובים
      const futureDate = addDays(new Date(), 3);
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          services (
            name_he
          ),
          users (
            name
          )
        `)
        .eq('business_id', businessId)
        .eq('customer_id', customerData.id)
        .in('status', ['booked', 'confirmed'])
        .gte('start_time', new Date().toISOString())
        .lte('start_time', futureDate.toISOString())
        .order('start_time')
        .limit(1);

      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          id: data[0].id,
          start_time: data[0].start_time,
          service_name: data[0].services.name_he,
          staff_name: data[0].users.name,
          is_same_day: isSameDay(new Date(data[0].start_time), formData.date)
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing appointments:', error);
      return null;
    }
  };

  const createAppointment = async (shouldCancelExisting: boolean = false) => {
    try {
      setLoading(true);

      // אם צריך לבטל תור קיים
      if (shouldCancelExisting && existingAppointment) {
        const customerPhone = localStorage.getItem('customerPhone');
        if (!customerPhone) {
          throw new Error('לא נמצא מספר טלפון של הלקוח');
        }

        const { error: cancelError } = await supabase.rpc('cancel_appointment', {
          appointment_id: existingAppointment.id,
          customer_phone: customerPhone,
          reason: 'ביטול אוטומטי עקב קביעת תור חדש'
        });

        if (cancelError) {
          console.error('Error canceling appointment:', cancelError);
          throw new Error('שגיאה בביטול התור הקיים');
        }
      }

      // חישוב זמן סיום לפי זמן שירות מותאם
      const startTime = formData.date;
      const durationMatch = formData.serviceDuration.match(/(\d+):(\d+):(\d+)/);
      
      let durationMinutes = 30; // ברירת מחדל
      if (durationMatch) {
        const [_, hours, minutes, seconds] = durationMatch;
        if (parseInt(hours) > 0 || parseInt(minutes) > 0) {
          durationMinutes = parseInt(hours) * 60 + parseInt(minutes);
        }
        else if (parseInt(seconds) > 0) {
          durationMinutes = parseInt(seconds);
        }
      }

      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          customer_id: customerData.id,
          service_id: formData.serviceId,
          staff_id: formData.staffId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'booked',
          metadata: {
            created_by: 'customer',
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      onSuccess(appointment.id);
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      toast.error(error.message || 'שגיאה בקביעת התור');
    } finally {
      setLoading(false);
      setShowExistingAppointmentModal(false);
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
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                {currentStep === 'service' ? (
                  <Scissors className="h-5 w-5 text-indigo-600" />
                ) : currentStep === 'datetime' ? (
                  <Clock className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">הזמנת תור</h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 'service' ? 'בחירת שירות' :
                   currentStep === 'datetime' ? 'בחירת מועד ואיש צוות' :
                   'סיכום ואישור'}
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
          {currentStep === 'service' && (
            <ServiceSelector
              businessId={businessId}
              selectedId={formData.serviceId}
              onSelect={handleServiceSelect}
            />
          )}
          
          {currentStep === 'datetime' && (
            <StaffDateTimeSelector
              businessId={businessId}
              selectedDate={formData.date}
              selectedTime={formData.time}
              selectedStaffId={formData.staffId}
              serviceId={formData.serviceId}
              onChange={handleDateTimeSelect}
              onBack={() => setCurrentStep('service')}
            />
          )}

          {currentStep === 'summary' && (
            <AppointmentSummary
              data={{
                customerName: customerData?.name || 'אורח',
                customerPhone: customerData?.phone || '',
                customerEmail: customerData?.email,
                serviceId: formData.serviceId,
                serviceName: formData.serviceName,
                servicePrice: parseFloat(formData.servicePrice),
                serviceDuration: formData.serviceDuration,
                staffId: formData.staffId,
                staffName: formData.staffName,
                date: formData.date
              }}
              onEdit={(step) => {
                switch (step) {
                  case 'service':
                    setCurrentStep('service');
                    setFormData(prev => ({
                      ...prev,
                      staffId: '',
                      staffName: '',
                      time: '09:00'
                    }));
                    break;
                  case 'datetime':
                    setCurrentStep('datetime');
                    setFormData(prev => ({
                      ...prev,
                      time: ''
                    }));
                    break;
                }
              }}
              onConfirm={handleConfirm}
              loading={loading}
            />
          )}
        </div>

        {/* Existing Appointment Modal */}
        <AnimatePresence>
          {showExistingAppointmentModal && existingAppointment && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowExistingAppointmentModal(false);
                  setLoading(false);
                }
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
                  <div className="p-2 bg-yellow-100 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">תור קיים</h3>
                    <p className="text-sm text-gray-500">
                      {existingAppointment.is_same_day 
                        ? 'נמצא תור קיים לאותו היום'
                        : 'נמצא תור קיים בימים הקרובים'
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800">
                    יש לך תור {existingAppointment.service_name} עם {existingAppointment.staff_name} ב-{format(new Date(existingAppointment.start_time), 'EEEE, d בMMMM בשעה HH:mm', { locale: he })}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {existingAppointment.is_same_day ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => createAppointment(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        בחר בתור החדש
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setShowExistingAppointmentModal(false);
                          setLoading(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        השאר את התור הקיים
                      </motion.button>
                    </>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => createAppointment(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        בטל את התור הקיים וקבע תור חדש
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => createAppointment(false)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        השאר את התור הקיים וקבע תור נוסף
                      </motion.button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setShowExistingAppointmentModal(false);
                      setLoading(false);
                    }}
                    className="w-full px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Modal */}
        <AnimatePresence>
          {showAuth && businessId && (
            <CustomerAuth
              businessId={businessId}
              onClose={() => setShowAuth(false)}
              onSuccess={async () => {
                // בדוק מחדש את פרטי הלקוח
                const customerPhone = localStorage.getItem('customerPhone');
                if (!customerPhone) return;

                const { data: customer, error } = await supabase
                  .from('customers')
                  .select('*')
                  .eq('business_id', businessId)
                  .eq('phone', customerPhone)
                  .single();

                if (!error && customer) {
                  setCustomerData(customer);
                  setFormData(prev => ({
                    ...prev,
                    customerId: customer.id,
                    customerName: customer.name,
                    customerPhone: customer.phone,
                    customerEmail: customer.email
                  }));
                  setShowAuth(false);
                  toast.success('התחברת בהצלחה!');
                  
                  // המשך לפעולה המקורית
                  if (currentStep === 'service') {
                    handleServiceSelect(formData.serviceId);
                  } else if (currentStep === 'summary') {
                    handleConfirm();
                  }
                }
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}