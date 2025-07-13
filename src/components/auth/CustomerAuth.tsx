import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CustomerAuthProps {
  businessId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CustomerAuth({ businessId, onClose, onSuccess }: CustomerAuthProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (window as any).setModalOpen?.(true);
    return () => {
      (window as any).setModalOpen?.(false);
    };
  }, []);

  const handleLogin = async () => {
    if (!phone.match(/^05\d{8}$/)) {
      toast.error('יש להזין מספר טלפון ישראלי תקין');
      return;
    }
    setLoading(true);
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, is_blocked')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .single();

      if (error || !customer) {
        toast.error('מספר הטלפון לא נמצא במערכת. אנא ודא שהזנת את המספר הנכון או פנה לעסק להצטרפות.');
        return;
      }
      if (customer.is_blocked) {
        toast.error('הגישה שלך חסומה. אנא פנה לעסק לפרטים נוספים או להסרת החסימה.');
        return;
      }
      localStorage.setItem('customerPhone', phone);
      toast.success('התחברת בהצלחה!');
      onSuccess();
    } catch (err: any) {
      toast.error('אירעה שגיאה בעת ההתחברות. נסה שוב מאוחר יותר.');
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
              <div className="p-2 bg-indigo-50 rounded-xl">
                <Phone className="h-5 w-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold">התחברות</h2>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר טלפון
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                  className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="05XXXXXXXX"
                  required
                  dir="ltr"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              onClick={handleLogin}
              disabled={loading}
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
            <div className="text-center text-gray-500 text-sm mt-2">
              עדיין לא רשום? פנה לעסק להצטרפות או לקבלת עזרה.
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}