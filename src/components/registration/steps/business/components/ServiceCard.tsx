import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Clock } from 'lucide-react';
import { Service } from '../types';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

export function ServiceCard({ service, onEdit, onDelete }: ServiceCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{service.name_he}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(service)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(service.id!)}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="text-gray-500">{service.duration} דקות</span>
        </div>
        <span className="font-medium text-indigo-600">₪{service.price}</span>
      </div>
    </motion.div>
  );
}