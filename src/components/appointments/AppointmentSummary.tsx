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

function StickyStaffBar({ staffName }: { staffName: string }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'linear-gradient(90deg, #f0f4ff 0%, #fff 100%)',
        borderBottom: '1px solid #e0e7ef',
        boxShadow: '0 2px 12px 0 #e0e7ef22',
        minHeight: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 20,
        color: '#2563eb',
        letterSpacing: '0.02em',
        borderRadius: '0 0 18px 18px',
        marginBottom: 12
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <User style={{ width: 22, height: 22, color: '#2563eb', marginLeft: 6 }} />
        <span>איש צוות:</span>
        <span style={{ fontWeight: 800 }}>{staffName}</span>
      </span>
    </div>
  );
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

        console.log('customerData:', customerData);

        if (!customerData) return;

        // Get loyalty settings
        const { data: { user } } = await supabase.auth.getUser();
        console.log('user:', user);

        if (!user) return;

        const { data: userData } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        console.log('userData:', userData);

        if (!userData?.business_id) return;

        const { data: businessData } = await supabase
          .from('businesses')
          .select('settings->loyalty')
          .eq('id', userData.business_id)
          .single();

        console.log('businessData:', businessData);

        if (!businessData?.loyalty) return;

        const loyaltyLevel = customerData.loyalty_level;
        console.log('loyaltyLevel:', loyaltyLevel);

        const loyaltyBenefits = (businessData.loyalty as unknown as BusinessData['loyalty']).levels[loyaltyLevel]?.benefits;
        console.log('loyaltyBenefits:', loyaltyBenefits);

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
    <div className="space-y-6" style={{ maxWidth: 420, margin: '0 auto', padding: 16 }}>
      {/* Sticky Staff Bar */}
      <StickyStaffBar staffName={data.staffName} />

      {/* Customer Info */}
      <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl shadow-sm border border-blue-100">
        <div className="flex items-center gap-3 mb-2">
          <User className="h-5 w-5 text-blue-400" />
          <h3 className="font-semibold text-blue-700">פרטי לקוח</h3>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-gray-800">{data.customerName}</p>
          <p className="text-sm text-gray-500">{data.customerPhone}</p>
          {data.customerEmail && (
            <p className="text-sm text-gray-400">{data.customerEmail}</p>
          )}
        </div>
      </div>

      {/* Service Details */}
      <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl shadow-sm border border-indigo-100">
        <div className="flex items-center gap-3 mb-2">
          <Scissors className="h-5 w-5 text-indigo-400" />
          <h3 className="font-semibold text-indigo-700">פרטי שירות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{data.serviceName}</span>
            <span className="font-bold text-indigo-600">₪{data.servicePrice}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{durationMinutes} דקות</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      {benefitsLoading && !benefits && (
        <div className="bg-gray-50 p-4 rounded-2xl shadow border border-blue-100">
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="mr-2">טוען הטבות...</span>
          </div>
        </div>
      )}

      {benefitsError && (
        <div className="bg-red-50 p-4 rounded-2xl text-red-600 border border-red-200 shadow">
          {benefitsError}
        </div>
      )}

      <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-2xl shadow-sm border border-green-100">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-green-700">הטבות</h3>
        </div>
        <div className="space-y-2">
          {!benefits ? (
            <>
              <div className="text-gray-500 text-center py-4">לא נמצאו הטבות</div>
              <div className="flex items-center justify-between font-bold text-lg pt-2 border-t border-green-200">
                <span>מחיר סופי:</span>
                <span className="text-green-700">₪{data.servicePrice}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span>מחיר בסיס:</span>
                <span className="font-semibold">₪{benefits.basePrice}</span>
              </div>
              
              {benefits.loyaltyDiscount > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBenefit('loyaltyDiscount')}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        benefits.selectedBenefits.loyaltyDiscount
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {benefits.selectedBenefits.loyaltyDiscount && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <span>הנחת {benefits.loyaltyLevel}:</span>
                  </div>
                  <span className="text-green-600 font-bold">- ₪{benefits.loyaltyDiscount}</span>
                </div>
              )}
              
              {benefits.isFreeAppointment && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBenefit('freeAppointment')}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                        benefits.selectedBenefits.freeAppointment
                          ? 'bg-green-600 border-green-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {benefits.selectedBenefits.freeAppointment && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </button>
                    <span>תור חינם (הטבת {benefits.loyaltyLevel}):</span>
                  </div>
                  <span className="text-green-600 font-bold">תור חינם!</span>
                </div>
              )}
              
              <div className="flex items-center justify-between font-bold text-lg pt-2 border-t border-green-200">
                <span>מחיר סופי:</span>
                <span className="text-green-700">₪{benefits.finalPrice}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Date and Time */}
      <div className="bg-gradient-to-br from-yellow-50 to-white p-4 rounded-2xl shadow-sm border border-yellow-100">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-yellow-400" />
          <h3 className="font-semibold text-yellow-700">מועד ואיש צוות</h3>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">תאריך</span>
            <span className="font-semibold">{format(data.date, 'EEEE, d בMMMM', { locale: he })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">שעה</span>
            <span className="font-semibold">
              {format(data.date, 'HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">איש צוות</span>
            <span className="font-semibold">{data.staffName}</span>
          </div>
        </div>
      </div>

      {/* Confirm Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConfirm}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-2xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
        style={{ marginTop: 12 }}
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