import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Settings, Save, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { SettingsForm } from './components/SettingsForm';
import { SyncButton } from './components/SyncButton';
import { useSubscription } from '../../../hooks/useSubscription';
import { useLoyaltySettings } from '../../../hooks/useLoyaltySettings';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS = {
  enabled: true,
  points: {
    per_visit: 10,
    per_referral: 50,
    per_amount: 5,
    expiration_days: 365
  },
  diamonds: {
    per_consecutive_visits: 1,
    consecutive_visits_required: 3,
    per_amount: 1
  },
  levels: {
    silver: {
      diamonds_required: 10,
      benefits: {
        services_discount: 5, // הנחה קבועה לשירותים
        products_discount: 5, // הנחה קבועה למוצרים
        free_appointment_every: null, // תור חינם כל X תורים
        birthday_appointment: false // הטבת תור חינם ביום הולדת
      }
    },
    gold: {
      diamonds_required: 20,
      benefits: {
        services_discount: 10,
        products_discount: 10,
        free_appointment_every: 10,
        birthday_appointment: true
      }
    },
    diamond: {
      diamonds_required: 30,
      benefits: {
        services_discount: 15,
        products_discount: 15,
        free_appointment_every: 8,
        birthday_appointment: true
      }
    },
    vip: {
      diamonds_required: 50,
      benefits: {
        services_discount: 20,
        products_discount: 20,
        free_appointment_every: 5,
        birthday_appointment: true
      }
    }
  }
};

function LoyaltySettings() {
  const { user, business } = useAuth();
  const { isFeatureAvailable } = useSubscription();
  const { isLoyaltyEnabled, updateLoyaltyEnabled } = useLoyaltySettings();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // בדיקה אם תכונת תכנית הנאמנות זמינה
  const loyaltyEnabled = isFeatureAvailable('loyalty_program');

  useEffect(() => {
    loadSettings();
  }, [user?.id]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user?.id) {
        setError('משתמש לא מחובר');
        setLoading(false);
        return;
      }

      let id = business?.id;
      
      if (!id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');
        
        id = userData.business_id;
      }
      
      setBusinessId(id);

      // אם התכונה לא זמינה, לא טוענים את ההגדרות
      if (!loyaltyEnabled) {
        setLoading(false);
        return;
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', id)
        .single();

      if (settingsError) throw settingsError;

      if (settingsData?.settings?.loyalty) {
        const existingSettings = settingsData.settings.loyalty;
        
        // המרה של המבנה הישן למבנה החדש
        const convertedSettings = {
          ...DEFAULT_SETTINGS,
          enabled: existingSettings.enabled ?? true,
          points: {
            ...DEFAULT_SETTINGS.points,
            ...existingSettings.points
          },
          diamonds: {
            ...DEFAULT_SETTINGS.diamonds,
            ...existingSettings.diamonds
          },
          levels: Object.entries(DEFAULT_SETTINGS.levels).reduce((acc, [level, defaultValue]) => {
            const existingLevel = existingSettings.levels?.[level];
            return {
              ...acc,
              [level]: {
                diamonds_required: existingLevel?.diamonds_required ?? defaultValue.diamonds_required,
                benefits: {
                  services_discount: existingLevel?.benefits?.services_discount ?? defaultValue.benefits.services_discount,
                  products_discount: existingLevel?.benefits?.products_discount ?? defaultValue.benefits.products_discount,
                  free_appointment_every: existingLevel?.benefits?.free_appointment_every ?? defaultValue.benefits.free_appointment_every,
                  birthday_appointment: existingLevel?.benefits?.birthday_appointment ?? defaultValue.benefits.birthday_appointment
                }
              }
            };
          }, {})
        };

        setSettings(convertedSettings);
      }

    } catch (error: any) {
      console.error('Error loading settings:', error);
      setError(error.message || 'שגיאה בטעינת ההגדרות');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newSettings: any) => {
    if (!businessId || !loyaltyEnabled) return;

    try {
      const { data: currentData, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single();

      if (fetchError) throw fetchError;

      // נעדכן את ההגדרות עם המבנה החדש
      const updatedSettings = {
        ...currentData?.settings,
        loyalty: {
          enabled: newSettings.enabled,
          points: newSettings.points,
          diamonds: newSettings.diamonds,
          levels: Object.entries(newSettings.levels).reduce((acc, [level, data]: [string, any]) => ({
            ...acc,
            [level]: {
              diamonds_required: data.diamonds_required,
              benefits: {
                services_discount: data.benefits.services_discount,
                products_discount: data.benefits.products_discount,
                free_appointment_every: data.benefits.free_appointment_every,
                birthday_appointment: data.benefits.birthday_appointment
              }
            }
          }), {})
        }
      };

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          settings: updatedSettings
        })
        .eq('id', businessId);

      if (updateError) throw updateError;

      // עדכון המצב המקומי של הפעלת/כיבוי תכונת הנאמנות
      await updateLoyaltyEnabled(newSettings.enabled);
      
      setSettings(newSettings);
      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'שגיאה בשמירת ההגדרות');
    }
  };

  if (!loyaltyEnabled) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-6 pb-24">
        <div className="bg-gray-100 p-4 rounded-full">
          <Lock className="h-12 w-12 text-gray-400" />
        </div>
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-700 mb-2">תכונה לא זמינה</h2>
          <p className="text-gray-500 mb-4">
            תכונת תוכנית הנאמנות אינה זמינה בחבילה הנוכחית שלך.
            שדרג לחבילה בינונית או VIP כדי לקבל גישה לתכונה זו.
          </p>
          <Link 
            to="/settings"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            חזרה להגדרות
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center pb-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 pb-24">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => loadSettings()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex flex-col gap-4 py-3">
          {/* Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/settings" className="text-gray-500 hover:text-gray-700">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-xl">
                  <Settings className="h-5 w-5 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold">הגדרות נאמנות</h1>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const form = document.getElementById('loyalty-settings-form');
                if (form) {
                  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                }
              }}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all"
            >
              <Save className="h-5 w-5" />
              <span>שמור הגדרות</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Sync Button */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">סנכרון נתוני נאמנות</h2>
            <p className="text-sm text-gray-500">
              סנכרן את נתוני הנאמנות של כל הלקוחות על סמך התורים שהושלמו
            </p>
          </div>
          {businessId && <SyncButton businessId={businessId} />}
        </div>
      </div>

      {/* Settings Form */}
      <SettingsForm
        settings={settings}
        onSave={handleSave}
      />
    </div>
  );
}

export default LoyaltySettings;