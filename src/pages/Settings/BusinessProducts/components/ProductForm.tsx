import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Tag, Upload, X, Package, Barcode } from 'lucide-react';
import { ProductFormData, ProductPromotion } from '../types';

interface ProductFormProps {
  formData: ProductFormData;
  onFormChange: (data: ProductFormData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing: boolean;
  existingImageUrl?: string;
}

export function ProductForm({ formData, onFormChange, onSubmit, onCancel, isEditing, existingImageUrl }: ProductFormProps) {
  const [showPromotion, setShowPromotion] = useState(!!formData.promotion);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
      onFormChange({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onFormChange({ ...formData, image: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePromotionChange = (field: keyof ProductPromotion, value: any) => {
    const updatedPromotion = {
      ...(formData.promotion || {
        is_active: true,
        discount_type: 'percentage',
        discount_value: 10
      }),
      [field]: value
    } as ProductPromotion;

    onFormChange({
      ...formData,
      promotion: updatedPromotion
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
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            שם המוצר
          </label>
          <input
            type="text"
            value={formData.name_he}
            onChange={(e) => onFormChange({ ...formData, name_he: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מק"ט
          </label>
          <input
            type="text"
            value={formData.sku}
            onChange={(e) => onFormChange({ ...formData, sku: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ברקוד
          </label>
          <input
            type="text"
            value={formData.barcode}
            onChange={(e) => onFormChange({ ...formData, barcode: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            מחיר
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => onFormChange({ ...formData, price: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כמות במלאי
          </label>
          <input
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => onFormChange({ ...formData, stock_quantity: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כמות מינימום במלאי
          </label>
          <input
            type="number"
            value={formData.min_stock_quantity}
            onChange={(e) => onFormChange({ ...formData, min_stock_quantity: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            required
            min="0"
          />
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            <span>תמונה</span>
          </div>
        </label>
        {previewUrl ? (
          <div className="relative">
            <img
              src={previewUrl}
              alt="תצוגה מקדימה"
              className="h-32 w-auto rounded-lg"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
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

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          תיאור
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
          placeholder="תיאור אופציונלי של המוצר"
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 h-24"
        />
      </div>

      {/* Promotion */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tag className="h-4 w-4" />
            <span>מבצע</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setShowPromotion(!showPromotion);
              if (!showPromotion) {
                onFormChange({
                  ...formData,
                  promotion: {
                    is_active: true,
                    discount_type: 'percentage',
                    discount_value: 10
                  }
                });
              } else {
                onFormChange({
                  ...formData,
                  promotion: undefined
                });
              }
            }}
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            {showPromotion ? 'בטל מבצע' : 'הוסף מבצע'}
          </button>
        </div>

        {showPromotion && formData.promotion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white rounded-lg border border-gray-200"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                סוג הנחה
              </label>
              <select
                value={formData.promotion.discount_type}
                onChange={(e) => handlePromotionChange('discount_type', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="percentage">אחוז הנחה</option>
                <option value="fixed">סכום קבוע</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ערך ההנחה
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.promotion.discount_value}
                  onChange={(e) => handlePromotionChange('discount_value', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="0"
                  step={formData.promotion.discount_type === 'percentage' ? '1' : '0.01'}
                  max={formData.promotion.discount_type === 'percentage' ? '100' : undefined}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {formData.promotion.discount_type === 'percentage' ? '%' : '₪'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={formData.promotion.start_date || ''}
                onChange={(e) => handlePromotionChange('start_date', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תאריך סיום
              </label>
              <input
                type="date"
                value={formData.promotion.end_date || ''}
                onChange={(e) => handlePromotionChange('end_date', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </motion.div>
        )}
      </div>

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
          {isEditing ? 'עדכן' : 'הוסף'} מוצר
        </button>
      </div>
    </motion.form>
  );
}