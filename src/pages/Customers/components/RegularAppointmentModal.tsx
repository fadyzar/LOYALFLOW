import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, DollarSign, Check, ArrowRight } from 'lucide-react';
import { Database } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  checkFreeAppointmentEligibility,
  checkBirthdayAppointmentEligibility,
  calculateLoyaltyDiscounts
} from '../../../lib/loyalty';

type Customer = Database['public']['Tables']['customers']['Row'];
type Staff = Database['public']['Tables']['users']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type StaffService = Database['public']['Tables']['staff_services']['Row'];

interface LoyaltyBenefits {
  services_discount: number;
  products_discount: number;
  birthday_appointment: boolean;
  free_appointment_every: number | null;
}

interface RegularAppointmentModalProps {
  onClose: () => void;
  customer: Customer;
  businessSettings?: {
    loyalty?: {
      enabled: boolean;
      levels: {
        [key: string]: {
          benefits: LoyaltyBenefits;
        };
      };
    };
  };
}

interface AppointmentPreview {
  start: Date;
  end: Date;
  formattedDate: string;
  formattedTime: string;
}

export function RegularAppointmentModal({ onClose, customer, businessSettings }: RegularAppointmentModalProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [repeatCount, setRepeatCount] = useState<number | null>(12); // Default to 12 times (3 months for weekly)
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [staffServices, setStaffServices] = useState<StaffService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [appointmentPreviews, setAppointmentPreviews] = useState<AppointmentPreview[]>([]);
  const [finalPrice, setFinalPrice] = useState<number>(0);
  const [currentStaffService, setCurrentStaffService] = useState<StaffService | null>(null);
  const [benefits, setBenefits] = useState<{
    isFreeAppointment: boolean;
    isBirthdayAppointment: boolean;
    loyaltyDiscount: number;
    finalPrice: number;
  } | null>(null);

  // Hide bottom nav when modal is open
  useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

  useEffect(() => {
    loadStaffMembers();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      loadAvailableServices(selectedStaff.id);
    } else {
      setAvailableServices([]);
      setSelectedService(null);
      setStaffServices([]);
    }
  }, [selectedStaff]);

  useEffect(() => {
    if (selectedService && businessSettings?.loyalty?.enabled) {
      const staffService = getStaffService(selectedService.id);
      setCurrentStaffService(staffService || null);
      
      // Calculate initial price
      const basePrice = staffService?.price || selectedService.price;
      let calculatedPrice = basePrice;
      
      // Apply loyalty discount if available
      const loyaltyLevel = customer.loyalty_level;
      const loyaltyBenefits = loyaltyLevel && businessSettings.loyalty.levels[loyaltyLevel]?.benefits;
      const servicesDiscount = loyaltyBenefits?.services_discount ?? 0;
      
      if (servicesDiscount > 0) {
        calculatedPrice = basePrice * (1 - servicesDiscount / 100);
      }
      
      setFinalPrice(calculatedPrice);
    } else if (selectedService) {
      // If loyalty is not enabled, just use the base price
      const staffService = getStaffService(selectedService.id);
      const basePrice = staffService?.price || selectedService.price;
      setFinalPrice(basePrice);
    }
  }, [selectedService, customer.loyalty_level, businessSettings]);

  const loadStaffMembers = async () => {
    try {
      setLoading(true);
      if (!customer?.business_id) {
        console.error('Missing business_id for customer:', customer);
        setError('שגיאה בטעינת אנשי הצוות: חסר מזהה עסק');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', customer.business_id)
        .in('role', ['staff', 'admin'])
        .order('name');

      if (error) throw error;
      setStaffMembers(data || []);
    } catch (error) {
      console.error('Error loading staff members:', error);
      setError('שגיאה בטעינת אנשי הצוות');
    } finally {
      setLoading(false);
    }
  };

  // Function to convert interval to minutes
  const intervalToMinutes = (interval: string): number => {
    if (!interval) return 0;
    
    // Handle different interval formats
    const parts = interval.split(':');
    let minutes = 0;
    
    if (parts.length === 3) {
      // Format: HH:MM:SS or 00:MM:00 or 00:00:MM
      const hours = parseInt(parts[0]);
      const mins = parseInt(parts[1]);
      const secs = parseInt(parts[2]);
      
      if (hours === 0 && mins === 0 && secs > 0) {
        // If format is 00:00:MM, treat MM as minutes
        minutes = secs;
      } else {
        minutes = hours * 60 + mins;
      }
    } else if (parts.length === 2) {
      // Format: MM:SS or HH:MM
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      
      if (second === 0) {
        // If format is MM:00, treat MM as minutes
        minutes = first;
      } else if (first === 0) {
        // If format is 00:MM, treat MM as minutes
        minutes = second;
      } else {
        // Assume HH:MM format
        minutes = first * 60 + second;
      }
    } else {
      // Format: just minutes
      minutes = parseInt(interval);
    }
    
    return minutes;
  };

  // Function to format duration for display - always show as minutes
  const formatDuration = (interval: string): string => {
    if (!interval) return '0 דקות';
    
    // Handle different interval formats
    const parts = interval.split(':');
    let minutes = 0;
    
    if (parts.length === 3) {
      // Format: HH:MM:SS or 00:MM:00
      const hours = parseInt(parts[0]);
      minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      
      if (hours === 0 && minutes === 0 && seconds > 0) {
        // If format is 00:00:MM, treat MM as minutes
        minutes = seconds;
      } else {
        minutes += hours * 60;
      }
    } else if (parts.length === 2) {
      // Format: MM:SS
      minutes = parseInt(parts[0]);
    } else {
      // Format: just minutes
      minutes = parseInt(interval);
    }
    
    return `${minutes} דקות`;
  };

  const loadAvailableServices = async (staffId: string) => {
    try {
      setLoading(true);
      const { data: staffServicesData, error: staffServicesError } = await supabase
        .from('staff_services')
        .select(`
          *,
          services (*)
        `)
        .eq('staff_id', staffId)
        .eq('is_active', true);

      if (staffServicesError) throw staffServicesError;

      if (!staffServicesData || staffServicesData.length === 0) {
        const { data: businessServices, error: businessServicesError } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', customer.business_id)
          .order('name_he');

        if (businessServicesError) throw businessServicesError;
        setAvailableServices(businessServices || []);
        setStaffServices([]);
      } else {
        const services = staffServicesData.map((ss: { services: Service }) => ss.services);
        setAvailableServices(services);
        setStaffServices(staffServicesData);
      }
    } catch (error) {
      console.error('Error loading services:', error);
      setError('שגיאה בטעינת השירותים');
    } finally {
      setLoading(false);
    }
  };

  const getStaffService = (serviceId: string) => {
    return staffServices.find(ss => ss.service_id === serviceId);
  };

  const generateAppointmentPreviews = () => {
    if (!selectedStaff || !selectedService || !repeatCount) return [];

    const previews: AppointmentPreview[] = [];
    const staffService = getStaffService(selectedService.id);
    const duration = staffService?.duration || selectedService.duration;
    const durationMinutes = intervalToMinutes(duration);

    let currentDate = new Date(`${startDate}T${time}`);
    
    for (let i = 0; i < repeatCount; i++) {
      const start = new Date(currentDate);
      const end = new Date(start.getTime() + (durationMinutes * 60 * 1000));

      previews.push({
        start,
        end,
        formattedDate: format(start, 'EEEE, d בMMMM', { locale: he }),
        formattedTime: format(start, 'HH:mm')
      });

      // Calculate next date based on frequency
      switch (frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }

    return previews;
  };

  const calculateBenefits = async (appointmentDate: Date) => {
    if (!selectedService || !selectedStaff || !customer) return null;

    try {
      // Get staff service price
      const { data: staffService } = await supabase
        .from('staff_services')
        .select('price')
        .eq('staff_id', selectedStaff.id)
        .eq('service_id', selectedService.id)
        .single();

      const basePrice = staffService?.price || selectedService.price || 0;

      // Get customer's loyalty level
      const { data: customerData } = await supabase
        .from('customers')
        .select('loyalty_level, diamonds, birth_date')
        .eq('id', customer.id)
        .single();

      if (!customerData) return null;

      // Check if it's customer's birthday month
      const isBirthdayMonth = customerData.birth_date 
        ? new Date(customerData.birth_date).getMonth() === appointmentDate.getMonth()
        : false;

      // Get loyalty settings
      const { data: loyaltySettings } = await supabase
        .from('business_settings')
        .select('loyalty_settings')
        .single();

      if (!loyaltySettings?.loyalty_settings) return null;

      const loyaltyLevel = customerData.loyalty_level;
      const loyaltyBenefits = loyaltySettings.loyalty_settings[loyaltyLevel];

      // Calculate benefits
      let finalPrice = basePrice;
      let loyaltyDiscount = 0;
      let isFreeAppointment = false;
      let isBirthdayAppointment = false;

      // Apply loyalty discount
      if (loyaltyBenefits?.discount_percentage) {
        loyaltyDiscount = (basePrice * loyaltyBenefits.discount_percentage) / 100;
        finalPrice -= loyaltyDiscount;
      }

      // Check for free appointments
      if (loyaltyBenefits?.free_appointments_per_year) {
        const { count } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', customer.id)
          .eq('status', 'completed')
          .gte('start_time', new Date(new Date().getFullYear(), 0, 1).toISOString())
          .lte('start_time', new Date(new Date().getFullYear(), 11, 31).toISOString());

        if (count && count < loyaltyBenefits.free_appointments_per_year) {
          isFreeAppointment = true;
          finalPrice = 0;
        }
      }

      // Check for birthday benefit
      if (isBirthdayMonth && loyaltyBenefits?.birthday_benefit) {
        isBirthdayAppointment = true;
        finalPrice = 0;
      }

      return {
        basePrice,
        loyaltyDiscount,
        finalPrice,
        isFreeAppointment,
        isBirthdayAppointment,
        loyaltyLevel,
        loyaltyBenefits
      };
    } catch (error) {
      console.error('Error calculating benefits:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedService || !repeatCount) {
      setError('נא למלא את כל השדות');
      return;
    }

    try {
      setLoading(true);
      const calculatedBenefits = await calculateBenefits(new Date(startDate));
      setBenefits(calculatedBenefits);
    const previews = generateAppointmentPreviews();
    setAppointmentPreviews(previews);
    setShowConfirmation(true);
    } catch (error) {
      console.error('Error calculating benefits:', error);
      setError('שגיאה בחישוב ההטבות');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointments = async () => {
    try {
      setLoading(true);
      if (!benefits || !selectedService) {
        throw new Error('לא ניתן ליצור תורים ללא חישוב הטבות');
      }
      if (!customer?.business_id) {
        throw new Error('חסר מזהה עסק');
      }

      // Create all appointments
      for (const preview of appointmentPreviews) {
        const { error } = await supabase
          .from('appointments')
          .insert({
            business_id: customer.business_id,
            customer_id: customer.id,
            staff_id: selectedStaff!.id,
            service_id: selectedService.id,
            start_time: preview.start.toISOString(),
            end_time: preview.end.toISOString(),
            status: 'booked',
            metadata: {
              price: benefits.finalPrice,
              duration: intervalToMinutes(currentStaffService?.duration || selectedService.duration),
              is_free_appointment: benefits.isFreeAppointment || benefits.isBirthdayAppointment,
              loyalty_benefits: {
                is_free_appointment: benefits.isFreeAppointment,
                is_birthday_appointment: benefits.isBirthdayAppointment,
                loyalty_discount: benefits.loyaltyDiscount
              }
            }
          });

        if (error) throw error;
      }

      onClose();
    } catch (error: any) {
      console.error('Error creating appointments:', error);
      setError(error.message || 'שגיאה ביצירת התורים');
    } finally {
      setLoading(false);
    }
  };

  const calculateEndDate = (startDate: string, frequency: string, repeatCount: number): string => {
    const start = new Date(startDate);
    let end = new Date(start);
    
    switch (frequency) {
      case 'weekly':
        end.setDate(start.getDate() + (repeatCount * 7));
        break;
      case 'biweekly':
        end.setDate(start.getDate() + (repeatCount * 14));
        break;
      case 'monthly':
        end.setMonth(start.getMonth() + repeatCount);
        break;
    }
    
    return end.toISOString().split('T')[0];
  };

  if (showConfirmation) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">אישור תורים קבועים</h2>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                האם לקבוע את התורים הבאים עבור {selectedStaff?.name} - {selectedService?.name_he}?
              </p>

              {/* Price and Benefits Summary */}
              <div className="bg-indigo-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">פרטי תשלום והטבות:</h3>
                <div className="space-y-2 text-sm">
                  {loading ? (
                    <p>טוען נתונים...</p>
                  ) : benefits && (
                    <>
                      <div className="flex justify-between">
                        <span>מחיר מקורי:</span>
                        <span>{(currentStaffService?.price || selectedService?.price || 0).toLocaleString('he-IL')} ₪</span>
                      </div>
                      
                      {benefits.loyaltyDiscount > 0 && (
                        <div className="flex justify-between text-indigo-600">
                          <span>הנחת נאמנות:</span>
                          <span>-{benefits.loyaltyDiscount.toLocaleString('he-IL')} ₪</span>
                        </div>
                      )}

                      {benefits.isFreeAppointment && (
                        <div className="flex justify-between text-green-600">
                          <span>הטבת תור חינם:</span>
                          <span>תור חינם!</span>
                        </div>
                      )}

                      {benefits.isBirthdayAppointment && (
                        <div className="flex justify-between text-purple-600">
                          <span>הטבת יום הולדת:</span>
                          <span>תור חינם!</span>
                        </div>
                      )}

                      <div className="flex justify-between font-medium pt-2 border-t">
                        <span>מחיר סופי לתור:</span>
                        <span className="text-lg">{benefits.finalPrice.toLocaleString('he-IL')} ₪</span>
                      </div>

                      <div className="text-gray-500 text-xs mt-2">
                        * המחיר הסופי יחושב בנפרד לכל תור בהתאם להטבות הזמינות במועד התור
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
                {appointmentPreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{preview.formattedDate}</p>
                        <p className="text-sm text-gray-500">{preview.formattedTime}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmation(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                חזרה
              </button>
              <button
                onClick={handleConfirmAppointments}
                disabled={loading}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  'מקבע תורים...'
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    אישור וקביעת תורים
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 my-auto max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">תור קבוע חדש</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Staff Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                איש צוות
              </label>
              <select
                value={selectedStaff?.id || ''}
                onChange={(e) => {
                  const staff = staffMembers.find(s => s.id === e.target.value);
                  setSelectedStaff(staff || null);
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">בחר איש צוות</option>
                {staffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} ({staff.role === 'admin' ? 'מנהל' : 'איש צוות'})
                  </option>
                ))}
              </select>
            </div>

            {/* Service Selection */}
            {selectedStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שירות
                </label>
                <select
                  value={selectedService?.id || ''}
                  onChange={(e) => {
                    const service = availableServices.find(s => s.id === e.target.value);
                    setSelectedService(service || null);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">בחר שירות</option>
                  {availableServices.map((service) => {
                    const staffService = getStaffService(service.id);
                    const duration = staffService?.duration || service.duration;
                    const price = staffService?.price || service.price;
                    return (
                      <option key={service.id} value={service.id}>
                        {service.name_he} - {formatDuration(duration)}
                        {price ? ` - ${price}₪` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שעה
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                תדירות
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="weekly">שבועי</option>
                <option value="biweekly">דו-שבועי</option>
                <option value="monthly">חודשי</option>
              </select>
            </div>

            {/* Repeat Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מספר פעמים
              </label>
              <input
                type="number"
                value={repeatCount ?? ''}
                onChange={(e) => setRepeatCount(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
                min="1"
                max="52"
                placeholder="הזן מספר פעמים"
              />
              {repeatCount && (
                <p className="text-sm text-gray-500 mt-1">
                  התור יחזור על עצמו {repeatCount} פעמים
                  {frequency === 'weekly' && ` (${repeatCount} שבועות)`}
                  {frequency === 'biweekly' && ` (${repeatCount * 2} שבועות)`}
                  {frequency === 'monthly' && ` (${repeatCount} חודשים)`}
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-3 sticky bottom-0 bg-white pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'שומר...' : 'שמור'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 