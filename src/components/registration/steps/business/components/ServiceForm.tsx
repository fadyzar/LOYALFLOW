import React, { useState } from 'react';

import { motion } from 'framer-motion';
import { Service } from '../types';

interface ServiceFormProps {
  formData: Service;
  services: Service[];
  isEditing: boolean;
  onFormChange: (data: Service) => void;
  onSubmit: (data: Service) => void;
  onCancel: () => void;
}

export function ServiceForm({ formData: initialData, isEditing, onSubmit, onCancel }: ServiceFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({
    name_he: '',
    price: '',
    duration: ''
  });

  const validateForm = () => {
    const newErrors = {
      name_he: '',
      price: '',
      duration: ''
    };

    if (!formData.name_he) {
      newErrors.name_he = 'שדה חובה';
    }

    if (!formData.price) {
      newErrors.price = 'שדה חובה';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'יש להזין מחיר חוקי';
    }

    if (!formData.duration) {
      newErrors.duration = 'שדה חובה';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 p-6 rounded-xl space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם השירות
          </label>
          <input
            type="text"
            value={formData.name_he}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name_he: e.target.value }));
              if (errors.name_he) setErrors(prev => ({ ...prev, name_he: '' }));
            }}
            className={`w-full p-2 border ${
              errors.name_he ? 'border-red-300' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-indigo-500`}
            required
          />
          {errors.name_he && (
            <p className="mt-1 text-sm text-red-600">{errors.name_he}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחיר
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, price: e.target.value }));
              if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
            }}
            className={`w-full p-2 border ${
              errors.price ? 'border-red-300' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-indigo-500`}
            required
            min="0"
            step="0.01"
          />
          {errors.price && (
            <p className="mt-1 text-sm text-red-600">{errors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            משך זמן (דקות)
          </label>
          <select
            value={formData.duration}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, duration: e.target.value }));
              if (errors.duration) setErrors(prev => ({ ...prev, duration: '' }));
            }}
            className={`w-full p-2 border ${
              errors.duration ? 'border-red-300' : 'border-gray-300'
            } rounded-lg focus:ring-2 focus:ring-indigo-500`}
          >
            <option value="15">15 דקות</option>
            <option value="30">30 דקות</option>
            <option value="45">45 דקות</option>
            <option value="60">שעה</option>
            <option value="90">שעה וחצי</option>
            <option value="120">שעתיים</option>
          </select>
          {errors.duration && (
            <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ביטול
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {isEditing ? 'עדכן' : 'הוסף'} שירות
        </button>
      </div>
    </motion.div>
  );
}