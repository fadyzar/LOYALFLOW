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

      // טען business_hours פעם אחת
      let businessHoursData: any = null;
      if (staff.some((member) => member.settings?.use_business_hours)) {
        const { data, error } = await supabase
          .from('business_hours')
          .select('regular_hours, special_dates')
          .eq('business_id', businessId)
          .single();
        if (error && error.code !== 'PGRST116') {
          console.error('Error loading business hours:', error);
        }
        businessHoursData = data;
      }

      // טען staff_hours לכל אנשי הצוות בבת אחת
      const staffIds = staff.filter((m) => !m.settings?.use_business_hours).map((m) => m.id);
      let staffHoursMap: Record<string, any> = {};
      if (staffIds.length > 0) {
        const { data: staffHoursArr, error: staffHoursError } = await supabase
          .from('staff_hours')
          .select('*')
          .in('staff_id', staffIds);

        if (staffHoursError) {
          console.error('Error loading staff hours:', staffHoursError);
        }
        if (Array.isArray(staffHoursArr)) {
          for (const s of staffHoursArr) {
            staffHoursMap[s.staff_id] = s;
          }
        }
      }

      for (const member of staff) {
        let working: StaffHours | undefined = undefined;

        if (member.settings?.use_business_hours && businessHoursData) {
          const specialDate = businessHoursData.special_dates?.find((date: any) => date.date === dateStr);
          if (specialDate) {
            working = {
              is_active: !specialDate.is_closed,
              start_time: specialDate.start_time,
              end_time: specialDate.end_time,
              breaks: []
            };
          } else {
            const regular = businessHoursData.regular_hours?.[dayName];
            if (regular) {
              working = {
                is_active: regular.is_active ?? true,
                start_time: regular.start_time ?? '07:00',
                end_time: regular.end_time ?? '21:00',
                breaks: regular.breaks ?? []
              };
            }
          }
        } else if (staffHoursMap[member.id]) {
          const staffHour = staffHoursMap[member.id];
          const specialDate = staffHour.special_dates?.find((date: any) => date.date === dateStr);
          if (specialDate) {
            working = {
              is_active: !specialDate.is_closed,
              start_time: specialDate.start_time,
              end_time: specialDate.end_time,
              breaks: []
            };
          } else {
            const regular = staffHour.regular_hours?.[dayName];
            if (regular) {
              working = {
                is_active: regular.is_active ?? true,
                start_time: regular.start_time ?? '07:00',
                end_time: regular.end_time ?? '21:00',
                breaks: regular.breaks ?? []
              };
            }
          }
        }
console.log('Business Hours Data:3333333333333333333', businessHoursData);
console.log('Staff List:', staff);
        // ברירת מחדל רק אם אין כלום
        if (!working) {
          working = {
            is_active: dayName !== 'saturday',
            start_time: '07:00',
            end_time: '21:00',
            breaks: []
          };
        }

        hours[member.id] = working;
      }

      setStaffHours(hours);
    } catch (error) {
      console.error('Error loading staff hours:', error);
      toast.error('שגיאה בטעינת שעות העבודה');
    }
  }, [selectedDate, staff]);

  return { staffHours, loadStaffHours };
}