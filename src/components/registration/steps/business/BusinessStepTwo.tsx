import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Upload, Image as ImageIcon, FileText, Tag, X } from 'lucide-react';
import { useRegistration } from '../../../../contexts/registration/hooks';
import toast from 'react-hot-toast';

interface BusinessStepTwoProps {
  loading?: boolean;
}

const BUSINESS_TYPES = [
  { id: 'hair_salon', label: 'מספרה' },
  { id: 'beauty_salon', label: 'מכון יופי' },
  { id: 'nail_salon', label: 'מכון ציפורניים' },
  { id: 'spa', label: 'ספא' },
  { id: 'barber', label: 'ברבר שופ' },
  { id: 'cosmetics', label: 'קוסמטיקה' },
  { id: 'other', label: 'אחר' }
];

export function BusinessStepTwo({ loading }: BusinessStepTwoProps) {
  const { updateStep, getStepData } = useRegistration();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => {
    const savedData = getStepData(2);
    return {
      name: savedData?.name || '',
      type: savedData?.type || '',
      description: savedData?.description || '',
      address: savedData?.address || '',
      logo: null as File | null
    };
  });
  const [errors, setErrors] = useState({
    name: '',
    type: '',
    description: '',
    address: '',
    logo: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setErrors(prev => ({ ...prev, logo: 'הקובץ גדול מדי (מקסימום 5MB)' }));
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, logo: 'ניתן להעלות רק קבצי תמונה' }));
        return;
      }

      setFormData(prev => ({ ...prev, logo: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrors(prev => ({ ...prev, logo: '' }));
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    setFormData(prev => ({ ...prev, logo: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: '',
      type: '',
      description: '',
      address: '',
      logo: ''
    };

    // בדיקת שם העסק
    if (!formData.name) {
      newErrors.name = 'שדה חובה';
    } else if (formData.name.length < 2) {
      newErrors.name = 'שם העסק חייב להכיל לפחות 2 תווים';
    } else if (formData.name.length > 50) {
      newErrors.name = 'שם העסק לא יכול להכיל יותר מ-50 תווים';
    }

    // בדיקת סוג העסק
    if (!formData.type) {
      newErrors.type = 'שדה חובה';
    }

    // בדיקת תיאור (אופציונלי אבל עם מגבלת אורך)
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'התיאור לא יכול להכיל יותר מ-500 תווים';
    }

    // בדיקת כתובת (אופציונלי)
    if (formData.address && formData.address.length > 100) {
      newErrors.address = 'הכתובת לא יכולה להכיל יותר מ-100 תווים';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || loading) return;

    try {
      await updateStep(2, formData);
      toast.success('פרטי העסק נשמרו בהצלחה! ממשיך לשלב הבא...');
    } catch (error: any) {
      console.error('Error in step 2:', error);
      toast.error(error.message || 'שגיאה בשמירת פרטי העסק');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* שם העסק */}
        <div>
          <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
            שם העסק
          </label>
          <div className="relative mt-1">
            <input
              type="text"
              id="business-name"
              value={formData.name}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, name: e.target.value }));
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
              placeholder="הזן את שם העסק"
            />
            <Building2 className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.name ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* סוג העסק */}
        <div>
          <label htmlFor="business-type" className="block text-sm font-medium text-gray-700">
            סוג העסק
          </label>
          <div className="relative mt-1">
            <select
              id="business-type"
              value={formData.type}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, type: e.target.value }));
                if (errors.type) setErrors(prev => ({ ...prev, type: '' }));
              }}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.type ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors appearance-none`}
            >
              <option value="">בחר סוג עסק</option>
              {BUSINESS_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            <Tag className={`absolute top-1/2 right-3 -translate-y-1/2 h-5 w-5 ${
              errors.type ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.type && (
            <p className="mt-1 text-sm text-red-600">{errors.type}</p>
          )}
        </div>

        {/* לוגו העסק */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            לוגו העסק
            <span className="text-gray-500 text-xs mr-1">(אופציונלי)</span>
          </label>
          <div className="mt-1">
            {previewUrl ? (
              <div className="relative inline-block">
                <img
                  src={previewUrl}
                  alt="תצוגה מקדימה"
                  className="h-32 w-32 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors cursor-pointer"
              >
                <div className="space-y-1 text-center">
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
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
                  <p className="text-xs text-gray-500">PNG, JPG עד 5MB</p>
                </div>
              </div>
            )}
            {errors.logo && (
              <p className="mt-1 text-sm text-red-600">{errors.logo}</p>
            )}
          </div>
        </div>

        {/* תיאור העסק */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            תיאור העסק
            <span className="text-gray-500 text-xs mr-1">(אופציונלי)</span>
          </label>
          <div className="relative mt-1">
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, description: e.target.value }));
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
              rows={4}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none`}
              placeholder="ספר לנו קצת על העסק שלך..."
            />
            <FileText className={`absolute top-3 right-3 h-5 w-5 ${
              errors.description ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            התיאור יוצג ללקוחות בדף ההזמנות ובפרופיל העסק
          </p>
        </div>

        {/* כתובת העסק */}
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            כתובת העסק
            <span className="text-gray-500 text-xs mr-1">(אופציונלי)</span>
          </label>
          <div className="relative mt-1">
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, address: e.target.value }));
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              rows={2}
              className={`block w-full pl-3 pr-10 py-3 text-right border ${
                errors.address ? 'border-red-300' : 'border-gray-300'
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors resize-none`}
              placeholder="הזן את כתובת העסק המלאה"
            />
            <MapPin className={`absolute top-3 right-3 h-5 w-5 ${
              errors.address ? 'text-red-400' : 'text-gray-400'
            }`} />
          </div>
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address}</p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            הכתובת תוצג ללקוחות בדף ההזמנות ובפרופיל העסק
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <motion.button
          type="submit"
          disabled={loading}
          className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'המשך לשלב הבא'
          )}
        </motion.button>
      </div>
    </form>
  );
}