import React from 'react';
import { motion } from 'framer-motion';
import { Star, Tag } from 'lucide-react';
import { useStaff } from '../../hooks/useStaff';

interface StaffSelectorProps {
  selectedId: string;
  serviceId: string;
  onSelect: (staffId: string) => void;
}

export function StaffSelector({ selectedId, serviceId, onSelect }: StaffSelectorProps) {
  const { staff, loading } = useStaff(serviceId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {staff.map((member) => (
        <motion.button
          key={member.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelect(member.id)}
          className={`flex items-center gap-4 p-4 rounded-xl text-right transition-colors ${
            selectedId === member.id
              ? 'bg-indigo-50 border-2 border-indigo-600'
              : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
          }`}
        >
          {member.profile_image_url ? (
            <img
              src={member.profile_image_url}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-lg font-medium text-indigo-600">
                {member.name.charAt(0)}
              </span>
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-medium">{member.name}</h3>
            {member.title && (
              <p className="text-sm text-gray-500">{member.title}</p>
            )}
            {member.specialties?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {member.specialties.map((specialty, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            )}
          </div>
          {member.rating && (
            <div className="flex items-center gap-1 text-amber-500">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-medium">{member.rating}</span>
            </div>
          )}
        </motion.button>
      ))}
    </div>
  );
}