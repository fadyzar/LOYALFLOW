import { supabase } from '../../../lib/supabase';
import { BusinessHoursData } from './types';

export async function fetchBusinessHours(businessId: string): Promise<BusinessHoursData | null> {
  const { data, error } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', businessId)
    .single();

  if (error) throw error;
  return data;
}

export async function saveBusinessHours(
  businessId: string,
  data: Partial<BusinessHoursData>
): Promise<void> {
  const { error } = await supabase
    .from('business_hours')
    .upsert({
      business_id: businessId,
      regular_hours: data.regular_hours,
      special_dates: data.special_dates
    });

  if (error) throw error;
}