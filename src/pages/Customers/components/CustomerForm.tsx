import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, User, X } from 'lucide-react';
import { Database } from '../../../lib/database.types';
import toast from 'react-hot-toast';

type Customer = Database['public']['Tables']['customers']['Row'];

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: Partial<Customer>) => Promise<void>;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSubmit, onCancel }: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || ''
  });

  // ודא שהערכים של formData מתעדכנים כאשר customer משתנה (לעריכה מהירה)
  React.useEffect(() => {
    setFormData({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || ''
    });
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone number
    if (!/^05\d{8}$/.test(formData.phone)) {
      toast.error('מספר טלפון לא תקין');
      return;
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('כתובת אימייל לא תקינה');
      return;
    }

    try {
      await onSubmit(formData);
      onCancel();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white p-6 rounded-xl shadow-lg space-y-6"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          {customer ? 'עריכת לקוח' : 'לקוח חדש'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>שם מלא</span>
            </div>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>טלפון</span>
            </div>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="0501234567"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>אימייל</span>
              <span className="text-gray-400 text-xs">(אופציונלי)</span>
            </div>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="example@email.com"
          />
        </div>
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
          {customer ? 'שמור שינויים' : 'הוסף לקוח'}
        </button>
      </div>
    </motion.form>
  );
}