import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Hook to handle synchronization of loyalty data with appointment history
 * @deprecated This hook is deprecated and will be removed in a future version.
 * Loyalty data is now automatically updated when appointments are completed.
 */
export function useLoyaltySync() {
  const [loading, setLoading] = useState(false);

  /**
   * Synchronizes a customer's loyalty stats with their appointment history
   * @deprecated This function is deprecated and will be removed in a future version.
   * Loyalty data is now automatically updated when appointments are completed.
   */
  const syncCustomerLoyalty = async (customerId: string, businessId: string) => {
    try {
      setLoading(true);
      
      // Get customer's completed appointments
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .eq('status', 'completed')
        .order('start_time', { ascending: true });
      
      if (appointmentsError) throw appointmentsError;
      
      // Get business loyalty settings
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single();
        
      if (businessError) throw businessError;
      
      // Get default loyalty settings if not available
      const loyaltySettings = businessData?.settings?.loyalty || {
        enabled: true,
        points: {
          per_visit: 10,
          per_amount: 5
        },
        diamonds: {
          per_consecutive_visits: 1,
          consecutive_visits_required: 3
        }
      };
      
      // Calculate loyalty stats
      const totalVisits = appointments.length;
      let totalPoints = 0;
      let totalDiamonds = 0;
      let lastVisitDate = null;
      
      if (appointments.length > 0) {
        // Calculate points based on visits
        totalPoints = totalVisits * loyaltySettings.points.per_visit;
        
        // Calculate diamonds based on consecutive visits
        const consecutiveVisitGroups = Math.floor(totalVisits / loyaltySettings.diamonds.consecutive_visits_required);
        totalDiamonds = consecutiveVisitGroups * loyaltySettings.diamonds.per_consecutive_visits;
        
        // Set last visit date
        lastVisitDate = appointments[appointments.length - 1].start_time;
      }
      
      // Update customer loyalty stats
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          points: totalPoints,
          diamonds: totalDiamonds,
          loyalty_stats: {
            total_visits: totalVisits,
            consecutive_visits: totalVisits > 0 ? Math.min(totalVisits, loyaltySettings.diamonds.consecutive_visits_required) : 0,
            last_visit: lastVisitDate,
            referrals: 0,
            total_spent: 0,
            achievements: []
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
        
      if (updateError) throw updateError;
      
      toast.success('נתוני הנאמנות עודכנו בהצלחה');
      return true;
    } catch (error: any) {
      console.error('Error syncing loyalty data:', error);
      toast.error(error.message || 'שגיאה בסנכרון נתוני נאמנות');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Synchronizes all customers' loyalty stats for a business
   * @deprecated This function is deprecated and will be removed in a future version.
   * Loyalty data is now automatically updated when appointments are completed.
   */
  const syncAllCustomersLoyalty = async (businessId: string) => {
    try {
      setLoading(true);
      
      // Get all customers for the business
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId);
        
      if (customersError) throw customersError;
      
      // Update each customer's loyalty stats
      let successCount = 0;
      for (const customer of customers) {
        const success = await syncCustomerLoyalty(customer.id, businessId);
        if (success) successCount++;
      }
      
      toast.success(`סנכרון נתוני נאמנות הושלם עבור ${successCount} מתוך ${customers.length} לקוחות`);
      return true;
    } catch (error: any) {
      console.error('Error syncing all customers loyalty data:', error);
      toast.error(error.message || 'שגיאה בסנכרון נתוני נאמנות');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    syncCustomerLoyalty,
    syncAllCustomersLoyalty
  };
}