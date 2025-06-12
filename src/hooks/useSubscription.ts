import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface Subscription {
  id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  billing_cycle: 'monthly' | 'yearly';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string;
  features: Record<string, boolean>;
  limits: Record<string, number | null>;
  display_limits: Record<string, number | null>;
  price: number;
}

export interface SubscriptionData {
  has_subscription: boolean;
  subscription?: Subscription;
  plan?: SubscriptionPlan;
  usage?: Record<string, number>;
  display_usage?: Record<string, number>;
}

export function useSubscription() {
  const { user, business } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const loadSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        // קבלת מזהה העסק
        let businessId = business?.id;
        if (!businessId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          businessId = userData?.business_id;
        }

        if (!businessId) {
          throw new Error('לא נמצא עסק מקושר');
        }

        // קבלת פרטי המנוי
        const { data, error } = await supabase
          .rpc('get_business_subscription', {
            p_business_id: businessId
          });

        if (error) throw error;
        setSubscription(data);
      } catch (error: any) {
        console.error('Error loading subscription:', error);
        setError(error.message || 'שגיאה בטעינת פרטי המנוי');
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [user?.id, business?.id]);

  // פונקציה לבדיקה אם תכונה זמינה בחבילה הנוכחית
  const isFeatureAvailable = (featureCode: string): boolean => {
    // אם זה קוד תכונה של תוכנית נאמנות, נחזיר true כדי לאפשר גישה
    if (featureCode === 'loyalty_program') {
      return true;
    }
    
    if (!subscription || !subscription.has_subscription) return false;
    return subscription.plan?.features[featureCode] === true;
  };

  // פונקציה לקבלת מגבלת תכונה
  const getFeatureLimit = (featureCode: string): number | null => {
    if (!subscription || !subscription.has_subscription) return 0;
    return subscription.plan?.limits[featureCode] || null;
  };

  // פונקציה לקבלת שימוש נוכחי בתכונה
  const getFeatureUsage = (featureCode: string): number => {
    if (!subscription || !subscription.has_subscription) return 0;
    return subscription.usage?.[featureCode] || 0;
  };

  // פונקציה לקבלת יתרה נותרת לתכונה
  const getFeatureRemaining = (featureCode: string): number | null => {
    if (!subscription || !subscription.has_subscription) return 0;
    const limit = getFeatureLimit(featureCode);
    const usage = getFeatureUsage(featureCode);
    
    if (limit === null) return null; // ללא הגבלה
    return Math.max(0, limit - usage);
  };

  // פונקציה לבדיקה אם יש מספיק יתרה לפעולה
  const hasEnoughForAction = async (featureCode: string, amount: number): Promise<boolean> => {
    try {
      if (!subscription || !subscription.has_subscription) return false;
      
      // אם התכונה לא זמינה בכלל
      if (!isFeatureAvailable(featureCode)) return false;
      
      // אם אין מגבלה, תמיד יש מספיק
      const limit = getFeatureLimit(featureCode);
      if (limit === null) return true;
      
      // בדיקה מול השרת (במקרה של טוקנים)
      if (featureCode === 'ai_tokens') {
        const { data, error } = await supabase
          .rpc('check_tokens_for_action', {
            p_business_id: business?.id,
            p_tokens_needed: amount
          });

        if (error) throw error;
        return data.has_enough_tokens;
      }
      
      // בדיקה רגילה
      const remaining = getFeatureRemaining(featureCode);
      return remaining === null || remaining >= amount;
    } catch (error) {
      console.error('Error checking feature availability:', error);
      return false;
    }
  };

  return {
    subscription: subscription?.has_subscription ? {
      ...subscription.subscription,
      plan: subscription.plan!
    } : null,
    loading,
    error,
    isFeatureAvailable,
    getFeatureLimit,
    getFeatureUsage,
    getFeatureRemaining,
    hasEnoughForAction
  };
}