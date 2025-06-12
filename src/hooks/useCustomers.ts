import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

// מאפשר העברת מזהה עסק מבחוץ אופציונלית
export function useCustomers(externalBusinessId?: string) {
  const { user, business, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(externalBusinessId || null);

  // Load business ID if not available directly and not provided externally
  useEffect(() => {
    // אם התקבל מזהה עסק מבחוץ, העדף אותו תמיד
    if (externalBusinessId) {
      setBusinessId(externalBusinessId);
      return;
    }
    
    // אחרת, המשך לחפש מזהה עסק מהקונטקסט או מהפרופיל משתמש
    const loadBusinessId = async () => {
      if (business?.id) {
        setBusinessId(business.id);
        return;
      }

      if (!user?.id || authLoading) return;

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (userData?.business_id) {
          setBusinessId(userData.business_id);
        }
      } catch (error) {
        console.error('Error loading business ID:', error);
      }
    };

    loadBusinessId();
  }, [user?.id, business?.id, authLoading, externalBusinessId]);

  // עדכון החיפוש לשימוש במזהה העסק החיצוני או הפנימי
  const searchCustomers = useCallback(async (searchTerm: string) => {
    const currentBusinessId = externalBusinessId || businessId;
    
    if (!currentBusinessId) {
      console.log('No business ID found yet');
      return;
    }

    if (!searchTerm.trim()) {
      setCustomers([]);
      return;
    }

    try {
      setLoading(true);
      console.log('Searching customers with term:', searchTerm, 'for business:', currentBusinessId);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', currentBusinessId)
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name')
        .limit(10);

      if (error) {
        console.error('Error in searchCustomers:', error);
        throw error;
      }

      console.log('Search results:', {
        term: searchTerm,
        results: data?.length,
        data
      });

      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
      toast.error('שגיאה בחיפוש לקוחות');
    } finally {
      setLoading(false);
    }
  }, [businessId, externalBusinessId]);

  return { customers, loading, searchCustomers };
}