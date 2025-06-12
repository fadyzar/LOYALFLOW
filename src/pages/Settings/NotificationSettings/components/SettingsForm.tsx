import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Clock, Calendar } from 'lucide-react';
import { NotificationSettings, NotificationTemplate } from '../types';
import { TemplateEditor } from './TemplateEditor';

interface SettingsFormProps {
  settings: NotificationSettings;
  templates: NotificationTemplate[];
  onUpdate: (settings: NotificationSettings) => void;
  onUpdateTemplate: (template: NotificationTemplate) => void;
}

const VARIABLES = {
  appointment_reminder: [
    { key: 'business_name', label: 'שם העסק' },
    { key: 'customer_name', label: 'שם הלקוח' },
    { key: 'date', label: 'תאריך' },
    { key: 'time', label: 'שעה' },
    { key: 'staff_name', label: 'שם איש הצוות' },
    { key: 'confirmation_link', label: 'קישור לאישור' }
  ],
  appointment_confirmation: [
    { key: 'business_name', label: 'שם העסק' },
    { key: 'customer_name', label: 'שם הלקוח' },
    { key: 'date', label: 'תאריך' },
    { key: 'time', label: 'שעה' },
    { key: 'staff_name', label: 'שם איש הצוות' }
  ]
};

export function SettingsForm({ settings, templates, onUpdate, onUpdateTemplate }: SettingsFormProps) {
  const [inputValues, setInputValues] = useState({
    reminders: settings.reminders.send_before_minutes ? (settings.reminders.send_before_minutes / 60).toString() : '',
    confirmations: settings.confirmations.auto_confirm_after_minutes ? (settings.confirmations.auto_confirm_after_minutes / 60).toString() : ''
  });

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, parentField: string) => {
    const value = e.target.value;
    
    // עדכון ערך הקלט המקומי
    setInputValues(prev => ({
      ...prev,
      [parentField]: value
    }));

    // אם הערך ריק או נקודה, אל תעדכן את ה-settings
    if (value === '' || value === '.') {
      return;
    }

    // בדוק אם זה מספר תקין עם נקודה עשרונית
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // וודא שהערך בטווח המותר
    const finalValue = Math.min(Math.max(numValue, 0.5), 72);

    onUpdate({
      ...settings,
      [parentField]: {
        ...settings[parentField],
        [field]: Math.round(finalValue * 60) // המרה לדקות
      }
    });
  };

  const renderTemplateEditor = (type: keyof typeof VARIABLES) => {
    const template = templates.find(t => t.type === type);
    if (!template) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-4">תבנית הודעה</h4>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <TemplateEditor
            id={`template-${template.id}`}
            value={template.body}
            variables={VARIABLES[type]}
            onChange={(value) => onUpdateTemplate({
              ...template,
              body: value
            })}
            rows={template.channel === 'email' ? 8 : 4}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Reminders Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <Bell className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold">תזכורות</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              שליחת תזכורות אוטומטית
            </label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.reminders.enabled}
                onChange={(e) => onUpdate({
                  ...settings,
                  reminders: {
                    ...settings.reminders,
                    enabled: e.target.checked
                  }
                })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {settings.reminders.enabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                זמן שליחת תזכורת (בשעות לפני התור)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValues.reminders}
                  onChange={(e) => handleHoursChange(e, 'send_before_minutes', 'reminders')}
                  className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="1.5"
                />
                <span className="text-gray-500">שעות</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">ניתן להזין בין חצי שעה ל-72 שעות</p>
            </div>
          )}

          {renderTemplateEditor('appointment_reminder')}
        </div>
      </div>

      {/* Confirmations Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">אישורי תורים</h3>
            <p className="text-sm text-gray-500">הגדרות אישור הגעה ללקוחות</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                דרוש אישור הגעה מהלקוח
              </label>
              <p className="text-sm text-gray-500">הלקוח יתבקש לאשר את הגעתו לתור</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.confirmations.require_customer_confirmation}
                onChange={(e) => onUpdate({
                  ...settings,
                  confirmations: {
                    ...settings.confirmations,
                    require_customer_confirmation: e.target.checked,
                    // אם מכבים את האישור, נאפס גם את האישור האוטומטי
                    auto_confirm_after_minutes: e.target.checked ? settings.confirmations.auto_confirm_after_minutes : 0
                  }
                })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {settings.confirmations.require_customer_confirmation && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    אישור אוטומטי
                  </label>
                  <p className="text-sm text-gray-500">אשר תורים אוטומטית אם הלקוח לא הגיב</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.confirmations.auto_confirm_after_minutes > 0}
                    onChange={(e) => {
                      // שמור את הערך הקודם אם היה
                      const prevValue = settings.confirmations.auto_confirm_after_minutes || 1440;
                      onUpdate({
                        ...settings,
                        confirmations: {
                          ...settings.confirmations,
                          auto_confirm_after_minutes: e.target.checked ? prevValue : 0
                        }
                      });
                      // אם מפעילים מחדש, נשתמש בערך הקודם
                      if (e.target.checked) {
                        setInputValues(prev => ({
                          ...prev,
                          confirmations: (prevValue / 60).toString()
                        }));
                      }
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {settings.confirmations.auto_confirm_after_minutes > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    זמן המתנה לאישור (בשעות)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inputValues.confirmations}
                      onChange={(e) => handleHoursChange(e, 'auto_confirm_after_minutes', 'confirmations')}
                      className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="1.5"
                    />
                    <span className="text-gray-500">שעות</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    אם הלקוח לא אישר את הגעתו תוך הזמן שהוגדר, התור יאושר אוטומטית
                  </p>
                </div>
              )}
            </div>
          )}

          {renderTemplateEditor('appointment_confirmation')}
        </div>
      </div>
    </div>
  );
}