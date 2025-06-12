import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, X, ArrowLeft, User, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CustomerAuthProps {
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerAuth({ businessId, onClose, onSuccess }: CustomerAuthProps) {
  const [step, setStep] = useState<'phone' | 'register' | 'login' | 'set_password'>('phone');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: ''
  });

  // Hide bottom nav when modal is open
  useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone) return;

    try {
      setLoading(true);

      // נרמל את מספר הטלפון
      const normalizedPhone = formData.phone.replace(/\D/g, '');
      if (!/^05\d{8}$/.test(normalizedPhone)) {
        toast.error('מספר טלפון לא תקין');
        return;
      }

      // בדוק אם הלקוח קיים
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, password')
        .eq('business_id', businessId)
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (customerError) throw customerError;

      // עדכן את מספר הטלפון המנורמל
      setFormData(prev => ({ ...prev, phone: normalizedPhone }));

      // אם הלקוח קיים
      if (customer) {
        // בדוק אם יש לו סיסמא
        if (customer.password) {
          setStep('login'); // יש סיסמא - נעבור להתחברות
        } else {
          setStep('set_password'); // אין סיסמא - נבקש להגדיר
        }
      } else {
        setStep('register'); // לקוח חדש - נעבור להרשמה
      }

    } catch (error: any) {
      console.error('Error in phone submit:', error);
      toast.error(error.message || 'שגיאה בבדיקת מספר הטלפון');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.password) return;

    try {
      setLoading(true);

      // נסה להתחבר
      const { data: authData, error: authError } = await supabase
        .rpc('authenticate_customer', {
          p_phone: formData.phone,
          p_password: formData.password,
          p_business_id: businessId
        });

      if (authError) throw authError;

      if (!authData) {
        throw new Error('סיסמה שגויה');
      }

      // שמור את מספר הטלפון ב-localStorage
      localStorage.setItem('customerPhone', formData.phone);

      toast.success('התחברת בהצלחה!');
      onSuccess();
    } catch (error: any) {
      console.error('Error in login:', error);
      toast.error(error.message || 'סיסמה שגויה');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phone || !formData.password) return;

    try {
      setLoading(true);

      // נסה לעדכן את הסיסמה
      const { data: result, error: updateError } = await supabase
        .rpc('set_customer_password', {
          p_phone: formData.phone,
          p_password: formData.password,
          p_business_id: businessId
        });

      if (updateError) throw updateError;

      console.log('Password update result:', result);

      if (!result.success) {
        throw new Error(result.error || 'שגיאה בשמירת הסיסמה');
      }

      // שמור את מספר הטלפון ב-localStorage
      localStorage.setItem('customerPhone', formData.phone);

      toast.success('הסיסמה נשמרה בהצלחה!');
      onSuccess();
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast.error(error.message || 'שגיאה בשמירת הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.password) return;

    try {
      setLoading(true);

      // צור לקוח חדש
      const { data: customer, error: createError } = await supabase
        .from('customers')
        .insert({
          business_id: businessId,
          name: formData.name,
          phone: formData.phone,
          password: formData.password,
          points: 0,
          diamonds: 0,
          loyalty_level: 'bronze',
          loyalty_stats: {
            total_visits: 0,
            consecutive_visits: 0,
            last_visit: null,
            referrals: 0,
            total_spent: 0,
            achievements: []
          }
        })
        .select()
        .single();

      if (createError) throw createError;

      // שמור את מספר הטלפון ב-localStorage
      localStorage.setItem('customerPhone', formData.phone);

      toast.success('נרשמת בהצלחה!');
      onSuccess();
    } catch (error: any) {
      console.error('Error in register:', error);
      toast.error(error.message || 'שגיאה בהרשמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white w-full max-w-sm rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step !== 'phone' && (
                <button
                  onClick={() => setStep('phone')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="p-2 bg-indigo-50 rounded-xl">
                {step === 'register' || step === 'login' || step === 'set_password' ? (
                  <User className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Phone className="h-5 w-5 text-indigo-600" />
                )}
              </div>
              <h2 className="text-lg font-semibold">
                {step === 'phone' && 'התחברות'}
                {step === 'register' && 'הרשמה'}
                {step === 'login' && 'התחברות'}
                {step === 'set_password' && 'הגדרת סיסמה'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר טלפון
                </label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="050-1234567"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>בודק...</span>
                  </>
                ) : (
                  <span>המשך</span>
                )}
              </motion.button>
            </form>
          )}

          {step === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="הזן סיסמה"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>מתחבר...</span>
                  </>
                ) : (
                  <span>התחבר</span>
                )}
              </motion.button>
            </form>
          )}

          {step === 'set_password' && (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  הגדר סיסמה חדשה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="הזן סיסמה חדשה"
                    required
                    minLength={6}
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  הסיסמה חייבת להכיל לפחות 6 תווים
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>שומר...</span>
                  </>
                ) : (
                  <span>שמור סיסמה</span>
                )}
              </motion.button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="הזן את שמך המלא"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="הזן סיסמה"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>נרשם...</span>
                  </>
                ) : (
                  <span>הרשם</span>
                )}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}