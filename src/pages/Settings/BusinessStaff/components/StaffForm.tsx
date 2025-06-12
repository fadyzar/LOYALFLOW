import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Phone, 
  Upload, 
  X, 
  Clock, 
  Calendar,
  Tag,
  User,
  Plus,
  Check
} from 'lucide-react';
import { StaffFormData } from '../types';
import { Database } from '../../../../lib/database.types';
import toast from 'react-hot-toast';

interface StaffFormProps {
  formData: StaffFormData;
  services: Service[];
  specialties: StaffSpecialty[];
  isEditing: boolean;
  onFormChange: (data: StaffFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  existingImageUrl?: string;
}

// Define days order
const DAYS_ORDER = [
  { key: 'sunday', label: 'ראשון' },
  { key: 'monday', label: 'שני' },
  { key: 'tuesday', label: 'שלישי' },
  { key: 'wednesday', label: 'רביעי' },
  { key: 'thursday', label: 'חמישי' },
  { key: 'friday', label: 'שישי' },
  { key: 'saturday', label: 'שבת' }
];

// Default hours structure
const DEFAULT_HOURS = {
  sunday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  monday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  tuesday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  wednesday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  thursday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  friday: { is_active: true, start_time: '09:00', end_time: '17:00', breaks: [] },
  saturday: { is_active: false, start_time: '09:00', end_time: '17:00', breaks: [] }
};

export function StaffForm({ 
  formData, 
  services, 
  specialties, 
  isEditing, 
  onFormChange, 
  onSubmit, 
  onCancel,
  existingImageUrl 
}: StaffFormProps) {
  const [showPromotion, setShowPromotion] = useState(!!formData.promotion);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showSpecialtyInput, setShowSpecialtyInput] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');

  // Set initial preview URL if editing
  useEffect(() => {
    if (existingImageUrl) {
      setPreviewUrl(existingImageUrl);
    }
  }, [existingImageUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFormChange({ ...formData, profile_image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onFormChange({ ...formData, profile_image: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBusinessHoursChange = (useBusinessHours: boolean) => {
    onFormChange({
      ...formData,
      hours: {
        ...formData.hours,
        use_business_hours: useBusinessHours,
        regular_hours: useBusinessHours ? null : DEFAULT_HOURS
      }
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-gray-50 p-6 rounded-xl space-y-6"
      onSubmit={handleSubmit}
    >
      {/* Profile Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>תמונת פרופיל</span>
          </div>
        </label>
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="תצוגה מקדימה"
              className="h-32 w-32 rounded-full object-cover"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              type="button"
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-500 transition-colors"
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer rounded-md bg-white font-medium text-indigo-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:text-indigo-500">
                  <span>העלה תמונה</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
                <p className="pr-1">או גרור לכאן</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG עד 10MB</p>
            </div>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>שם מלא</span>
            </div>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>אימייל</span>
            </div>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                <span>סיסמה</span>
              </div>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required={!isEditing}
              minLength={6}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>טלפון</span>
            </div>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => onFormChange({ ...formData, phone: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="050-1234567"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>תפקיד</span>
            </div>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => onFormChange({ ...formData, title: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="למשל: ספר בכיר"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תיאור
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
          placeholder="תיאור קצר שיוצג ללקוחות"
        />
      </div>

      {/* Specialties */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>התמחויות</span>
          </div>
        </label>
        <div className="flex flex-wrap gap-2">
          {formData.specialties.map((specialty, index) => (
            <div
              key={index}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800"
            >
              <span className="text-sm">{specialty}</span>
              <button
                type="button"
                onClick={() => onFormChange({
                  ...formData,
                  specialties: formData.specialties.filter((_, i) => i !== index)
                })}
                className="p-0.5 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {formData.specialties.length < 3 && (
            showSpecialtyInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  className="p-1 border border-gray-300 rounded-lg text-sm"
                  placeholder="הזן התמחות"
                  maxLength={12}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSpecialty.trim()) {
                      onFormChange({
                        ...formData,
                        specialties: [...formData.specialties, newSpecialty.trim()]
                      });
                      setNewSpecialty('');
                      setShowSpecialtyInput(false);
                    }
                  }}
                  className="p-1 text-indigo-600 hover:text-indigo-700"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSpecialtyInput(false);
                    setNewSpecialty('');
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSpecialtyInput(true)}
                className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Plus className="h-3 w-3" />
                <span className="text-sm">הוסף התמחות</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="font-medium">הגדרות</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>זמן מנוחה בין תורים (דקות)</span>
              </div>
            </label>
            <input
              type="number"
              value={formData.settings.rest_time}
              onChange={(e) => onFormChange({
                ...formData,
                settings: {
                  ...formData.settings,
                  rest_time: parseInt(e.target.value)
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="0"
              max="60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>מספר תורים מקסימלי ליום</span>
              </div>
            </label>
            <input
              type="number"
              value={formData.settings.max_daily_appointments || ''}
              onChange={(e) => onFormChange({
                ...formData,
                settings: {
                  ...formData.settings,
                  max_daily_appointments: e.target.value ? parseInt(e.target.value) : null
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              min="1"
              placeholder="ללא הגבלה"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="visible_in_public"
            checked={formData.settings.visible_in_public}
            onChange={(e) => onFormChange({
              ...formData,
              settings: {
                ...formData.settings,
                visible_in_public: e.target.checked
              }
            })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="visible_in_public" className="text-sm font-medium text-gray-700">
            מופיע ביומן הציבורי
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="use_business_hours"
            checked={formData.hours.use_business_hours}
            onChange={(e) => handleBusinessHoursChange(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="use_business_hours" className="text-sm font-medium text-gray-700">
            השתמש בשעות העסק
          </label>
        </div>

        {/* Custom Hours */}
        {!formData.hours.use_business_hours && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">שעות עבודה מותאמות</h4>
            {DAYS_ORDER.map(({ key: day, label }) => {
              const hours = formData.hours.regular_hours?.[day] || DEFAULT_HOURS[day];
              return (
                <div key={day} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hours.is_active}
                        onChange={(e) => {
                          const newHours = { ...formData.hours };
                          newHours.regular_hours = {
                            ...newHours.regular_hours,
                            [day]: {
                              ...hours,
                              is_active: e.target.checked
                            }
                          };
                          onFormChange({
                            ...formData,
                            hours: newHours
                          });
                        }}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-medium">{label}</span>
                    </div>
                  </div>

                  {hours.is_active && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          שעת התחלה
                        </label>
                        <input
                          type="time"
                          value={hours.start_time}
                          onChange={(e) => {
                            const newHours = { ...formData.hours };
                            newHours.regular_hours = {
                              ...newHours.regular_hours,
                              [day]: {
                                ...hours,
                                start_time: e.target.value
                              }
                            };
                            onFormChange({
                              ...formData,
                              hours: newHours
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          שעת סיום
                        </label>
                        <input
                          type="time"
                          value={hours.end_time}
                          onChange={(e) => {
                            const newHours = { ...formData.hours };
                            newHours.regular_hours = {
                              ...newHours.regular_hours,
                              [day]: {
                                ...hours,
                                end_time: e.target.value
                              }
                            };
                            onFormChange({
                              ...formData,
                              hours: newHours
                            });
                          }}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Services */}
      <div className="space-y-4">
        <h3 className="font-medium">שירותים</h3>
        
        <div className="grid grid-cols-1 gap-4">
          {services.map((service) => {
            const staffService = formData.services.find(s => s.id === service.id);
            const hasValidPromotion = service.promotion && isPromotionValid(service.promotion);
            const finalPrice = hasValidPromotion ? 
              calculateDiscountedPrice(service.price, service.promotion) : 
              service.price;

            // חילוץ מספר הדקות מה-interval
            const durationMatch = service.duration.match(/(\d+):(\d+):(\d+)/);
            const defaultDuration = durationMatch 
              ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2])
              : 30;

            return (
              <div
                key={service.id}
                className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <h4 className="font-medium">{service.name_he}</h4>
                  <p className="text-sm text-gray-500">{service.name}</p>
                  {hasValidPromotion && (
                    <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
                      <Tag className="h-3 w-3" />
                      <span>
                        {service.promotion.discount_type === 'percentage'
                          ? `${service.promotion.discount_value}% הנחה`
                          : `${service.promotion.discount_value}₪ הנחה`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">מחיר:</label>
                      <input
                        type="text"
                        value={staffService?.price ?? ''}
                        onChange={(e) => {
                          const newServices = formData.services.filter(s => s.id !== service.id);
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          if (value === '' || !isNaN(parseFloat(value))) {
                            newServices.push({
                              id: service.id,
                              price: value,
                              duration: staffService?.duration ?? defaultDuration.toString(),
                              is_active: staffService?.is_active || false
                            });
                            onFormChange({ ...formData, services: newServices });
                          }
                        }}
                        placeholder={finalPrice.toString()}
                        className="w-24 p-2 border border-gray-300 rounded-lg text-center"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-500">משך זמן (דקות):</label>
                      <input
                        type="number"
                        value={staffService?.duration ?? ''}
                        onChange={(e) => {
                          const newServices = formData.services.filter(s => s.id !== service.id);
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          if (value === '' || !isNaN(parseInt(value))) {
                            newServices.push({
                              id: service.id,
                              price: staffService?.price ?? finalPrice.toString(),
                              duration: value,
                              is_active: staffService?.is_active || false
                            });
                            onFormChange({ ...formData, services: newServices });
                          }
                        }}
                        placeholder={defaultDuration.toString()}
                        className="w-24 p-2 border border-gray-300 rounded-lg text-center"
                        min="5"
                        step="5"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`service_${service.id}`}
                      checked={staffService?.is_active || false}
                      onChange={(e) => {
                        const newServices = formData.services.filter(s => s.id !== service.id);
                        if (e.target.checked) {
                          newServices.push({
                            id: service.id,
                            price: staffService?.price ?? finalPrice.toString(),
                            duration: staffService?.duration ?? defaultDuration.toString(),
                            is_active: true
                          });
                        }
                        onFormChange({ ...formData, services: newServices });
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label
                      htmlFor={`service_${service.id}`}
                      className="text-sm font-medium text-gray-700"
                    >
                      פעיל
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          ביטול
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {isEditing ? 'עדכן' : 'הוסף'} איש צוות
        </button>
      </div>
    </motion.form>
  );
}

function isPromotionValid(promotion: any) {
  if (!promotion?.is_active) return false;
  
  const now = new Date().getTime();
  const startDate = promotion.start_date ? new Date(promotion.start_date).getTime() : null;
  const endDate = promotion.end_date ? new Date(promotion.end_date).getTime() : null;
  
  if (endDate && now > endDate) return false;
  if (startDate && now < startDate) return false;
  
  return true;
}

function calculateDiscountedPrice(price: number, promotion: any) {
  if (!promotion || !isPromotionValid(promotion)) return price;

  if (promotion.discount_type === 'percentage') {
    return price * (1 - promotion.discount_value / 100);
  } else {
    return price - promotion.discount_value;
  }
}