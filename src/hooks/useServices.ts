import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/auth/hooks';
import toast from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  name_he: string;
  price: number;
  duration: string;
}

export function useServices(providedBusinessId?: string) {
  const { user, business } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const loadBusinessId = async () => {
      try {
        // First try to use provided businessId
        if (providedBusinessId) {
          setCurrentBusinessId(providedBusinessId);
          return;
        }

        // Then try to use business from context
        if (business?.id) {
          setCurrentBusinessId(business.id);
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
            setCurrentBusinessId(userData.business_id);
          }
        }
      } catch (error) {
        console.error('Error loading business ID:', error);
        setCurrentBusinessId(null);
      }
    };

    loadBusinessId();
  }, [providedBusinessId, business?.id, user?.id]);

  useEffect(() => {
    const loadServices = async () => {
      if (!currentBusinessId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Load all services for the business
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('business_id', currentBusinessId)
          .order('name_he');

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        console.error('Error loading services:', error);
        toast.error('שגיאה בטעינת השירותים');
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, [currentBusinessId]);

  return { services, loading, businessId: currentBusinessId };
}