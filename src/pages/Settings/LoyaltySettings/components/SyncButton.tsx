import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../../lib/supabase';

interface SyncButtonProps {
  businessId: string;
}

export function SyncButton({ businessId }: SyncButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      
      // קבלת כל הלקוחות של העסק
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId);
        
      if (customersError) throw customersError;
      
      // קבלת הגדרות הנאמנות של העסק
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single();
        
      if (businessError) throw businessError;
      
      // הגדרות ברירת מחדל אם אין הגדרות
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
      
      // עדכון כל לקוח
      let successCount = 0;
      for (const customer of customers) {
        try {
          // קבלת התורים שהושלמו של הלקוח
          const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('business_id', businessId)
            .eq('status', 'completed')
            .order('start_time', { ascending: true });
          
          if (appointmentsError) throw appointmentsError;
          
          // חישוב נתוני נאמנות
          const totalVisits = appointments.length;
          const pointsPerVisit = loyaltySettings.points.per_visit;
          const totalPoints = totalVisits * pointsPerVisit;
          
          const consecutiveVisitsRequired = loyaltySettings.diamonds.consecutive_visits_required;
          const diamondsPerConsecutiveVisits = loyaltySettings.diamonds.per_consecutive_visits;
          const consecutiveVisitGroups = Math.floor(totalVisits / consecutiveVisitsRequired);
          const totalDiamonds = consecutiveVisitGroups * diamondsPerConsecutiveVisits;
          
          const lastVisitDate = appointments.length > 0 ? 
            appointments[appointments.length - 1].start_time : null;
          
          // עדכון נתוני הלקוח
          const { error: updateError } = await supabase
            .from('customers')
            .update({
              points: totalPoints,
              diamonds: totalDiamonds,
              loyalty_stats: {
                total_visits: totalVisits,
                consecutive_visits: totalVisits > 0 ? 
                  totalVisits % consecutiveVisitsRequired : 0,
                last_visit: lastVisitDate,
                referrals: 0,
                total_spent: 0,
                achievements: []
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', customer.id);
            
          if (updateError) throw updateError;
          
          successCount++;
        } catch (error) {
          console.error(`Error syncing customer ${customer.id}:`, error);
        }
      }
      
      toast.success(`סנכרון נתוני נאמנות הושלם עבור ${successCount} מתוך ${customers.length} לקוחות`);
    } catch (error: any) {
      console.error('Error syncing loyalty data:', error);
      toast.error(error.message || 'שגיאה בסנכרון נתוני נאמנות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleSync}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
      ) : (
        <RefreshCw className="h-5 w-5" />
      )}
      <span>סנכרן נתוני נאמנות</span>
    </motion.button>
  );
}