import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Check, Building2, Users, Sparkles } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: Step[] = [
  {
    id: 'business',
    title: 'יוצר את העסק שלך',
    description: 'מגדיר את הפרטים הבסיסיים',
    icon: Building2
  },
  {
    id: 'services',
    title: 'מגדיר שירותים',
    description: 'מכין את התשתית לניהול השירותים',
    icon: Calendar
  },
  {
    id: 'staff',
    title: 'מכין את המערכת',
    description: 'מגדיר הרשאות והגדרות מערכת',
    icon: Users
  },
  {
    id: 'complete',
    title: 'הכל מוכן!',
    description: 'מעביר אותך למערכת',
    icon: Sparkles
  }
];

function LoadingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
        setCompleted(prev => [...prev, steps[currentStep].id]);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentStep]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center z-50">
      <div className="max-w-md w-full mx-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-12"
        >
          <motion.div
            className="mx-auto h-20 w-20 text-indigo-600 bg-indigo-50 rounded-2xl p-4 flex items-center justify-center mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Calendar className="h-12 w-12" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900">
            מקים את העסק שלך ב-LoyalFlow
          </h2>
          <p className="mt-2 text-gray-600">
            אנחנו מכינים הכל בשבילך, זה ייקח רק כמה שניות
          </p>
        </motion.div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = completed.includes(step.id);
            const Icon = step.icon;

            return (
              <motion.div
                key={step.id}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.2 }}
                className={`bg-white rounded-xl p-4 shadow-sm border ${
                  isActive ? 'border-indigo-200 ring-2 ring-indigo-100' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium ${
                      isCompleted ? 'text-green-600' :
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${
                      isActive ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5">
                      <motion.div
                        className="w-1.5 h-1.5 bg-indigo-600 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </div>
                  )}
                </div>
                {isActive && (
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5 }}
                    className="h-0.5 bg-indigo-200 mt-2"
                  />
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;