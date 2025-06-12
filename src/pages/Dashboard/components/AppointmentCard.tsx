import React from 'react';

interface AppointmentCardProps {
  id: number;
  time: string;
  customerName: string;
  service: string;
  duration: string;
  price: string;
  status: 'confirmed' | 'pending';
  avatar: string;
}

export function AppointmentCard({
  time,
  customerName,
  service,
  duration,
  price,
  status,
  avatar
}: AppointmentCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 hover:scale-[1.01] active:scale-[0.98] transition-transform">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img
            src={avatar}
            alt={customerName}
            className="w-12 h-12 rounded-xl object-cover"
            loading="lazy"
          />
          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            status === 'confirmed' ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              {customerName}
            </h3>
            <span className="text-sm font-medium text-gray-900">
              {time}
            </span>
          </div>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span>{service}</span>
            <span className="mx-2">•</span>
            <span>{duration}</span>
            <span className="mx-2">•</span>
            <span className="font-medium text-indigo-600">{price}</span>
          </div>
        </div>
      </div>
    </div>
  );
}