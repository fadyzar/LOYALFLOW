import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegistration } from '../../contexts/registration/hooks';
import { RegistrationStep } from './RegistrationStep';
import { RegistrationProgress } from './RegistrationProgress';
import { BusinessSteps } from './steps/business';

export function RegistrationWizard() {
  const { state, loadingStates } = useRegistration();
  
  // וידוא שיש צעד תקין
  const currentStep = BusinessSteps.find(step => step.id === state.currentStep);
  
  if (!currentStep) {
    console.error('Invalid step:', state.currentStep);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-b border-gray-200/50">
        {/* Logo and Back Button */}
        <div className="px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <Link 
              to="/login"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
            >
              <ArrowRight className="h-5 w-5" />
              <span className="text-sm">חזרה להתחברות</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-xl">
                <Calendar className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text">
                LoyalFlow
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 pb-4">
          <div className="max-w-2xl mx-auto">
            <RegistrationProgress steps={BusinessSteps} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={state.currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <RegistrationStep
                step={currentStep}
                loading={loadingStates.updatingStep}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
