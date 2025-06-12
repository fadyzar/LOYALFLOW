import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bell, Save, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { NotificationSettings as Settings, NotificationTemplate } from './types';
import { SettingsForm } from './components/SettingsForm';
import toast from 'react-hot-toast';

const DEFAULT_SETTINGS: Settings = {
  reminders: {
    enabled: true,
    send_before_minutes: 1440,
    channels: ['sms']
  },
  confirmations: {
    enabled: true,
    require_customer_confirmation: true,
    auto_confirm_after_minutes: 1440,
    channels: ['sms']
  }
};

function NotificationSettings() {
  const { user, business, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.id) {
          setError('לא נמצא משתמש מחובר');
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          setError('שגיאה בטעינת נתוני המשתמש');
          setLoading(false);
          return;
        }

        if (!userData?.business_id) {
          setError('לא נמצא עסק מקושר');
          setLoading(false);
          return;
        }

        const businessId = userData.business_id;

        // Load notification settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('notification_settings')
          .select('settings')
          .eq('business_id', businessId)
          .single();

        let currentSettings;
        
        if (settingsError) {
          if (settingsError.code === 'PGRST116') { // No data found
            const { data, error } = await supabase
              .from('notification_settings')
              .insert([{
                business_id: businessId,
                settings: DEFAULT_SETTINGS
              }])
              .select()
              .single();

            if (error) throw error;
            currentSettings = data.settings;
          } else {
            throw settingsError;
          }
        } else {
          // וודא שיש ערכי ברירת מחדל לכל השדות
          currentSettings = {
            reminders: {
              enabled: settingsData.settings.reminders?.enabled ?? DEFAULT_SETTINGS.reminders.enabled,
              send_before_minutes: settingsData.settings.reminders?.send_before_minutes ?? DEFAULT_SETTINGS.reminders.send_before_minutes,
              channels: settingsData.settings.reminders?.channels ?? DEFAULT_SETTINGS.reminders.channels
            },
            confirmations: {
              enabled: settingsData.settings.confirmations?.enabled ?? DEFAULT_SETTINGS.confirmations.enabled,
              require_customer_confirmation: settingsData.settings.confirmations?.require_customer_confirmation ?? DEFAULT_SETTINGS.confirmations.require_customer_confirmation,
              auto_confirm_after_minutes: settingsData.settings.confirmations?.auto_confirm_after_minutes ?? DEFAULT_SETTINGS.confirmations.auto_confirm_after_minutes,
              channels: settingsData.settings.confirmations?.channels ?? DEFAULT_SETTINGS.confirmations.channels
            }
          };
        }

        setSettings(currentSettings);

        // Load notification templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('business_id', businessId)
          .order('type', { ascending: true });

        if (templatesError) throw templatesError;
        setTemplates(templatesData || []);

      } catch (error: any) {
        console.error('Error loading notification settings:', error);
        setError(error.message || 'שגיאה בטעינת ההגדרות');
        toast.error('שגיאה בטעינת ההגדרות');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [user?.id, authLoading]);

  const handleSave = async () => {
    if (!hasChanges || isSaving || !settings) return;

    try {
      setIsSaving(true);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user?.id)
        .single();

      if (userError) throw userError;
      if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

      const { error } = await supabase
        .from('notification_settings')
        .update({ settings })
        .eq('business_id', userData.business_id);

      if (error) throw error;
      
      setHasChanges(false);
      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateTemplate = async (updatedTemplate: NotificationTemplate) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update({
          subject: updatedTemplate.subject,
          body: updatedTemplate.body,
          is_active: updatedTemplate.is_active
        })
        .eq('id', updatedTemplate.id);

      if (error) throw error;

      setTemplates(prev => 
        prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
      );
      setHasChanges(true);
    } catch (error: any) {
      console.error('Error updating template:', error);
      toast.error(error.message || 'שגיאה בעדכון התבנית');
    }
  };

  if (authLoading || loading) {
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
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4 pb-24">
        <p className="text-gray-500">לא נמצאו הגדרות</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          טען מחדש
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
                  <Bell className="h-5 w-5 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold">הודעות ותזכורות</h1>
              </div>
            </div>
          </div>

          {/* Channel Selection */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.reminders.channels.includes('email')}
                  onChange={(e) => {
                    const newSettings = { ...settings };
                    ['reminders', 'confirmations'].forEach(section => {
                      if (e.target.checked) {
                        newSettings[section].channels = [...newSettings[section].channels, 'email'];
                      } else {
                        newSettings[section].channels = newSettings[section].channels.filter(c => c !== 'email');
                      }
                    });
                    setSettings(newSettings);
                    setHasChanges(true);
                  }}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Mail className="h-4 w-4" />
                <span className="text-sm">אימייל</span>
              </label>

              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="message-channel"
                    checked={settings.reminders.channels.includes('sms')}
                    onChange={() => {
                      const newSettings = { ...settings };
                      ['reminders', 'confirmations'].forEach(section => {
                        newSettings[section].channels = newSettings[section].channels.filter(c => c === 'email' || c === 'sms');
                        if (!newSettings[section].channels.includes('sms')) {
                          newSettings[section].channels.push('sms');
                        }
                        newSettings[section].channels = newSettings[section].channels.filter(c => c !== 'whatsapp');
                      });
                      setSettings(newSettings);
                      setHasChanges(true);
                    }}
                    className="rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-sm">SMS</span>
                </label>

                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="message-channel"
                    checked={settings.reminders.channels.includes('whatsapp')}
                    onChange={() => {
                      const newSettings = { ...settings };
                      ['reminders', 'confirmations'].forEach(section => {
                        newSettings[section].channels = newSettings[section].channels.filter(c => c === 'email' || c === 'whatsapp');
                        if (!newSettings[section].channels.includes('whatsapp')) {
                          newSettings[section].channels.push('whatsapp');
                        }
                        newSettings[section].channels = newSettings[section].channels.filter(c => c !== 'sms');
                      });
                      setSettings(newSettings);
                      setHasChanges(true);
                    }}
                    className="rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <i className="fab fa-whatsapp text-lg" />
                  <span className="text-sm">WhatsApp</span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-all ${
                hasChanges 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="h-5 w-5" />
              <span>{isSaving ? 'שומר...' : 'שמור הגדרות'}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <SettingsForm
        settings={settings}
        templates={templates}
        onUpdate={(newSettings) => {
          setSettings(newSettings);
          setHasChanges(true);
        }}
        onUpdateTemplate={handleUpdateTemplate}
      />
    </div>
  );
}

export default NotificationSettings;