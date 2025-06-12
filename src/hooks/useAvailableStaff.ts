import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { parsePostgresInterval } from '../utils/date';
import { useAuth } from '../contexts/auth/hooks';
import toast from 'react-hot-toast';

interface StaffMember {
  id: string;
  name: string;
  title?: string;
  profile_image_url?: string;
  settings: {
    rest_time: number;
  };
  price: number;
  duration: number;
}

export function useAvailableStaff(serviceId: string, providedBusinessId?: string) {
  const { user, business } = useAuth();
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const loadBusinessId = async () => {
      try {
        // First try to use provided businessId
        if (providedBusinessId) {
          setBusinessId(providedBusinessId);
          return;
        }

        // Then try to use business from context
        if (business?.id) {
          setBusinessId(business.id);
          return;
        }

        // Finally try to get from user data
        if (user?.id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          if (userData?.business_id) {
            setBusinessId(userData.business_id);
          }
        }
      } catch (error) {
        console.error('Error loading business ID:', error);
        setBusinessId(null);
      }
    };

    loadBusinessId();
  }, [providedBusinessId, business?.id, user?.id]);

  useEffect(() => {
    const loadAvailableStaff = async () => {
      if (!businessId || !serviceId) {
        console.log('Missing required data:', { businessId, serviceId });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // נביא את כל אנשי הצוות שמקושרים לשירות
        const { data: staffData, error: staffError } = await supabase
          .from('staff_services')
          .select(`
            staff_id,
            is_active,
            price,
            duration,
            users (
              id,
              name,
              title,
              profile_image_url,
              settings
            ),
            services (
              price,
              duration
            )
          `)
          .eq('service_id', serviceId)
          .eq('is_active', true);

        if (staffError) throw staffError;

        if (!staffData || staffData.length === 0) {
          // אם אין אנשי צוות, נביא את המנהל
          const { data: adminData, error: adminError } = await supabase
            .from('users')
            .select('*')
            .eq('business_id', businessId)
            .eq('role', 'admin')
            .single();

          if (adminError) throw adminError;

          // נביא את פרטי השירות
          const { data: serviceData, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', serviceId)
            .single();

          if (serviceError) throw serviceError;

          if (adminData) {
            setAvailableStaff([{
              id: adminData.id,
              name: adminData.name,
              title: adminData.title,
              profile_image_url: adminData.profile_image_url,
              settings: adminData.settings || { rest_time: 0 },
              price: serviceData.price,
              duration: parsePostgresInterval(serviceData.duration)
            }]);
          } else {
            setAvailableStaff([]);
          }
          return;
        }

        // Process staff data
        const staffMembers = staffData
          .filter(staffService => staffService.users)
          .map(staffService => {
            const staff = staffService.users;
            const service = staffService.services;
            
            if (!staff) return null;

            // Use custom price/duration if set, otherwise fallback to service defaults
            const price = staffService.price || service?.price || 0;
            const duration = staffService.duration || service?.duration || '30 minutes';
            const durationInMinutes = parsePostgresInterval(duration);

            return {
              id: staff.id,
              name: staff.name,
              title: staff.title,
              profile_image_url: staff.profile_image_url,
              settings: {
                rest_time: staff.settings?.rest_time || 0
              },
              price: price,
              duration: durationInMinutes
            };
          })
          .filter((staff): staff is StaffMember => staff !== null);

        setAvailableStaff(staffMembers);
      } catch (error) {
        console.error('Error loading available staff:', error);
        toast.error('שגיאה בטעינת אנשי הצוות הזמינים');
      } finally {
        setLoading(false);
      }
    };

    // וודא שה-serviceId הוא מחרוזת UUID תקינה
    if (typeof serviceId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serviceId)) {
      loadAvailableStaff();
    } else {
      console.log('Invalid service ID:', serviceId);
      setLoading(false);
      setAvailableStaff([]);
    }
  }, [businessId, serviceId]);

  return { availableStaff, loading };
}