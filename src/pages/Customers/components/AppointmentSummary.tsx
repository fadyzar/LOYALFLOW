import { useState, useEffect } from 'react';
import type { Database } from '../../../lib/database.types';
import { supabase } from '../../../lib/supabase';

type Customer = Database['public']['Tables']['customers']['Row'];
type Service = Database['public']['Tables']['services']['Row'];
type Staff = Database['public']['Tables']['users']['Row'];

interface AppointmentSummaryProps {
  customer: Customer;
  service: Service;
  staff: Staff;
  appointmentDate: Date;
}

interface Benefits {
  basePrice: number;
  loyaltyDiscount: number;
  finalPrice: number;
  isFreeAppointment: boolean;
  isBirthdayAppointment: boolean;
  loyaltyLevel: string;
  loyaltyBenefits: any;
}

export function AppointmentSummary({ customer, service, staff, appointmentDate }: AppointmentSummaryProps) {
  const [benefits, setBenefits] = useState<Benefits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateBenefits = async (appointmentDate: Date) => {
    if (!service || !staff || !customer) {
      console.log('Missing required props:', { service, staff, customer });
      return null;
    }

    try {
      setLoading(true);
      // Get staff service price
      const { data: staffService } = await supabase
        .from('staff_services')
        .select('price')
        .eq('staff_id', staff.id)
        .eq('service_id', service.id)
        .single();

      const basePrice = staffService?.price || service.price || 0;

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
      setError('שגיאה בחישוב ההטבות');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (service && staff && customer && appointmentDate) {
      calculateBenefits(appointmentDate).then(setBenefits);
    }
  }, [service, staff, customer, appointmentDate]);

  if (loading) {
    return <div>טוען...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!benefits) {
    return <div>לא נמצאו הטבות</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span>מחיר בסיס:</span>
        <span>{benefits.basePrice} ₪</span>
      </div>
      
      {benefits.loyaltyDiscount > 0 && (
        <div className="flex justify-between items-center text-green-600">
          <span>הנחת {benefits.loyaltyLevel}:</span>
          <span>- {benefits.loyaltyDiscount} ₪</span>
        </div>
      )}
      
      {benefits.isFreeAppointment && (
        <div className="flex justify-between items-center text-green-600">
          <span>תור חינם (הטבת {benefits.loyaltyLevel}):</span>
          <span>תור חינם!</span>
        </div>
      )}
      
      {benefits.isBirthdayAppointment && (
        <div className="flex justify-between items-center text-green-600">
          <span>הטבת יום הולדת:</span>
          <span>תור חינם!</span>
        </div>
      )}
      
      <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
        <span>מחיר סופי:</span>
        <span>{benefits.finalPrice} ₪</span>
      </div>
    </div>
  );
} 