import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useRegistration } from '../../../../contexts/registration/hooks';
import { ServiceForm } from './components/ServiceForm';
import { ServiceCard } from './components/ServiceCard';
import { Service } from './types';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/auth/hooks';

interface BusinessStepFourProps {
  loading?: boolean;
}

export function BusinessStepFour({ loading }: BusinessStepFourProps) {
  const { updateStep, getStepData, completeRegistration } = useRegistration();
  const { signIn } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Service[]>(() => {
    const savedData = getStepData(4)?.services || [];
    return savedData;
  });
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async () => {
    if (loading) return;

    if (formData.length === 0) {
      setErrors({ form: 'יש להוסיף לפחות שירות אחד' });
      return;
    }

    try {
      await updateStep(4, { services: formData });
      toast.success('השירותים נשמרו בהצלחה!');
      
      await completeRegistration();

      const step1Data = getStepData(1);
      if (step1Data?.email && step1Data?.password) {
        await signIn(step1Data.email, step1Data.password);
        toast.success('תהליך ההרשמה הושלם בהצלחה!');
      } else {
        toast.error('שגיאה בהתחברות למערכת');
      }
    } catch (error: any) {
      console.error('Error in step 4:', error);
      toast.error(error.message || 'שגיאה בשמירת השירותים');
    }
  };

  const handleServiceSubmit = (serviceData: Service) => {
    if (editingService) {
      setFormData(prev => prev.map(service => 
        service.id === editingService.id ? {
          ...serviceData,
          name: serviceData.name_he, // Use Hebrew name for both fields
          name_he: serviceData.name_he
        } : service
      ));
    } else {
      setFormData(prev => [...prev, {
        ...serviceData,
        name: serviceData.name_he, // Use Hebrew name for both fields
        name_he: serviceData.name_he,
        id: crypto.randomUUID()
      }]);
    }
    setShowForm(false);
    setEditingService(null);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setFormData(prev => prev.filter(service => service.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setEditingService(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          שירות חדש
        </motion.button>

        {showForm && (
          <ServiceForm
            formData={editingService || {
              name: '',
              name_he: '',
              price: '',
              duration: '30',
              description: '',
              promotion: undefined
            }}
            services={[]}
            isEditing={!!editingService}
            onFormChange={() => {}}
            onSubmit={handleServiceSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingService(null);
            }}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>

        {formData.length === 0 && !showForm && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              לא הוגדרו שירותים
            </p>
          </div>
        )}

        {errors.form && (
          <p className="text-sm text-red-600 text-center">{errors.form}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <motion.button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'סיום הרשמה'
          )}
        </motion.button>
      </div>
    </div>
  );
}