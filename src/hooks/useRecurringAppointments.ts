import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth/hooks';
import toast from 'react-hot-toast';

interface RecurringAppointment {
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;
  notes?: string;
}

export function useRecurringAppointments() {
  const { user, business } = useAuth();
  const [loading, setLoading] = useState(false);

  const createRecurringAppointments = async (appointments: RecurringAppointment[]) => {
    if (!user?.id || !business?.id) {
      throw new Error('משתמש או עסק לא מחוברים');
    }

    try {
      setLoading(true);

      // בדיקת תקינות הנתונים
      if (!appointments.length) {
        throw new Error('לא נבחרו תורים');
      }

      // יצירת התורים בצורה סדרתית
      const createdAppointments = [];
      
      for (const appointment of appointments) {
        // חישוב זמן סיום לפי זמן שירות
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('duration')
          .eq('id', appointment.serviceId)
          .single();

        if (serviceError) throw serviceError;

        // חישוב זמן סיום
        const startTime = new Date(appointment.startTime);
        const durationMatch = service.duration.match(/(\d+):(\d+):(\d+)/);
        
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

        // יצירת התור
        const { data: newAppointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            business_id: business.id,
            customer_id: appointment.customerId,
            service_id: appointment.serviceId,
            staff_id: appointment.staffId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            status: 'booked',
            customer_notes: appointment.notes,
            metadata: {
              created_by: user.id,
              created_at: new Date().toISOString(),
              is_recurring: true
            }
          })
          .select()
          .single();

        if (appointmentError) throw appointmentError;
        createdAppointments.push(newAppointment);

        // הוספת לוג ליצירת התור
        await supabase
          .from('appointment_logs')
          .insert({
            appointment_id: newAppointment.id,
            user_id: user.id,
            action: 'create',
            new_status: 'booked',
            details: {
              timestamp: new Date().toISOString(),
              user_name: user.user_metadata?.name || user.email,
              is_recurring: true,
              recurring_group: appointment.notes
            }
          });
      }

      return createdAppointments;
    } catch (error: any) {
      console.error('Error creating recurring appointments:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createRecurringAppointments
  };
}