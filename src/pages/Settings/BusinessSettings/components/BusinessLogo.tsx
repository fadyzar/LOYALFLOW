import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { Database } from '../../../../lib/database.types';
import toast from 'react-hot-toast';

type Business = Database['public']['Tables']['businesses']['Row'];

interface BusinessLogoProps {
  business: Business;
  onLogoChange: (logoUrl: string) => Promise<void>;
}

export function BusinessLogo({ business, onLogoChange }: BusinessLogoProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(business.logo_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('ניתן להעלות רק קבצי תמונה');
      return;
    }

    try {
      setUploading(true);

      // יצירת URL Preview מיד
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // מחיקת לוגו קיים אם יש
      if (business.logo_url) {
        const oldPath = business.logo_url.split('/').pop();
        if (oldPath) {
          const { error: removeError } = await supabase.storage
            .from('business_assets')
            .remove([`${business.id}/${oldPath}`]);

          if (removeError) {
            console.error('Error removing old logo:', removeError);
          }
        }
      }

      // העלאת הלוגו החדש
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}${Date.now()}.${fileExt}`;
      const filePath = `${business.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('business_assets')
        .getPublicUrl(filePath);

      // עדכון הלוגו בעסק
      await onLogoChange(data.publicUrl);
      toast.success('הלוגו הועלה בהצלחה');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(error.message || 'שגיאה בהעלאת הלוגו');
      
      // מחיקת ה-Preview במקרה של שגיאה
      setPreviewUrl(business.logo_url);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!business?.id || !business.logo_url) return;

    try {
      setUploading(true);

      // מחיקת הקובץ מהאחסון
      const oldPath = business.logo_url.split('/').pop();
      if (oldPath) {
        const { error: removeError } = await supabase.storage
          .from('business_assets')
          .remove([`${business.id}/${oldPath}`]);

        if (removeError) throw removeError;
      }

      // עדכון העסק
      await onLogoChange('');
      setPreviewUrl(null);
      toast.success('הלוגו הוסר בהצלחה');
    } catch (error: any) {
      console.error('Error removing logo:', error);
      toast.error(error.message || 'שגיאה בהסרת הלוגו');
      
      // החזרת ה-Preview במקרה של שגיאה
      setPreviewUrl(business.logo_url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          <span>לוגו העסק</span>
        </div>
      </label>

      <div className="bg-gray-50 p-4 rounded-xl">
        {previewUrl ? (
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="לוגו העסק"
              className="h-32 w-32 object-cover rounded-xl"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRemoveLogo}
              disabled={uploading}
              className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-indigo-500 transition-colors cursor-pointer"
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
                    disabled={uploading}
                  />
                </label>
                <p className="pr-1">או גרור לכאן</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG עד 5MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}