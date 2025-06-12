import { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface UpdateStatusOptions {
  appointmentId: string;
  newStatus: 'booked' | 'confirmed' | 'completed' | 'canceled' | 'no_show';
  reason?: string;
}

export function useAppointmentStatus() {
  const [loading, setLoading] = useState(false);

  const updateAppointmentStatus = async ({ appointmentId, newStatus, reason }: UpdateStatusOptions) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('update_appointment_status_v2', {
        p_appointment_id: appointmentId,
        p_status: newStatus,
        p_reason: reason
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'שגיאה בעדכון סטטוס התור');
      }

      // הצגת הודעה מתאימה לפי סוג הסטטוס
      const statusMessages = {
        booked: 'התור הועבר למצב המתנה',
        confirmed: 'התור אושר בהצלחה',
        completed: 'התור סומן כהושלם',
        canceled: 'התור בוטל בהצלחה',
        no_show: 'התור סומן כלא הגיע'
      };

      toast.success(statusMessages[newStatus]);
      
      // אם התור הושלם, נציג הודעה נוספת על עדכון נקודות נאמנות
      if (newStatus === 'completed') {
        toast.success('נקודות הנאמנות עודכנו אוטומטית', {
          duration: 5000,
          icon: '🎁'
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      toast.error(error.message || 'שגיאה בעדכון סטטוס התור');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    updateAppointmentStatus
  };
}