import React from 'react';
import { motion } from 'framer-motion';
import { useRegistration } from '../../contexts/registration/hooks';
import { Check } from 'lucide-react';

interface RegistrationProgressProps {
  steps: Array<{
    id: number;
    title: string;
    description: string;
  }>;
}

export function RegistrationProgress({ steps }: RegistrationProgressProps) {
  const { state, goToStep } = useRegistration();

  // Prevent rendering if currentStep is out of bounds
  const isCompleted = state.isCompleted === true;
  const currentStep = Math.min(state.currentStep, steps.length);

  return (
    <nav aria-label="שלבי הרשמה" className="bg-white rounded-2xl shadow-sm p-4">
      <ol className="relative flex items-center justify-between">
        {/* קו רקע רציף */}
        <div className="absolute top-5 right-[10%] left-[10%] h-px bg-gray-200" />

        {/* קו התקדמות */}
        <div 
          className="absolute top-5 right-[10%] h-px bg-green-500 transition-all duration-500"
          style={{
            width: `${(state.completedSteps.length / (steps.length - 1)) * 80}%`
          }}
        />

        {!isCompleted ? steps.map((step) => {
          // Only render steps that exist in the steps array
          if (step.id > steps.length) return null;
          const isStepCompleted = state.completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = isStepCompleted || step.id === 1;

          return (
            <li
              key={step.id}
              className={`relative flex flex-col items-center ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
              }`}
              style={{ zIndex: 10 }}
              onClick={() => isClickable && goToStep(step.id)}
            >
              {/* Step Number/Check */}
              <motion.div
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border-2 bg-white transition-colors ${
                  isStepCompleted
                    ? 'border-green-500 bg-green-500 text-bg-green-500'
                    : isCurrent
                    ? 'border-indigo-600 bg-indigo-600 text-bg-indigo-600 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 text-gray-400'
                }`}
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
              >
                {isStepCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className={`text-sm font-medium ${isCurrent ? 'text-bg-indigo-600' : 'text-bg-indigo-600'}`}>
                    {step.id}
                  </span>
                )}
              </motion.div>

              {/* Step Title */}
              <h3 className={`mt-2 text-sm font-medium transition-colors ${
                isCurrent ? 'text-indigo-600' : isStepCompleted ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.title}
              </h3>
            </li>
          );
        }) : (
          // Completion indicator
          <li className="flex flex-col items-center w-full">
            <motion.div
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-green-500 bg-green-500 text-white"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1.1 }}
            >
              <Check className="h-6 w-6" />
            </motion.div>
            <h3 className="mt-2 text-lg font-bold text-green-600">ההרשמה הושלמה!</h3>
          </li>
        )}
      </ol>
    </nav>
  );
}