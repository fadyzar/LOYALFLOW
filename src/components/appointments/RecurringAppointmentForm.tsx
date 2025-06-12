import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Repeat, User, Scissors } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useServices } from '../../hooks/useServices';
import { useAvailableStaff } from '../../hooks/useAvailableStaff';
import { useAuth } from '../../contexts/auth/hooks';

interface RecurringAppointmentFormProps {
  formData: {
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    serviceDuration: string;
    staffId: string;
    staffName: string;
    startDate: Date;
    time: string;
    recurrenceType: 'weekly' | 'daily';
    recurrenceCount: number;
    recurrenceDays: number[];
  };
  onChange: (data: any) => void;
  onSubmit: () => void;
}

export function RecurringAppointmentForm({ 
  formData, 
  onChange, 
  onSubmit 
}: RecurringAppointmentFormProps) {
  const { business } = useAuth();
  const { services, loading: servicesLoading } = useServices();
  const { availableStaff, loading: staffLoading } = useAvailableStaff(formData.serviceId, business?.id);
  
  const [showDaySelector, setShowDaySelector] = useState(formData.recurrenceType === 'weekly');
  
  useEffect(() => {
    setShowDaySelector(formData.recurrenceType === 'weekly');
  }, [formData.recurrenceType]);
  
  const handleDayToggle = (day: number) => {
    const currentDays = [...formData.recurrenceDays];
    if (currentDays.includes(day)) {
      onChange({
        ...formData,
        recurrenceDays: currentDays.filter(d => d !== day)
      });
    } else {
      onChange({
        ...formData,
        recurrenceDays: [...currentDays, day].sort()
      });
    }
  };
  
  const getDayName = (day: number) => {
    const date = new Date();
    date.setDate(date.getDate() - date.getDay() + day);
    return format(date, 'EEEE', { locale: he }).replace('יום ', '');
  };
  
  const isFormValid = () => {
    return (
      formData.serviceId && 
      formData.staffId && 
      formData.time && 
      formData.recurrenceCount > 0 && 
      (formData.recurrenceType !== 'weekly' || formData.recurrenceDays.length > 0)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Service Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            <span>בחר שירות</span>
          </div>
        </label>
        <select
          value={formData.serviceId}
          onChange={(e) => {
            const service = services.find(s => s.id === e.target.value);
            if (service) {
              onChange({
                ...formData,
                serviceId: service.id,
                serviceName: service.name_he,
                servicePrice: service.price,
                serviceDuration: service.duration,
                staffId: '', // Reset staff when service changes
                staffName: ''
              });
            }
          }}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="">בחר שירות</option>
          {services.map(service => (
            <option key={service.id} value={service.id}>
              {service.name_he} - ₪{service.price}
            </option>
          ))}
        </select>
      </div>

      {/* Staff Selection */}
      {formData.serviceId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>בחר איש צוות</span>
            </div>
          </label>
          <select
            value={formData.staffId}
            onChange={(e) => {
              const staff = availableStaff.find(s => s.id === e.target.value);
              if (staff) {
                onChange({
                  ...formData,
                  staffId: staff.id,
                  staffName: staff.name
                });
              }
            }}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
            disabled={staffLoading || !formData.serviceId}
          >
            <option value="">בחר איש צוות</option>
            {availableStaff.map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>תאריך התחלה</span>
            </div>
          </label>
          <input
            type="date"
            value={format(formData.startDate, 'yyyy-MM-dd')}
            onChange={(e) => onChange({
              ...formData,
              startDate: e.target.value ? new Date(e.target.value) : new Date()
            })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            min={format(new Date(), 'yyyy-MM-dd')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>שעה</span>
            </div>
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => onChange({
              ...formData,
              time: e.target.value
            })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Recurrence Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4" />
            <span>הגדרות חזרה</span>
          </div>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סוג חזרה
            </label>
            <select
              value={formData.recurrenceType}
              onChange={(e) => onChange({
                ...formData,
                recurrenceType: e.target.value as 'weekly' | 'daily',
                recurrenceDays: e.target.value === 'daily' ? [0] : formData.recurrenceDays
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="weekly">שבועי</option>
              <option value="daily">יומי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              מספר {formData.recurrenceType === 'weekly' ? 'שבועות' : 'ימים'}
            </label>
            <input
              type="number"
              value={formData.recurrenceCount}
              onChange={(e) => onChange({
                ...formData,
                recurrenceCount: parseInt(e.target.value)
              })}
              min="1"
              max="12"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Day Selector for Weekly Recurrence */}
      {showDaySelector && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            בחר ימים בשבוע
          </label>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  formData.recurrenceDays.includes(day)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getDayName(day)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSubmit}
          disabled={!isFormValid()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          המשך
        </motion.button>
      </div>
    </motion.div>
  );
}