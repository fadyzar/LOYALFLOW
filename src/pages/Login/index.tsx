import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth/hooks';
import { LoginForm } from './components/LoginForm';
import toast from 'react-hot-toast';

function Login() {
  const navigate = useNavigate();
  const { isCreatingAccount, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error('שגיאה בהתחברות עם Google');
    }
    setLoading(false);
  };

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
            transition={{ duration: 0.8, type: 'spring', stiffness: 100 }}
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

        


        {/* כפתור התחברות עם Google */}
        <div className="mt-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png"
              alt="Google"
              className="w-5 h-5"
            />
            התחברות עם Google
          </button>
        </div>
        <motion.div 
  className="flex justify-center mt-2"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
>
  <button
    onClick={() => navigate('/forgot-password')}
    className="text-sm text-indigo-600 hover:text-indigo-500 transition-colors underline"
  >
    שכחת סיסמה?
  </button>
</motion.div>
      </motion.div>

      
    </div>

    
  );

  
}

export default Login;
