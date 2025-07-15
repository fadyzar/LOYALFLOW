import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Star, 
  Diamond, 
  Award, 
  Save, 
  Power, 
  HelpCircle 
} from 'lucide-react';

interface LevelBenefits {
  services_discount: number;
  products_discount: number;
  free_appointment_every: number | null;
  birthday_appointment: boolean;
}

interface SettingsFormProps {
  settings: {
    enabled?: boolean;
    points: {
      per_visit: number;
      per_referral: number;
      per_amount: number;
      expiration_days: number;
    };
    diamonds: {
      per_consecutive_visits: number;
      consecutive_visits_required: number;
      per_amount: number;
    };
    levels: {
      silver: {
        diamonds_required: number;
        benefits: LevelBenefits;
      };
      gold: {
        diamonds_required: number;
        benefits: LevelBenefits;
      };
      diamond: {
        diamonds_required: number;
        benefits: LevelBenefits;
      };
      vip: {
        diamonds_required: number;
        benefits: LevelBenefits;
      };
    };
  };
  onSave: (settings: any) => Promise<void>;
}

const DEFAULT_BENEFITS: LevelBenefits = {
  services_discount: 0,
  products_discount: 0,
  free_appointment_every: null,
  birthday_appointment: false
};

export function SettingsForm({ settings, onSave }: SettingsFormProps) {
  const [formData, setFormData] = useState({
    enabled: settings.enabled ?? true,
    points: settings.points,
    diamonds: settings.diamonds,
    levels: settings.levels
  });
  const [saving, setSaving] = useState(false);
  const [editingLevel, setEditingLevel] = useState<string | null>(null);

  // עדכון הנתונים כאשר ה-props משתנים
  useEffect(() => {
    console.log('Settings prop changed:', settings);
    setFormData({
      enabled: settings.enabled ?? true,
      points: settings.points,
      diamonds: settings.diamonds,
      levels: settings.levels
    });
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted', formData);
    
    if (saving) {
      console.log('Already saving, ignoring submit');
      return;
    }

    try {
      console.log('Setting saving state to true');
      setSaving(true);
      console.log('Calling onSave with formData:', formData);
      await onSave(formData);
      console.log('onSave completed successfully');
    } catch (error) {
      console.error('Error in handleSubmit:', error);
    } finally {
      console.log('Setting saving state to false');
      setSaving(false);
    }
  };

  const renderLevelSettings = (level: keyof typeof formData.levels, title: string) => (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{title}</h3>
        <button
          type="button"
          onClick={() => setEditingLevel(editingLevel === level ? null : level)}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          {editingLevel === level ? 'סגור' : 'ערוך הטבות'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            כמה יהלומים נדרשים למעמד זה
          </label>
          {level === 'silver' ? (
            <>
              <input
                type="number"
                value={0}
                disabled
                className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                min="0"
              />
              <span className="text-xs text-gray-400 mt-1 block">ערך קבוע: 0</span>
            </>
          ) : (
            <input
              type="number"
              value={formData.levels[level].diamonds_required}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                levels: {
                  ...prev.levels,
                  [level]: {
                    ...prev.levels[level],
                    diamonds_required: parseInt(e.target.value)
                  }
                }
              }))}
              className="w-full p-2 border border-gray-300 rounded-lg"
              min="0"
            />
          )}
        </div>

        {editingLevel === level && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הנחה קבועה לשירותים (%)
              </label>
              <input
                type="number"
                value={formData.levels[level].benefits.services_discount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  levels: {
                    ...prev.levels,
                    [level]: {
                      ...prev.levels[level],
                      benefits: {
                        ...prev.levels[level].benefits,
                        services_discount: parseInt(e.target.value)
                      }
                    }
                  }
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                הנחה קבועה למוצרים (%)
              </label>
              <input
                type="number"
                value={formData.levels[level].benefits.products_discount}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  levels: {
                    ...prev.levels,
                    [level]: {
                      ...prev.levels[level],
                      benefits: {
                        ...prev.levels[level].benefits,
                        products_discount: parseInt(e.target.value)
                      }
                    }
                  }
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                תור חינם כל X תורים
              </label>
              <input
                type="number"
                value={formData.levels[level].benefits.free_appointment_every || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  levels: {
                    ...prev.levels,
                    [level]: {
                      ...prev.levels[level],
                      benefits: {
                        ...prev.levels[level].benefits,
                        free_appointment_every: e.target.value ? parseInt(e.target.value) : null
                      }
                    }
                  }
                }))}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="1"
                placeholder="לא פעיל"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.levels[level].benefits.birthday_appointment}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    levels: {
                      ...prev.levels,
                      [level]: {
                        ...prev.levels[level],
                        benefits: {
                          ...prev.levels[level].benefits,
                          birthday_appointment: e.target.checked
                        }
                      }
                    }
                  }))}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm">הטבת תור חינם ביום הולדת</span>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6" id="loyalty-settings-form">
      {/* Enable/Disable Switch */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Power className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">מערכת נאמנות</h2>
              <p className="text-sm text-gray-500">הפעל או כבה את מערכת הנאמנות</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData.enabled}
              onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {formData.enabled && (
        <>
          {/* Points Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-amber-50 rounded-xl">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold">נקודות</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  נקודות לכל ביקור
                </label>
                <input
                  type="number"
                  value={formData.points.per_visit}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    points: { ...prev.points, per_visit: parseInt(e.target.value) }
                  }))}
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
                  value={formData.points.per_amount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    points: { ...prev.points, per_amount: parseInt(e.target.value) }
                  }))}
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
                  value={formData.points.expiration_days}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    points: { ...prev.points, expiration_days: parseInt(e.target.value) }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Diamonds Settings */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Diamond className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-lg font-semibold">יהלומים</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  יהלומים לביקורים רצופים
                </label>
                <input
                  type="number"
                  value={formData.diamonds.per_consecutive_visits}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    diamonds: { ...prev.diamonds, per_consecutive_visits: parseInt(e.target.value) }
                  }))}
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
                  value={formData.diamonds.consecutive_visits_required}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    diamonds: { ...prev.diamonds, consecutive_visits_required: parseInt(e.target.value) }
                  }))}
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
                  value={formData.diamonds.per_amount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    diamonds: { ...prev.diamonds, per_amount: parseInt(e.target.value) }
                  }))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Loyalty Levels */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-50 rounded-xl">
                <Award className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">רמות נאמנות</h2>
                <p className="text-sm text-gray-500">הגדר את ההטבות לכל רמת נאמנות</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {renderLevelSettings('silver', 'רמת כסף')}
              {renderLevelSettings('gold', 'רמת זהב')}
              {renderLevelSettings('diamond', 'רמת יהלום')}
              {renderLevelSettings('vip', 'רמת VIP')}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <motion.button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {saving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>שומר...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>שמור הגדרות</span>
            </>
          )}
        </motion.button>
      </div>
    </form>
  );
}