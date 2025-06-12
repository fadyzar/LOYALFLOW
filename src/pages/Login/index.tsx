import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth/hooks';
import { LoginForm } from './components/LoginForm';

function Login() {
  const navigate = useNavigate();
  const { isCreatingAccount } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  if (isCreatingAccount) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center">
          <motion.div
            className="mx-auto h-16 w-16 text-indigo-600 bg-indigo-50 rounded-2xl p-3 flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
          >
            <Calendar className="h-10 w-10" />
          </motion.div>
          <motion.h2 
            className="mt-6 text-3xl font-extrabold text-gray-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            ברוכים הבאים ל-LoyalFlow
          </motion.h2>
          <motion.p 
            className="mt-2 text-sm text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            עדיין אין לך חשבון?{' '}
            <button
              onClick={() => navigate('/register')}
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
            >
              הרשמה
            </button>
          </motion.p>
        </div>

        <LoginForm
          email={formData.email}
          password={formData.password}
          loading={loading}
          onEmailChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
          onPasswordChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
          onSuccess={() => setLoading(false)}
        />
      </motion.div>
    </div>
  );
}

export default Login;