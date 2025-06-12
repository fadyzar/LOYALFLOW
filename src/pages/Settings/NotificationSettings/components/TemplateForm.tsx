import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Variable, Plus } from 'lucide-react';
import { NotificationTemplate } from '../types';
import toast from 'react-hot-toast';

interface TemplateFormProps {
  template: NotificationTemplate;
  onUpdate: (template: NotificationTemplate) => Promise<void>;
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
  ],
  appointment_cancellation: [
    { key: 'business_name', label: 'שם העסק' },
    { key: 'customer_name', label: 'שם הלקוח' },
    { key: 'date', label: 'תאריך' },
    { key: 'time', label: 'שעה' }
  ],
  appointment_rescheduled: [
    { key: 'business_name', label: 'שם העסק' },
    { key: 'customer_name', label: 'שם הלקוח' },
    { key: 'new_date', label: 'תאריך חדש' },
    { key: 'new_time', label: 'שעה חדשה' },
    { key: 'old_date', label: 'תאריך מקורי' },
    { key: 'old_time', label: 'שעה מקורית' }
  ]
};

export function TemplateForm({ template, onUpdate }: TemplateFormProps) {
  const [formData, setFormData] = useState(template);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdate(formData);
      setIsEditing(false);
      toast.success('התבנית נשמרה בהצלחה');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('שגיאה בשמירת התבנית');
    }
  };

  const insertVariable = (variable: string) => {
    const textArea = document.getElementById('template-body') as HTMLTextAreaElement;
    if (textArea) {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const text = textArea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = `${before}{{${variable}}}${after}`;
      setFormData(prev => ({ ...prev, body: newText }));
      // שמירת מיקום הסמן אחרי המשתנה שהוכנס
      setTimeout(() => {
        textArea.focus();
        const newPosition = start + variable.length + 4;
        textArea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const getTemplateTitle = () => {
    switch (template.type) {
      case 'appointment_reminder':
        return 'תזכורת לתור';
      case 'appointment_confirmation':
        return 'אישור תור';
      case 'appointment_cancellation':
        return 'ביטול תור';
      case 'appointment_rescheduled':
        return 'שינוי מועד תור';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
            {template.channel === 'sms' ? (
              <MessageSquare className="h-5 w-5" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{getTemplateTitle()}</h3>
            <p className="text-sm text-gray-500">
              {template.channel === 'sms' ? 'הודעת SMS' : 'הודעת אימייל'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.is_active}
              onChange={(e) => {
                const newData = {
                  ...formData,
                  is_active: e.target.checked
                };
                setFormData(newData);
                onUpdate(newData);
              }}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {template.channel === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                נושא
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              תוכן ההודעה
            </label>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {VARIABLES[template.type].map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable.key)}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{variable.label}</span>
                  </button>
                ))}
              </div>
              <textarea
                id="template-body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={template.channel === 'email' ? 8 : 4}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
                dir="auto"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setFormData(template);
                setIsEditing(false);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              שמור
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {template.channel === 'email' && template.subject && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">נושא</h4>
              <p className="text-gray-900">{template.subject}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">תוכן ההודעה</h4>
            <div className="p-4 bg-gray-50 rounded-lg">
              {template.channel === 'email' ? (
                <div dangerouslySetInnerHTML={{ __html: template.body }} />
              ) : (
                <p className="whitespace-pre-wrap">{template.body}</p>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsEditing(true)}
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            ערוך תבנית
          </motion.button>
        </div>
      )}
    </div>
  );
}