import React from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { useServices } from '../../hooks/useServices';

interface ServiceSelectorProps {
  selectedId: string;
  staffId?: string;
  onSelect: (serviceId: string) => void;
}

export function ServiceSelector({ selectedId, staffId, onSelect }: ServiceSelectorProps) {
  const { services, loading, businessId } = useServices();

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
        <p className="text-gray-500">לא נמצאו שירותים</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {services.map((service) => {
        // חילוץ מספר הדקות מה-interval
        const durationMatch = service.duration.match(/(\d+):(\d+):(\d+)/);
        const durationMinutes = durationMatch 
          ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2])
          : 30;

        return (
          <motion.button
            key={service.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Pass both service ID and business ID
              if (businessId) {
                onSelect(service.id);
              }
            }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-right transition-colors ${
              selectedId === service.id
                ? 'bg-indigo-50 border-2 border-indigo-600'
                : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
            }`}
          >
            <div className="flex-1">
              <h3 className="font-medium">{service.name_he}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{durationMinutes} דקות</span>
                </div>
              </div>
            </div>
            <div className="text-indigo-600 font-medium">₪{service.price}</div>
          </motion.button>
        );
      })}
    </div>
  );
}