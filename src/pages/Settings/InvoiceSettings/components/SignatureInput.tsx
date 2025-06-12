import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import toast from 'react-hot-toast';

interface SignatureInputProps {
  businessId: string;
  value: string | null;
  onChange: (url: string | null) => void;
}

export const SignatureInput = forwardRef<
  { file: File | null; uploadSignature: () => Promise<string | null> },
  SignatureInputProps
>(({ businessId, value, onChange }, ref) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const [file, setFile] = useState<File | null>(null);

  // עדכון התצוגה המקדימה כשמשתנה הערך
  useEffect(() => {
    setPreviewUrl(value);
  }, [value]);

  // חשיפת הפונקציות והמשתנים לקומפוננטת האב
  useImperativeHandle(ref, () => ({
    file,
    uploadSignature: async () => {
      if (!file) return null;

      try {
        setLoading(true);

        // מחיקת חתימה קיימת אם יש
        if (value) {
          const oldPath = value.split('/').pop();
          if (oldPath) {
            await supabase.storage
              .from('signatures')
              .remove([`${businessId}/${oldPath}`]);
          }
        }

        // העלאת החתימה החדשה
        const fileExt = file.name.split('.').pop();
        const fileName = `signature_${Date.now()}.${fileExt}`;
        const filePath = `${businessId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('signatures')
          .getPublicUrl(filePath);

        return data.publicUrl;
      } catch (error) {
        console.error('Error uploading signature:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    }
  }));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 2 * 1024 * 1024) {
      toast.error('גודל הקובץ חייב להיות עד 2MB');
      return;
    }

    if (!selectedFile.type.startsWith('image/')) {
      toast.error('ניתן להעלות רק קבצי תמונה');
      return;
    }

    // שמירת הקובץ ב-state
    setFile(selectedFile);

    // יצירת תצוגה מקדימה
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    // קריאה ל-onChange עם null כדי לציין שיש שינוי שצריך לשמור
    onChange(null);
  };

  const handleRemove = async () => {
    try {
      setLoading(true);

      if (value) {
        const oldPath = value.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('signatures')
            .remove([`${businessId}/${oldPath}`]);
        }
      }

      setPreviewUrl(null);
      setFile(null);
      onChange(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('החתימה הוסרה בהצלחה');
    } catch (error) {
      console.error('Error removing signature:', error);
      toast.error('שגיאה בהסרת החתימה');
      setPreviewUrl(value);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <div className="relative inline-block">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <img
              src={previewUrl}
              alt="חתימה"
              className="max-h-32 w-auto object-contain"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRemove}
            disabled={loading}
            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors cursor-pointer bg-gray-50"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
          />
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900">העלה תמונה של חתימה</p>
            <p className="text-sm text-gray-500">PNG, JPG עד 2MB</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
});