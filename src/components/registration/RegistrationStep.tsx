import React from 'react';
import { useRegistration } from '../../contexts/registration/hooks';
import { BusinessStepOne, BusinessStepTwo, BusinessStepThree, BusinessStepFour } from './steps/business';

interface RegistrationStepProps {
  step: {
    id: number;
    title: string;
    description: string;
  };
  loading?: boolean;
}

export function RegistrationStep({ step, loading }: RegistrationStepProps) {
  const { state } = useRegistration();

  if (!step) {
    return null;
  }

  const renderStep = () => {
    switch (step.id) {
      case 1:
        return <BusinessStepOne loading={loading} />;
      case 2:
        return <BusinessStepTwo loading={loading} />;
      case 3:
        return <BusinessStepThree loading={loading} />;
      case 4:
        return <BusinessStepFour loading={loading} />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{step.title}</h2>
        <p className="mt-1 text-gray-500">{step.description}</p>
      </div>
      {renderStep()}
    </div>
  );
}
