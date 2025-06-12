import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Star, 
  Diamond, 
  Calendar,
  Award,
  Users,
  DollarSign,
  X,
  Save
} from 'lucide-react';
import { Database } from '../../../lib/database.types';
import toast from 'react-hot-toast';

type Business = Database['public']['Tables']['businesses']['Row'];

interface LoyaltySettingsProps {
  business: Business;
  onClose: () => void;
  onSave: (settings: any) => Promise<void>;
}

export function LoyaltySettings({ business, onClose, onSave }: LoyaltySettingsProps) {
  const [settings, setSettings] = useState({
    points: {
      per_visit: 10,
      per_referral: 50,
      per_amount: 5, // נקודות לכל 100 ש"ח
      expiration_days: 365
    },
    diamonds: {
      per_consecutive_visits: 1,
      consecutive_visits_required: 3,
      per_referral: 2,
      per_amount: 1, // יהלום לכל 500 ש"ח
      special_dates: 2
    },
    levels: {
      silver: 10,
      gold: 20,
      diamond: 30,
      vip: 50
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(settings);
      toast.success('הגדרות הנאמנות נשמרו בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error saving loyalty settings:', error);
      toast.error('שגיאה בשמירת ההגדרות');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-lg max-h-[90vh] overflow-y-auto"
    >
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings  className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">הגדרות תוכנית נאמנות</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Points Settings */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            נקודות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                נקודות לכל ביקור
              </label>
              <input
                type="number"
                value={settings.points.per_visit}
                onChange={(e) => setSettings({
                  ...settings,
                  points: {
                    ...settings.points,
                    per_visit: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                נקודות להמלצת חבר
              </label>
              <input
                type="number"
                value={settings.points.per_referral}
                onChange={(e) => setSettings({
                  ...settings,
                  points: {
                    ...settings.points,
                    per_referral: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                נקודות לכל 100 ש"ח
              </label>
              <input
                type="number"
                value={settings.points.per_amount}
                onChange={(e) => setSettings({
                  ...settings,
                  points: {
                    ...settings.points,
                    per_amount: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תוקף נקודות (בימים)
              </label>
              <input
                type="number"
                value={settings.points.expiration_days}
                onChange={(e) => setSettings({
                  ...settings,
                  points: {
                    ...settings.points,
                    expiration_days: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Diamonds Settings */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Diamond className="h-5 w-5 text-blue-500" />
            יהלומים
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לביקורים רצופים
              </label>
              <input
                type="number"
                value={settings.diamonds.per_consecutive_visits}
                onChange={(e) => setSettings({
                  ...settings,
                  diamonds: {
                    ...settings.diamonds,
                    per_consecutive_visits: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                מספר ביקורים רצופים נדרש
              </label>
              <input
                type="number"
                value={settings.diamonds.consecutive_visits_required}
                onChange={(e) => setSettings({
                  ...settings,
                  diamonds: {
                    ...settings.diamonds,
                    consecutive_visits_required: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים להמלצת חבר
              </label>
              <input
                type="number"
                value={settings.diamonds.per_referral}
                onChange={(e) => setSettings({
                  ...settings,
                  diamonds: {
                    ...settings.diamonds,
                    per_referral: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לכל 500 ש"ח
              </label>
              <input
                type="number"
                value={settings.diamonds.per_amount}
                onChange={(e) => setSettings({
                  ...settings,
                  diamonds: {
                    ...settings.diamonds,
                    per_amount: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Levels Settings */}
        <div>
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            רמות נאמנות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לרמת כסף
              </label>
              <input
                type="number"
                value={settings.levels.silver}
                onChange={(e) => setSettings({
                  ...settings,
                  levels: {
                    ...settings.levels,
                    silver: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לרמת זהב
              </label>
              <input
                type="number"
                value={settings.levels.gold}
                onChange={(e) => setSettings({
                  ...settings,
                  levels: {
                    ...settings.levels,
                    gold: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לרמת יהלום
              </label>
              <input
                type="number"
                value={settings.levels.diamond}
                onChange={(e) => setSettings({
                  ...settings,
                  levels: {
                    ...settings.levels,
                    diamond: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                יהלומים לרמת VIP
              </label>
              <input
                type="number"
                value={settings.levels.vip}
                onChange={(e) => setSettings({
                  ...settings,
                  levels: {
                    ...settings.levels,
                    vip: parseInt(e.target.value)
                  }
                })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 border-t pt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ביטול
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Save className="h-5 w-5" />
            שמור הגדרות
          </button>
        </div>
      </form>
    </motion.div>
  );
}