import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/auth/hooks';
import { supabase } from '../../../lib/supabase';
import { DayHours } from './components/DayHours';
import { BreakFormModal } from './components/BreakFormModal';
import { SpecialDateCard } from './components/SpecialDateCard';
import { SpecialDateFormModal } from './components/SpecialDateFormModal';
import { DAYS, DEFAULT_BREAK, DEFAULT_SPECIAL_DATE } from './constants';
import { BusinessHoursData } from './types';
import { validateBreaks } from './utils/validation';
import { useUnsavedChanges } from './hooks/useUnsavedChanges';
import toast from 'react-hot-toast';

function BusinessHoursPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hours, setHours] = useState<BusinessHoursData | null>(null);
  const [showBreakForm, setShowBreakForm] = useState(false);
  const [showSpecialDateForm, setShowSpecialDateForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [breakFormData, setBreakFormData] = useState(DEFAULT_BREAK);
  const [specialDateFormData, setSpecialDateFormData] = useState(DEFAULT_SPECIAL_DATE);
  const { hasUnsavedChanges, setHasUnsavedChanges } = useUnsavedChanges();

  useEffect(() => {
    if (user?.id) {
      loadBusinessHours();
    }
  }, [user?.id]);

  const loadBusinessHours = async () => {
    try {
      setError(null);
      setLoading(true);

      // קודם נמצא את ה-business_id של המשתמש
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user?.id)
        .single();

      if (userError || !userData?.business_id) {
        throw new Error('לא נמצא עסק מקושר');
      }

      // כעת נטען את שעות הפעילות
      const { data, error } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', userData.business_id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // אם אין נתונים, ניצור ברירת מחדל
          const defaultHours: Partial<BusinessHoursData> = {
            business_id: userData.business_id,
            regular_hours: DAYS.reduce((acc, day) => ({
              ...acc,
              [day.key]: {
                is_active: day.id !== 6, // שבת לא פעיל כברירת מחדל
                start_time: '09:00',
                end_time: '17:00',
                breaks: []
              }
            }), {}),
            special_dates: []
          };

          const { data: newData, error: insertError } = await supabase
            .from('business_hours')
            .insert([defaultHours])
            .select()
            .single();

          if (insertError) throw insertError;
          setHours(newData);
        } else {
          throw error;
        }
      } else {
        setHours(data);
      }
    } catch (error: any) {
      console.error('Error loading business hours:', error);
      setError(error.message || 'שגיאה בטעינת שעות הפעילות');
      toast.error('שגיאה בטעינת שעות הפעילות');
    } finally {
      setLoading(false);
    }
  };

  const handleHoursChange = (dayKey: string, field: string, value: any) => {
    if (!hours) return;

    console.log(`Updating ${dayKey} ${field} to:`, value);

    const updatedHours = {
      ...hours,
      regular_hours: {
        ...hours.regular_hours,
        [dayKey]: {
          ...hours.regular_hours[dayKey],
          [field]: value
        }
      }
    };

    console.log('Updated hours:', updatedHours);
    setHours(updatedHours);
    setHasUnsavedChanges(true);
  };

  const handleAddBreak = () => {
    if (!selectedDay || !hours) return;

    const dayKey = DAYS[selectedDay].key;
    const dayHours = hours.regular_hours[dayKey];

    const validationError = validateBreaks(
      [...(dayHours.breaks || []), breakFormData],
      dayHours.start_time,
      dayHours.end_time
    );

    if (validationError) {
      toast.error(validationError);
      return;
    }

    const updatedHours = {
      ...hours,
      regular_hours: {
        ...hours.regular_hours,
        [dayKey]: {
          ...dayHours,
          breaks: [...(dayHours.breaks || []), {
            ...breakFormData,
            id: crypto.randomUUID()
          }]
        }
      }
    };

    setHours(updatedHours);
    setShowBreakForm(false);
    setBreakFormData(DEFAULT_BREAK);
    setSelectedDay(null);
    setHasUnsavedChanges(true);
  };

  const handleDeleteBreak = (dayKey: string, breakId: string) => {
    if (!hours) return;

    const dayHours = hours.regular_hours[dayKey];
    if (!dayHours?.breaks) return;

    const updatedHours = {
      ...hours,
      regular_hours: {
        ...hours.regular_hours,
        [dayKey]: {
          ...dayHours,
          breaks: dayHours.breaks.filter(b => b.id !== breakId)
        }
      }
    };

    setHours(updatedHours);
    setHasUnsavedChanges(true);
  };

  const handleAddSpecialDate = () => {
    if (!hours) return;

    const updatedHours = {
      ...hours,
      special_dates: [
        ...(hours.special_dates || []),
        {
          ...specialDateFormData,
          id: crypto.randomUUID()
        }
      ]
    };

    setHours(updatedHours);
    setShowSpecialDateForm(false);
    setSpecialDateFormData(DEFAULT_SPECIAL_DATE);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSpecialDate = (id: string) => {
    if (!hours) return;

    const updatedHours = {
      ...hours,
      special_dates: (hours.special_dates || []).filter(date => date.id !== id)
    };

    setHours(updatedHours);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!hours || !user?.id || isSaving) {
      console.log('Save conditions not met:', {
        hasHours: !!hours,
        hasUserId: !!user?.id,
        isSaving
      });
      return;
    }

    try {
      setIsSaving(true);
      console.log('Starting save with hours:', hours);

      // קודם נוודא שיש לנו business_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.business_id) {
        throw new Error('לא נמצא עסק מקושר');
      }

      // וודא שיש את כל השדות הנדרשים
      const dataToSave = {
        id: hours.id,
        business_id: userData.business_id,
        regular_hours: hours.regular_hours,
        special_dates: hours.special_dates || []
      };

      console.log('Saving data:', dataToSave);

      const { data, error } = await supabase
        .from('business_hours')
        .upsert(dataToSave)
        .select()
        .single();

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      console.log('Save successful:', data);
      toast.success('שעות הפעילות נשמרו בהצלחה');
      setHasUnsavedChanges(false);
      
      // רענן את הנתונים מהשרת
      await loadBusinessHours();
    } catch (error: any) {
      console.error('Error in handleSave:', error);
      toast.error(error.message || 'שגיאה בשמירת שעות הפעילות');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] pb-24">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 pb-24">
        <div className="text-red-600 font-medium">{error}</div>
        <button
          onClick={loadBusinessHours}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 -mx-4 px-4">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Link to="/settings" className="text-gray-500 hover:text-gray-700">
              <ArrowRight className="h-6 w-6" />
            </Link>
            <h1 className="text-2xl font-bold">שעות פעילות</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            className={`px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? 'שומר...' : 'שמור שינויים'}
          </motion.button>
        </div>
      </div>

      <div className="space-y-4">
        {DAYS.map((day) => {
          const dayHours = hours?.regular_hours[day.key];
          if (!dayHours) return null;

          return (
            <DayHours
              key={day.id}
              dayName={day.name}
              hours={dayHours}
              breaks={dayHours.breaks || []}
              onHoursChange={(field, value) => handleHoursChange(day.key, field, value)}
              onAddBreak={() => {
                setSelectedDay(day.id);
                setShowBreakForm(true);
              }}
              onDeleteBreak={(breakId) => handleDeleteBreak(day.key, breakId)}
            />
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl">
              <Clock className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold">ימים מיוחדים</h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowSpecialDateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            הוסף יום מיוחד
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(hours?.special_dates || []).map((date) => (
            <SpecialDateCard
              key={date.id}
              date={date}
              onDelete={handleDeleteSpecialDate}
            />
          ))}
        </div>

        {(!hours?.special_dates || hours.special_dates.length === 0) && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              לא הוגדרו ימים מיוחדים
            </p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showBreakForm && (
          <BreakFormModal
            startTime={breakFormData.start_time}
            endTime={breakFormData.end_time}
            onStartTimeChange={(value) => setBreakFormData({ ...breakFormData, start_time: value })}
            onEndTimeChange={(value) => setBreakFormData({ ...breakFormData, end_time: value })}
            onClose={() => {
              setShowBreakForm(false);
              setSelectedDay(null);
              setBreakFormData(DEFAULT_BREAK);
            }}
            onSubmit={handleAddBreak}
          />
        )}

        {showSpecialDateForm && (
          <SpecialDateFormModal
            formData={specialDateFormData}
            onFormChange={setSpecialDateFormData}
            onClose={() => {
              setShowSpecialDateForm(false);
              setSpecialDateFormData(DEFAULT_SPECIAL_DATE);
            }}
            onSubmit={handleAddSpecialDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default BusinessHoursPage;