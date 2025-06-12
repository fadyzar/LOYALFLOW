import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Building2 } from 'lucide-react';

interface ContactInfoProps {
  contactInfo: {
    phone: string;
    email: string;
    address: string;
    city: string;
    country: string;
    location?: {
      lat: number | null;
      lng: number | null;
    };
  };
  onChange: (info: any) => void;
}

export function ContactInfo({ contactInfo, onChange }: ContactInfoProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>מספר טלפון וואצפ עסקי</span>
          </div>
        </label>
        <input
          type="tel"
          value={contactInfo.phone}
          onChange={(e) => onChange({ ...contactInfo, phone: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="050-1234567"
          dir="ltr"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>מייל עסקי</span>
          </div>
        </label>
        <input
          type="email"
          value={contactInfo.email}
          onChange={(e) => onChange({ ...contactInfo, email: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="your@email.com"
          dir="ltr"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>כתובת</span>
          </div>
        </label>
        <input
          type="text"
          value={contactInfo.address}
          onChange={(e) => onChange({ ...contactInfo, address: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="הזן כתובת מלאה"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>עיר</span>
          </div>
        </label>
        <input
          type="text"
          value={contactInfo.city}
          onChange={(e) => onChange({ ...contactInfo, city: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="הזן שם עיר"
        />
      </div>
    </div>
  );
}