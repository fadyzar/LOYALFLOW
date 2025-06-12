import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Scissors, Check } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../../lib/supabase';

interface LoyaltyBenefits {
  services_discount?: number;
  products_discount?: number;
  birthday_appointment?: boolean;
  free_appointment_every?: number;
}

interface BusinessData {
  loyalty: {
    levels: {
      [key: string]: {
        benefits: LoyaltyBenefits;
        diamonds_required: number;
      };
    };
  };
}

interface AppointmentSummaryProps {
  data: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: string;
    staffId: string;
    staffName: string;
    date: Date;
    businessId: string;
  };
  onEdit: (field: 'customer' | 'service' | 'datetime') => void;
  onConfirm: () => void;
  loading?: boolean;
}

interface Benefits {
  basePrice: number;
  loyaltyDiscount: number;
  finalPrice: number;
  isFreeAppointment: boolean;
  loyaltyLevel: string;
  loyaltyBenefits: any;
  selectedBenefits: {
    loyaltyDiscount: boolean;
    freeAppointment: boolean;
  };
}

export function AppointmentSummary({ data, onEdit, onConfirm, loading }: AppointmentSummaryProps) {
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);

  // חילוץ משך זמן השירות
  const getDurationMinutes = (duration: string): number => {
    // נסה לפרסר פורמט של interval מ-PostgreSQL (HH:MM:SS)
    const intervalMatch = duration.match(/(\d+):(\d+):(\d+)/);
    if (intervalMatch) {
      const [_, hours, minutes, seconds] = intervalMatch;
      // אם יש ערך בשדה השעות, נכפיל ב-60 דקות
      // אם יש ערך בשדה הדקות, נוסיף אותו
      // אם יש ערך בשדה השניות ואין ערכים בשדות האחרים, נניח שזה דקות
      if (parseInt(hours) > 0 || parseInt(minutes) > 0) {
        return parseInt(hours) * 60 + parseInt(minutes);
      } else if (parseInt(seconds) > 0) {
        return parseInt(seconds);
      }
    }

    // נסה לפרסר פורמט של "X minutes" או "X hours"
    const textMatch = duration.match(/(\d+)\s*(minute|hour)s?/);
    if (textMatch) {
      const [_, value, unit] = textMatch;
      return unit === 'hour' ? parseInt(value) * 60 : parseInt(value);
    }

    // אם הערך הוא מספר בלבד, נניח שאלו דקות
    const numericMatch = duration.match(/^(\d+)$/);
    if (numericMatch) {
      return parseInt(numericMatch[1]);
    }

    // ברירת מחדל - 30 דקות
    console.warn('Could not parse duration:', duration);
    return 30;
  };

  const durationMinutes = getDurationMinutes(data.serviceDuration);

  // חישוב זמן סיום
  const endTime = addMinutes(data.date, durationMinutes);

  const toggleBenefit = (benefit: 'loyaltyDiscount' | 'freeAppointment') => {
    if (!benefits) return;
    
    const newSelectedBenefits = {
      ...benefits.selectedBenefits,
      [benefit]: !benefits.selectedBenefits[benefit]
    };

    let finalPrice = benefits.basePrice;
    
    if (newSelectedBenefits.loyaltyDiscount) {
      finalPrice -= benefits.loyaltyDiscount;
    }
    
    if (newSelectedBenefits.freeAppointment) {
      finalPrice = 0;
    }

    setBenefits({
      ...benefits,
      selectedBenefits: newSelectedBenefits,
      finalPrice
    });
  };

  useEffect(() => {
    const calculateBenefits = async () => {
      if (!data.customerId || !data.serviceId || !data.staffId) return;

      try {
        setBenefitsLoading(true);
        // Get staff service price
        const { data: staffService } = await supabase
          .from('staff_services')
          .select('price')
          .eq('staff_id', data.staffId)
          .eq('service_id', data.serviceId)
          .single();

        const basePrice = staffService?.price || data.servicePrice;

        // Get customer's loyalty level
        const { data: customerData } = await supabase
          .from('customers')
          .select('loyalty_level, diamonds')
          .eq('id', data.customerId as unknown as string)
          .single();

        if (!customerData) return;

        // Get loyalty settings
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (!userData?.business_id) return;

        const { data: businessData } = await supabase
          .from('businesses')
          .select('settings->loyalty')
          .eq('id', userData.business_id)
          .single();

        if (!businessData?.loyalty) return;

        const loyaltyLevel = customerData.loyalty_level;
        const loyaltyBenefits = (businessData.loyalty as unknown as BusinessData['loyalty']).levels[loyaltyLevel].benefits;

        // Calculate benefits
        let finalPrice = basePrice;
        let loyaltyDiscount = 0;
        let isFreeAppointment = false;

        // Apply loyalty discount
        if (loyaltyBenefits?.services_discount) {
          loyaltyDiscount = (basePrice * loyaltyBenefits.services_discount) / 100;
          finalPrice -= loyaltyDiscount;
        }

        // Check for free appointments
        if (loyaltyBenefits?.free_appointment_every) {
          const { count } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('customer_id', data.customerId)
            .eq('status', 'completed')
            .gte('start_time', new Date(new Date().getFullYear(), 0, 1).toISOString())
            .lte('start_time', new Date(new Date().getFullYear(), 11, 31).toISOString());

          if (count && count % loyaltyBenefits.free_appointment_every === 0) {
            isFreeAppointment = true;
            finalPrice = 0;
          }
        }

        setBenefits({
          basePrice,
          loyaltyDiscount,
          finalPrice: basePrice, // Start with base price
          isFreeAppointment,
          loyaltyLevel,
          loyaltyBenefits,
          selectedBenefits: {
            loyaltyDiscount: false,
            freeAppointment: false
          }
        });
      } catch (error) {
        console.error('Error calculating benefits:', error);
        setBenefitsError('שגיאה בחישוב ההטבות');
      } finally {
        setBenefitsLoading(false);
      }
    };

    calculateBenefits();
  }, [data.customerId, data.serviceId, data.staffId, data.date, data.businessId]);

  return (
    <div className="space-y-6">
      {/* Customer Info */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">פרטי לקוח</h3>
        </div>
        <div className="space-y-1">
          <p className="font-medium">{data.customerName}</p>
          <p className="text-sm text-gray-500">{data.customerPhone}</p>
          {data.customerEmail && (
            <p className="text-sm text-gray-500">{data.customerEmail}</p>
          )}
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Scissors className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">פרטי שירות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>{data.serviceName}</span>
            <span className="font-medium text-indigo-600">₪{data.servicePrice}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{durationMinutes} דקות</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {benefitsLoading && (
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="mr-2">טוען הטבות...</span>
          </div>
        </div>
      )}

      {benefitsError && (
        <div className="bg-red-50 p-4 rounded-xl text-red-600">
          {benefitsError}
        </div>
      )}

      {benefits && (
        <div className="bg-gray-50 p-4 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium">הטבות</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>מחיר בסיס:</span>
              <span>₪{benefits.basePrice}</span>
            </div>
            
            {benefits.loyaltyDiscount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBenefit('loyaltyDiscount')}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      benefits.selectedBenefits.loyaltyDiscount
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {benefits.selectedBenefits.loyaltyDiscount && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span>הנחת {benefits.loyaltyLevel}:</span>
                </div>
                <span className="text-green-600">- ₪{benefits.loyaltyDiscount}</span>
              </div>
            )}
            
            {benefits.isFreeAppointment && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBenefit('freeAppointment')}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      benefits.selectedBenefits.freeAppointment
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {benefits.selectedBenefits.freeAppointment && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <span>תור חינם (הטבת {benefits.loyaltyLevel}):</span>
                </div>
                <span className="text-green-600">תור חינם!</span>
              </div>
            )}
            
            <div className="flex items-center justify-between font-bold text-lg pt-2 border-t">
              <span>מחיר סופי:</span>
              <span>₪{benefits.finalPrice}</span>
            </div>
          </div>
        </div>
      )}

      {/* Date and Time */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium">מועד ואיש צוות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">תאריך</span>
            <span>{format(data.date, 'EEEE, d בMMMM', { locale: he })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">שעה</span>
            <span>{format(data.date, 'HH:mm')} - {format(endTime, 'HH:mm')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">איש צוות</span>
            <span>{data.staffName}</span>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>קובע תור...</span>
          </>
        ) : (
          <span>אישור וקביעת תור</span>
        )}
      </motion.button>
    </div>
  );
}