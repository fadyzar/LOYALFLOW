import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, X } from 'lucide-react';
import { useRegistration } from '../../../../contexts/registration/hooks';
import toast from 'react-hot-toast';

interface BusinessStepThreeProps {
  loading?: boolean;
}

interface Break {
  id: string;
  startTime: string;
  endTime: string;
}

interface DayHours {
  isActive: boolean;
  startTime: string;
  endTime: string;
  breaks: Break[];
}

const DAYS = [
  { id: 'sunday', name: 'ראשון' },
  { id: 'monday', name: 'שני' },
  { id: 'tuesday', name: 'שלישי' },
  { id: 'wednesday', name: 'רביעי' },
  { id: 'thursday', name: 'חמישי' },
  { id: 'friday', name: 'שישי' },
  { id: 'saturday', name: 'שבת' }
];

export function BusinessStepThree({ loading }: BusinessStepThreeProps) {
  const { updateStep, getStepData } = useRegistration();
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [breakFormData, setBreakFormData] = useState({
    startTime: '12:00',
    endTime: '13:00'
  });
  const [formData, setFormData] = useState<{ [key: string]: DayHours }>(() => {
    const savedData = getStepData(3)?.hours || {};
    const defaultHours = {
      startTime: '09:00',
      endTime: '17:00',
      breaks: []
    };

    return DAYS.reduce((acc, day) => ({
      ...acc,
      [day.id]: savedData[day.id] || {
        ...defaultHours,
        isActive: day.id !== 'saturday' // שבת לא פעיל כברירת מחדל
      }
    }), {});
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateBreaks = (dayId: string, breaks: Break[]): string | null => {
    const dayHours = formData[dayId];
    const dayStart = timeToMinutes(dayHours.startTime);
    const dayEnd = timeToMinutes(dayHours.endTime);

    // מיון ההפסקות לפי זמן התחלה
    const sortedBreaks = [...breaks].sort((a, b) => 
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    let lastEndTime = dayStart;

    for (const breakItem of sortedBreaks) {
      const breakStart = timeToMinutes(breakItem.startTime);
      const breakEnd = timeToMinutes(breakItem.endTime);

      // בדיקה שההפסקה בתוך שעות העבודה
      if (breakStart < dayStart || breakEnd > dayEnd) {
        return 'הפסקה חייבת להיות בתוך שעות העבודה';
      }

      // בדיקה שההפסקה מתחילה לפני שהיא נגמרת
      if (breakStart >= breakEnd) {
        return 'שעת התחלה של הפסקה חייבת להיות לפני שעת הסיום';
      }

      // בדיקת חפיפה עם הפסקה קודמת
      if (breakStart < lastEndTime) {
        return 'הפסקות לא יכולות לחפוף';
      }

      lastEndTime = breakEnd;
    }

    return null;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    for (const day of DAYS) {
      const dayHours = formData[day.id];
      if (!dayHours.isActive) continue;

      // בדיקת שעות עבודה
      const startMinutes = timeToMinutes(dayHours.startTime);
      const endMinutes = timeToMinutes(dayHours.endTime);

      if (startMinutes >= endMinutes) {
        newErrors[day.id] = 'שעת התחלה חייבת להיות לפני שעת הסיום';
        continue;
      }

      // בדיקת הפסקות
      const breakError = validateBreaks(day.id, dayHours.breaks);
      if (breakError) {
        newErrors[day.id] = breakError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBreak = () => {
    if (!selectedDay) return;

    const dayHours = formData[selectedDay];
    const breakError = validateBreaks(selectedDay, [
      ...dayHours.breaks,
      { id: crypto.randomUUID(), ...breakFormData }
    ]);

    if (breakError) {
      setErrors(prev => ({ ...prev, [selectedDay]: breakError }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [selectedDay]: {
        ...prev[selectedDay],
        breaks: [
          ...prev[selectedDay].breaks,
          { id: crypto.randomUUID(), ...breakFormData }
        ]
      }
    }));

    setShowBreakForm(false);
    setSelectedDay(null);
    setBreakFormData({ startTime: '12:00', endTime: '13:00' });
    setErrors(prev => ({ ...prev, [selectedDay]: '' }));
  };

  const handleDeleteBreak = (dayId: string, breakId: string) => {
    setFormData(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        breaks: prev[dayId].breaks.filter(b => b.id !== breakId)
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || loading) return;

    try {
      await updateStep(3, { hours: formData });
      toast.success('שעות הפעילות נשמרו בהצלחה! ממשיך לשלב הבא...');
    } catch (error: any) {
      console.error('Error in step 3:', error);
      toast.error(error.message || 'שגיאה בשמירת שעות הפעילות');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayHours = formData[day.id];

          return (
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl overflow-hidden transition-all ${
                dayHours.isActive ? 'shadow-md' : 'shadow-sm opacity-75'
              }`}
            >
              {/* Header */}
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center justify-between flex-1">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={dayHours.isActive}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            [day.id]: {
                              ...prev[day.id],
                              isActive: e.target.checked
                            }
                          }));
                          if (errors[day.id]) {
                            setErrors(prev => ({ ...prev, [day.id]: '' }));
                          }
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <div>
                      <h3 className="font-medium text-lg">{day.name}</h3>
                    </div>
                  </div>
                </div>

                {/* Desktop Time Inputs */}
                <div className="hidden sm:flex items-center gap-4">
                  {dayHours.isActive && (
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={dayHours.startTime}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            [day.id]: {
                              ...prev[day.id],
                              startTime: e.target.value
                            }
                          }));
                          if (errors[day.id]) {
                            setErrors(prev => ({ ...prev, [day.id]: '' }));
                          }
                        }}
                      />
                      <span className="text-gray-500">עד</span>
                      <input
                        type="time"
                        className="w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        value={dayHours.endTime}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev,
                            [day.id]: {
                              ...prev[day.id],
                              endTime: e.target.value
                            }
                          }));
                          if (errors[day.id]) {
                            setErrors(prev => ({ ...prev, [day.id]: '' }));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Time Inputs & Breaks */}
              {dayHours.isActive && (
                <div className="border-t border-gray-100">
                  {/* Mobile Time Inputs */}
                  <div className="p-4 sm:hidden bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          שעת פתיחה
                        </label>
                        <input
                          type="time"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={dayHours.startTime}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [day.id]: {
                                ...prev[day.id],
                                startTime: e.target.value
                              }
                            }));
                            if (errors[day.id]) {
                              setErrors(prev => ({ ...prev, [day.id]: '' }));
                            }
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          שעת סגירה
                        </label>
                        <input
                          type="time"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          value={dayHours.endTime}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              [day.id]: {
                                ...prev[day.id],
                                endTime: e.target.value
                              }
                            }));
                            if (errors[day.id]) {
                              setErrors(prev => ({ ...prev, [day.id]: '' }));
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Breaks */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">הפסקות</h4>
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedDay(day.id);
                          setShowBreakForm(true);
                        }}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4" />
                        הוסף הפסקה
                      </motion.button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dayHours.breaks.map((breakItem) => (
                        <motion.div
                          key={breakItem.id}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-200 transition-colors"
                        >
                          <div className="relative flex items-center justify-between p-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 rounded-lg">
                                <Clock className="h-4 w-4 text-indigo-600" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{breakItem.startTime}</span>
                                  <span className="text-gray-400">-</span>
                                  <span className="font-medium">{breakItem.endTime}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBreak(day.id, breakItem.id)}
                              className="text-sm text-red-500 hover:text-red-600 hover:underline"
                            >
                              הסר
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {dayHours.breaks.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500">
                          לא הוגדרו הפסקות ליום זה
                        </p>
                      </div>
                    )}
                  </div>

                  {errors[day.id] && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-red-600">{errors[day.id]}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Break Form Modal */}
      <AnimatePresence>
        {showBreakForm && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" 
              onClick={() => {
                setShowBreakForm(false);
                setSelectedDay(null);
              }}
            />
            
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl p-6 w-full max-w-md relative"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-medium mb-4">הוספת הפסקה</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שעת התחלה
                    </label>
                    <div className="relative">
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={breakFormData.startTime}
                        onChange={(e) => setBreakFormData(prev => ({
                          ...prev,
                          startTime: e.target.value
                        }))}
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שעת סיום
                    </label>
                    <div className="relative">
                      <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="time"
                        value={breakFormData.endTime}
                        onChange={(e) => setBreakFormData(prev => ({
                          ...prev,
                          endTime: e.target.value
                        }))}
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowBreakForm(false);
                      setSelectedDay(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                  >
                    ביטול
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddBreak}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    הוסף
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

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