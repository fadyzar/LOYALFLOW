import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Phone, User } from 'lucide-react';
import { useRegistration } from '../../../../contexts/registration/hooks';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface BusinessStepOneProps {
  loading?: boolean;
}

export function BusinessStepOne({ loading }: BusinessStepOneProps) {
  const { updateStep, getStepData } = useRegistration();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState(() => {
    const savedData = getStepData(1);
    return {
      name: savedData?.name || '',
      email: savedData?.email || '',
      password: savedData?.password || '',
      phone: savedData?.phone || ''
    };
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      password: '',
      phone: ''
    };

    // בדיקת שם
    if (!formData.name) {
      newErrors.name = 'שדה חובה';
    } else if (formData.name.length < 2) {
      newErrors.name = 'השם חייב להכיל לפחות 2 תווים';
    }

    // בדיקת אימייל
    if (!formData.email) {
      newErrors.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    // בדיקת סיסמה
    if (!formData.password) {
      newErrors.password = 'שדה חובה';
    } else if (formData.password.length < 6) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }

    // בדיקת טלפון
    if (!formData.phone) {
      newErrors.phone = 'שדה חובה';
    } else if (!/^05\d{8}$/.test(formData.phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || loading) return;

    try {
      // בדיקה אם האימייל קיים
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .limit(1);

      if (usersError) throw usersError;

      if (users && users.length > 0) {
        setErrors(prev => ({ ...prev, email: 'כתובת האימייל כבר קיימת במערכת' }));
        return;
      }

      // שמירת הנתונים
      await updateStep(1, formData);
      toast.success('הנתונים נשמרו בהצלחה! ממשיך לשלב הבא...');
    } catch (error: any) {
      console.error('Error in step 1:', error);
      toast.error(error.message || 'שגיאה בשמירת הנתונים');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            שם מלא
          </label>
          <div className="relative">
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
              placeholder="הזן את שמך המלא"
            />
            <User className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.name ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            אימייל
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, email: e.target.value }));
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
              placeholder="הזן את כתובת האימייל שלך"
              dir="ltr"
            />
            <Mail className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.email ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            טלפון נייד
          </label>
          <div className="relative">
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                setFormData(prev => ({ ...prev, phone: value }));
                if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
              }}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.phone ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
              placeholder="הזן מספר טלפון (לדוגמה: 0501234567)"
              dir="ltr"
            />
            <Phone className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.phone ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            סיסמה
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={formData.password}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, password: e.target.value }));
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
              }}
              className={`block w-full pl-10 pr-10 py-3 text-right border ${
                errors.password ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
              placeholder="הזן סיסמה"
              dir="ltr"
            />
            <Lock className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.password ? 'text-red-400' : 'text-gray-400'
            }`} />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          'המשך לשלב הבא'
        )}
      </motion.button>
    </form>
  );
}