// src/pages/login/UpdatePassword.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  // 🧠 שלב 1: נחלץ טוקנים מה-URL
  useEffect(() => {
    const urlHash = window.location.hash;
    const params = new URLSearchParams(urlHash.substring(1)); // מסיר את ה-#
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          console.error('שגיאה בשחזור סשן:', error.message);
          toast.error('שגיאה באימות, נסה שוב מהקישור');
        } else {
          setSessionReady(true);
        }
      });
    } else {
      toast.error('הקישור לא תקין או שפג תוקפו');
    }
  }, []);

  const handleUpdatePassword = async () => {
    if (!sessionReady) {
      toast.error('אין סשן פעיל. נסה לרענן את הדף או לפתוח שוב את הקישור מהמייל.');
      return;
    }

  setLoading(true);
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    if (
      error.message?.toLowerCase().includes('new password should be different')
    ) {
      toast.error('הסיסמה החדשה חייבת להיות שונה מהסיסמה הקודמת.');
    } else if (
      error.message?.toLowerCase().includes('password should contain at least one character')
    ) {
      toast.error('הסיסמה חייבת לכלול אותיות קטנות, גדולות, מספרים ותווים מיוחדים.');
    } else if (
      error.message?.toLowerCase().includes('weak password')
    ) {
      toast.error('הסיסמה חלשה מדי, נסה לבחור סיסמה חזקה יותר.');
    } else {
      toast.error('שגיאה בעדכון הסיסמה');
      console.error(error);
    }
  } else {
    toast.success('הסיסמה עודכנה בהצלחה!');
    navigate('/login');
  }

  setLoading(false);
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">עדכון סיסמה</h2>
          <p className="text-sm text-gray-500 mt-1">הזן סיסמה חדשה</p>
        </div>

        <div className="space-y-4">
          <input
            type="password"
            placeholder="סיסמה חדשה"
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleUpdatePassword}
            disabled={loading || !password}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-medium transition disabled:opacity-50"
          >
            {loading ? 'מעדכן...' : 'עדכן סיסמה'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UpdatePassword;
