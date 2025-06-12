import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useLoyaltySettings() {
  const { user, business } = useAuth();
  const [isLoyaltyEnabled, setIsLoyaltyEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // אם כבר אתחלנו את ההגדרות, לא צריך לטעון שוב
    if (initialized) return;
    
    // תמיד נתחיל עם ערך ברירת מחדל
    setIsLoyaltyEnabled(true);
    
    if (business?.id) {
      loadLoyaltySettings(business.id);
    } else if (user?.id) {
      loadBusinessId();
    }
  }, [business?.id, user?.id, initialized]);

  const loadBusinessId = async () => {
    try {
      if (!user?.id) return;
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();
        
      if (error || !userData?.business_id) {
        console.error('Error loading business ID:', error);
        return;
      }
      
      loadLoyaltySettings(userData.business_id);
    } catch (error) {
      console.error('Error loading business ID:', error);
    }
  };

  const loadLoyaltySettings = async (businessId: string) => {
    try {
      setLoading(true);
      
      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('Error loading loyalty settings:', error);
        // ברירת מחדל למופעל במקרה של שגיאה
        setIsLoyaltyEnabled(true);
        return;
      }

      // בדיקה אם תוכנית הנאמנות מופעלת בהגדרות העסק
      const enabled = businessData?.settings?.loyalty?.enabled;
      setIsLoyaltyEnabled(enabled !== false); // ברירת מחדל היא true אם לא מוגדר אחרת
      setInitialized(true);
    } catch (error) {
      console.error('Error loading loyalty settings:', error);
      // ברירת מחדל למופעל במקרה של שגיאה
      setIsLoyaltyEnabled(true);
    } finally {
      setLoading(false);
    }
  };

  const updateLoyaltyEnabled = async (enabled: boolean) => {
    if (!business?.id) return false;
    
    try {
      // קבלת ההגדרות הנוכחיות
      const { data: currentData, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', business.id)
        .single();

      if (fetchError) throw fetchError;
      
      // יצירת אובייקט הגדרות מעודכן
      const updatedSettings = {
        ...currentData?.settings,
        loyalty: {
          ...(currentData?.settings?.loyalty || {}),
          enabled
        }
      };
      
      // עדכון ההגדרות
      const { error } = await supabase
        .from('businesses')
        .update({ settings: updatedSettings })
        .eq('id', business.id);
        
      if (error) throw error;
      
      // עדכון המצב המקומי
      setIsLoyaltyEnabled(enabled);
      return true;
    } catch (error) {
      console.error('Error updating loyalty settings:', error);
      toast.error('שגיאה בעדכון הגדרות הנאמנות');
      return false;
    }
  };

  return {
    isLoyaltyEnabled,
    loading,
    updateLoyaltyEnabled
  };
}