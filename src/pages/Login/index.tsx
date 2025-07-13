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
            {/* אייקון גוגל מודרני */}
            <svg width="22" height="22" viewBox="0 0 48 48" className="mr-1" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.22l6.92-6.92C36.42 2.34 30.61 0 24 0 14.82 0 6.73 5.48 2.69 13.44l8.06 6.27C12.7 13.13 17.89 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.22-.42-4.75H24v9.01h12.44c-.54 2.9-2.17 5.36-4.62 7.03l7.19 5.59C43.91 37.13 46.1 31.34 46.1 24.5z"/>
                <path fill="#FBBC05" d="M10.75 28.71c-1.01-2.99-1.01-6.23 0-9.22l-8.06-6.27C.64 17.52 0 20.68 0 24c0 3.32.64 6.48 1.81 9.48l8.94-4.77z"/>
                <path fill="#EA4335" d="M24 48c6.61 0 12.42-2.17 16.55-5.93l-7.19-5.59c-2.01 1.36-4.57 2.17-7.36 2.17-6.11 0-11.3-3.63-13.25-8.71l-8.94 4.77C6.73 42.52 14.82 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </g>
            </svg>
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
