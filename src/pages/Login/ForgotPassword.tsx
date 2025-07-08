import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/update-password', // החלף ל־Netlify אם צריך
    });

    if (error) {
      toast.error('שגיאה בשליחת קישור איפוס');
    } else {
      toast.success('קישור איפוס נשלח למייל');
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl shadow-lg"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800">איפוס סיסמה</h2>
        <input
          type="email"
          placeholder="כתובת אימייל"
          className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
        </button>
      </motion.div>
    </div>
  );
}
