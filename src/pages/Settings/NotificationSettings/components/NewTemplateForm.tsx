import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Mail, Plus, X } from 'lucide-react';
import { NotificationTemplate } from '../types';
import toast from 'react-hot-toast';

interface NewTemplateFormProps {
  onSubmit: (template: Omit<NotificationTemplate, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export function NewTemplateForm({ onSubmit, onCancel }: NewTemplateFormProps) {
  const [formData, setFormData] = useState<Omit<NotificationTemplate, 'id'>>({
    type: 'appointment_reminder',
    channel: 'sms',
    subject: '',
    body: '',
    variables: ['business_name', 'date', 'time', 'staff_name', 'confirmation_link'],
    is_active: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.body) {
      toast.error('יש להזין תוכן להודעה');
      return;
    }

    if (formData.channel === 'email' && !formData.subject) {
      toast.error('יש להזין נושא להודעה');
      return;
    }

    try {
      await onSubmit(formData);
      toast.success('התבנית נוצרה בהצלחה');
      onCancel();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('שגיאה ביצירת התבנית');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-white rounded-xl p-6 shadow-sm"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">תבנית חדשה</h3>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג ההודעה
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="appointment_reminder">תזכורת לתור</option>
              <option value="appointment_confirmation">אישור תור</option>
              <option value="appointment_cancellation">ביטול תור</option>
              <option value="appointment_rescheduled">שינוי מועד תור</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ערוץ שליחה
            </label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value as any })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="sms">SMS</option>
              <option value="email">אימייל</option>
            </select>
          </div>
        </div>

        {formData.channel === 'email' && (
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
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows={formData.channel === 'email' ? 8 : 4}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            משתנים זמינים: {'{{business_name}}, {{customer_name}}, {{date}}, {{time}}, {{staff_name}}'}
          </p>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            צור תבנית
          </button>
        </div>
      </form>
    </motion.div>
  );
}