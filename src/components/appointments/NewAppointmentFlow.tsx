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
import { CustomerSelector } from './CustomerSelector';
import { ServiceSelector } from './ServiceSelector';
import { StaffDateTimeSelector } from './StaffDateTimeSelector';
import { AppointmentSummary } from './AppointmentSummary';
import { useAuth } from '../../contexts/auth/hooks';
import { supabase } from '../../lib/supabase';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface NewAppointmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialStaffId?: string;
}

type Step = 'customer' | 'service' | 'datetime' | 'summary';

interface ExistingAppointment {
  id: string;
  start_time: string;
  service_name: string;
  staff_name: string;
}

export function NewAppointmentFlow({ onClose, onSuccess, initialDate, initialStaffId }: NewAppointmentFormProps) {
  const { user, business, loading: authLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<Step>('customer');
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
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
    staffId: initialStaffId || '',
    staffName: '',
    date: initialDate || new Date(),
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
    if (business?.id) {
      setBusinessId(business.id);
      return;
    }

    if (!user?.id || authLoading) return;

    const fetchBusinessId = async () => {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (userData?.business_id) {
          setBusinessId(userData.business_id);
        }
      } catch (error) {
        console.error('Error fetching business ID:', error);
        toast.error('שגיאה בטעינת נתוני העסק');
      }
    };

    fetchBusinessId();
  }, [user?.id, business?.id, authLoading]);

  const checkExistingAppointments = async () => {
    if (!businessId || !formData.customerId) return null;

    try {
      // בדיקת תורים קיימים ב-4 ימים הקרובים
      const futureDate = addDays(new Date(), 4);
      
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
        .eq('customer_id', formData.customerId)
        .in('status', ['booked', 'confirmed'])
        .gte('start_time', new Date().toISOString())
        .lte('start_time', futureDate.toISOString())
        .order('start_time')
        .limit(1);

      if (error) throw error;
      
      // אם יש תוצאות, נחזיר את התור הראשון
      if (data && data.length > 0) {
        return {
          id: data[0].id,
          start_time: data[0].start_time,
          service_name: data[0].services.name_he,
          staff_name: data[0].users.name
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing appointments:', error);
      return null;
    }
  };

  const handleCustomerSelect = (data: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail
    }));
    setCurrentStep('service');
  };

  const handleServiceSelect = async (serviceId: string) => {
    try {
      // קבלת פרטי השירות הבסיסיים
      const { data: service, error } = await supabase
        .from('services')
        .select('name_he, price, duration')
        .eq('id', serviceId)
        .single();

      if (error) throw error;

      setFormData(prev => ({ 
        ...prev, 
        serviceId,
        serviceName: service.name_he,
        servicePrice: service.price.toString(),
        serviceDuration: service.duration
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

      // Set the time part of the date
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

  const handleAppointmentCreate = async () => {
    if (!businessId) {
      toast.error('לא נמצא עסק מקושר');
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

  const createAppointment = async (shouldCancelExisting: boolean = false) => {
    if (!businessId) return;

    try {
      setLoading(true);

      // אם צריך לבטל תור קיים
      if (shouldCancelExisting && existingAppointment) {
        const { error: cancelError } = await supabase
          .from('appointments')
          .update({ 
            status: 'canceled',
            metadata: {
              status_change_reason: 'ביטול אוטומטי עקב קביעת תור חדש'
            }
          })
          .eq('id', existingAppointment.id);

        if (cancelError) throw cancelError;

        // הוספת לוג לביטול התור הקיים
        const { error: logError } = await supabase
          .from('appointment_logs')
          .insert({
            appointment_id: existingAppointment.id,
            user_id: user?.id,
            action: 'status_change',
            old_status: 'booked',
            new_status: 'canceled',
            details: {
              timestamp: new Date().toISOString(),
              user_name: user?.user_metadata?.name || user?.email,
              reason: 'ביטול אוטומטי עקב קביעת תור חדש'
            }
          });

        if (logError) {
          console.error('Error creating cancel log:', logError);
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
          customer_id: formData.customerId,
          service_id: formData.serviceId,
          staff_id: formData.staffId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          status: 'booked',
          metadata: {
            created_by: user?.id,
            created_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // הוספת לוג ליצירת התור
      const { error: logError } = await supabase
        .from('appointment_logs')
        .insert({
          appointment_id: appointment.id,
          user_id: user?.id,
          action: 'create',
          new_status: 'booked',
          details: {
            timestamp: new Date().toISOString(),
            user_name: user?.user_metadata?.name || user?.email,
            customer_name: formData.customerName,
            service_name: formData.serviceName,
            staff_name: formData.staffName,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
          }
        });

      if (logError) {
        console.error('Error creating appointment log:', logError);
      }

      toast.success('התור נקבע בהצלחה');
      onSuccess();
      onClose();
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
        <div className="flex-none p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-xl">
                {currentStep === 'customer' ? (
                  <User className="h-5 w-5 text-indigo-600" />
                ) : currentStep === 'service' ? (
                  <Scissors className="h-5 w-5 text-indigo-600" />
                ) : currentStep === 'datetime' ? (
                  <Clock className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Calendar className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold">תור חדש</h2>
                <p className="text-sm text-gray-500">
                  {currentStep === 'customer' ? 'בחירת לקוח' :
                   currentStep === 'service' ? 'בחירת שירות' :
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
          {currentStep === 'customer' && (
            <CustomerSelector
              formData={formData}
              onChange={handleCustomerSelect}
              onSubmit={() => {}}
            />
          )}
          
          {currentStep === 'service' && businessId && (
            <ServiceSelector
              businessId={businessId}
              selectedId={formData.serviceId}
              onSelect={handleServiceSelect}
            />
          )}
          
          {currentStep === 'datetime' && businessId && (
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
              data={formData}
              onEdit={setCurrentStep}
              onConfirm={handleAppointmentCreate}
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
                      נמצא תור קיים בימים הקרובים
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                  <p className="text-sm text-yellow-800">
                    יש לך תור {existingAppointment.service_name} עם {existingAppointment.staff_name} ב-{format(new Date(existingAppointment.start_time), 'EEEE, d בMMMM בשעה HH:mm', { locale: he })}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
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
      </motion.div>
    </motion.div>
  );
}