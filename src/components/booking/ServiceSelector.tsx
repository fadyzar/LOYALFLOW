import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useServices } from '../../hooks/useServices';
import { supabase } from '../../lib/supabase';

interface ServiceSelectorProps {
  businessId: string;
  selectedId: string;
  staffId?: string;
  onSelect: (serviceId: string) => void;
}

export const ServiceSelector = memo(function ServiceSelector({ 
  businessId, 
  selectedId, 
  onSelect 
}: ServiceSelectorProps) {
  const { services, loading } = useServices(businessId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!services || services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">לא נמצאו שירותים</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {services.map((service) => (
        <motion.button
          key={service.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(service.id)}
          className={`w-full flex items-center gap-4 p-4 rounded-xl text-right transition-colors ${
            selectedId === service.id
              ? 'bg-indigo-50 border-2 border-indigo-600'
              : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
          }`}
        >
          <div className="flex-1">
            <h3 className="font-medium">{service.name_he}</h3>
          </div>
        </motion.button>
      ))}
    </div>
  );
});