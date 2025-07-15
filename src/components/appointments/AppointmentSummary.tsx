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
  const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean | null>(null);

  // שלוף businessId מהמשתמש אם לא קיים ב-data
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);

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
    async function resolveBusinessId() {
      if (data.businessId && data.businessId !== 'undefined' && data.businessId !== null && data.businessId !== '') {
        setResolvedBusinessId(data.businessId);
        return;
      }
      // נסה לשלוף מהמשתמש
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();
        if (userData?.business_id) {
          setResolvedBusinessId(userData.business_id);
          return;
        }
      }
      setResolvedBusinessId(null);
    }
    resolveBusinessId();
  }, [data.businessId]);

  useEffect(() => {
    // בדוק האם businessId מועבר נכון
    if (
      !resolvedBusinessId ||
      resolvedBusinessId === 'undefined' ||
      resolvedBusinessId === null ||
      resolvedBusinessId === ''
    ) {
      setLoyaltyEnabled(false);
      console.log('Loyalty program is OFF (no valid businessId)', resolvedBusinessId);
      return;
    }

    // הדפס businessId כדי לוודא מה באמת עובר
    console.log('AppointmentSummary: businessId =', resolvedBusinessId);

    async function fetchLoyaltyEnabled() {
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', resolvedBusinessId)
        .single();

      console.log('settings from DB:', businessData?.settings, 'error:', error);

      if (error) {
        setLoyaltyEnabled(false);
        console.log('Loyalty program is OFF (supabase error)', error, resolvedBusinessId);
        return;
      }

      let enabled: boolean | undefined;
      if (
        businessData?.settings?.loyalty &&
        typeof businessData.settings.loyalty.enabled === 'boolean'
      ) {
        enabled = businessData.settings.loyalty.enabled;
        console.log('settings.loyalty.enabled:', enabled);
      }
      else if (
        typeof businessData?.settings?.loyalty_enabled === 'boolean'
      ) {
        enabled = businessData.settings.loyalty_enabled;
        console.log('settings.loyalty_enabled:', enabled);
      }
      setLoyaltyEnabled(enabled ?? false);
      console.log('Loyalty program is', enabled === true ? 'ON' : 'OFF', businessData?.settings, resolvedBusinessId);
    }
    fetchLoyaltyEnabled();
  }, [resolvedBusinessId]);

  useEffect(() => {
    if (loyaltyEnabled === false) {
      setBenefits(null);
      setBenefitsLoading(false);
      return;
    }
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
  }, [
    data.customerId,
    data.serviceId,
    data.staffId,
    data.date,
    resolvedBusinessId,
    loyaltyEnabled
  ]);

  return (
    <div className="space-y-8 max-w-xl mx-auto px-4 py-8 bg-gradient-to-br from-indigo-50 via-white to-blue-50 rounded-3xl shadow-2xl border border-gray-100">
      {/* Customer Info */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow flex items-center gap-4 p-6 border border-gray-200">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100">
          <User className="h-7 w-7 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-indigo-700 mb-1">{data.customerName}</h3>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{data.customerPhone}</span>
            {data.customerEmail && (
              <span className="text-gray-400">{data.customerEmail}</span>
            )}
          </div>
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow flex items-center gap-6 p-6 border border-gray-200">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100">
          <Scissors className="h-7 w-7 text-indigo-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-indigo-700 mb-1">{data.serviceName}</h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{durationMinutes} דקות</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-indigo-600">₪{data.servicePrice}</span>
        </div>
      </div>

      {/* Benefits */}
      {loyaltyEnabled ? (
        <div className="bg-gradient-to-br from-green-50 via-white to-green-100 rounded-2xl shadow border border-green-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Check className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-bold text-green-700">הטבות</h3>
          </div>
          {benefitsLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
              <span className="mr-2 text-green-600 font-semibold">טוען הטבות...</span>
            </div>
          )}
          {benefitsError && (
            <div className="bg-red-50 p-4 rounded-xl text-red-600 text-center font-bold">
              {benefitsError}
            </div>
          )}
          {benefits && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-gray-700">מחיר בסיס:</span>
                <span className="font-bold text-green-700">₪{benefits.basePrice}</span>
              </div>
              {benefits.loyaltyDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBenefit('loyaltyDiscount')}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        benefits.selectedBenefits.loyaltyDiscount
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {benefits.selectedBenefits.loyaltyDiscount && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <span className="font-medium text-green-700">הנחת {benefits.loyaltyLevel}</span>
                  </div>
                  <span className="text-green-600 font-bold">- ₪{benefits.loyaltyDiscount}</span>
                </div>
              )}
              {benefits.isFreeAppointment && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBenefit('freeAppointment')}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        benefits.selectedBenefits.freeAppointment
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {benefits.selectedBenefits.freeAppointment && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <span className="font-medium text-green-700">תור חינם ({benefits.loyaltyLevel})</span>
                  </div>
                  <span className="text-green-600 font-bold">תור חינם!</span>
                </div>
              )}
              <div className="flex items-center justify-between font-bold text-xl pt-4 border-t border-green-200">
                <span>מחיר סופי:</span>
                <span className="text-green-700">₪{benefits.finalPrice}</span>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Date and Time */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow flex items-center gap-6 p-6 border border-gray-200">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-yellow-100">
          <Calendar className="h-7 w-7 text-yellow-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-700 mb-1">מועד ואיש צוות</h3>
          <div className="flex flex-col gap-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">תאריך</span>
              <span className="font-semibold text-gray-700">{format(data.date, 'EEEE, d בMMMM', { locale: he })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">שעה</span>
              <span className="font-semibold text-gray-700">
                {format(data.date, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">איש צוות</span>
              <span className="font-semibold text-gray-700">{data.staffName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-2xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xl mt-4"
      >
        {loading ? (
          <>
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>קובע תור...</span>
          </>
        ) : (
          <span>אישור וקביעת תור</span>
        )}
      </motion.button>
    </div>
  );
}