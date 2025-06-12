import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { Staff, StaffHours } from '../types';
import toast from 'react-hot-toast';

export function useStaffHours(selectedDate: Date, staff: Staff[]) {
  const [staffHours, setStaffHours] = useState<Record<string, StaffHours>>({});

  const loadStaffHours = useCallback(async (businessId: string) => {
    if (!businessId) return;

    try {
      const dayOfWeek = selectedDate.getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayOfWeek];
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const hours: Record<string, StaffHours> = {};
      
      for (const member of staff) {
        if (member.settings?.use_business_hours) {
          // Load business hours logic...
          const { data: businessHours, error: businessError } = await supabase
            .from('business_hours')
            .select('regular_hours, special_dates')
            .eq('business_id', businessId)
            .single();

          if (businessError && businessError.code !== 'PGRST116') {
            console.error('Error loading business hours:', businessError);
            continue;
          }

          if (businessHours) {
            const specialDate = businessHours.special_dates?.find((date: any) => 
              date.date === dateStr
            );

            if (specialDate) {
              hours[member.id] = {
                is_active: !specialDate.is_closed,
                start_time: specialDate.start_time,
                end_time: specialDate.end_time,
                breaks: []
              };
            } else {
              hours[member.id] = businessHours.regular_hours[dayName];
            }
          }
        } else {
          // Load staff specific hours logic...
          const { data: staffHours, error: staffError } = await supabase
            .from('staff_hours')
            .select('*')
            .eq('staff_id', member.id)
            .maybeSingle();

          if (staffError) {
            console.error('Error loading staff hours:', staffError);
            continue;
          }

          if (staffHours) {
            const specialDate = staffHours.special_dates?.find((date: any) => 
              date.date === dateStr
            );

            if (specialDate) {
              hours[member.id] = {
                is_active: !specialDate.is_closed,
                start_time: specialDate.start_time,
                end_time: specialDate.end_time,
                breaks: []
              };
            } else {
              hours[member.id] = staffHours.regular_hours[dayName];
            }
          }
        }

        // Set default hours if none found
        if (!hours[member.id]) {
          hours[member.id] = {
            is_active: true,
            start_time: '09:00',
            end_time: '17:00',
            breaks: []
          };
        }
      }

      setStaffHours(hours);
    } catch (error) {
      console.error('Error loading staff hours:', error);
      toast.error('שגיאה בטעינת שעות העבודה');
    }
  }, [selectedDate, staff]);

  return { staffHours, loadStaffHours };
}