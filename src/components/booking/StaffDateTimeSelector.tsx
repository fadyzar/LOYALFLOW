import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, isSameDay, isAfter, startOfDay, addMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Clock, User, ArrowRight } from 'lucide-react';
import { useAvailableStaff } from '../../hooks/useAvailableStaff';
import { useServices } from '../../hooks/useServices';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface StaffDateTimeSelectorProps {
  businessId: string;
  selectedDate: Date;
  selectedTime: string;
  selectedStaffId: string;
  serviceId: string;
  onChange: (date: Date, time: string, staffId: string) => void;
  onBack?: () => void;
}

export function StaffDateTimeSelector({ 
  businessId,
  selectedDate, 
  selectedTime, 
  selectedStaffId,
  serviceId, 
  onChange,
  onBack
}: StaffDateTimeSelectorProps) {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const { availableStaff, loading } = useAvailableStaff(serviceId, businessId);
  const { services } = useServices(businessId);
  const [staffHours, setStaffHours] = useState<any>(null);
  const [loadingHours, setLoadingHours] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // יצירת מערך של 14 ימים קדימה מהיום
  const today = startOfDay(new Date());
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  // Get service duration
  const selectedService = services.find(s => s.id === serviceId);
  const durationMatch = selectedService?.duration.match(/(\d+):(\d+):(\d+)/);
  const serviceDurationMinutes = durationMatch 
    ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2])
    : 30;

  useEffect(() => {
    if (!selectedStaffId || !businessId) return;

    const loadStaffHours = async () => {
      try {
        setLoadingHours(true);

        const dayOfWeek = currentDate.getDay();
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[dayOfWeek];
        const dateStr = format(currentDate, 'yyyy-MM-dd');

        // Load staff hours
        const { data: staffHoursData, error: staffHoursError } = await supabase
          .from('staff_hours')
          .select('*')
          .eq('staff_id', selectedStaffId)
          .maybeSingle();

        if (staffHoursError && staffHoursError.code !== 'PGRST116') {
          throw staffHoursError;
        }

        // Load business hours as fallback
        const { data: businessHours, error: businessHoursError } = await supabase
          .from('business_hours')
          .select('*')
          .eq('business_id', businessId)
          .single();

        if (businessHoursError) throw businessHoursError;

        // Get working hours
        let workingHours;
        let breaks: any[] = [];

        // Check staff hours first
        if (staffHoursData) {
          const dayHours = staffHoursData.regular_hours?.[dayName];
          if (dayHours) {
            workingHours = {
              is_active: dayHours.is_active,
              start_time: dayHours.start_time,
              end_time: dayHours.end_time
            };
            breaks = dayHours.breaks || [];
          }

          // Check for special date
          const specialDate = staffHoursData.special_dates?.find(d => d.date === dateStr);
          if (specialDate) {
            workingHours = {
              is_active: !specialDate.is_closed,
              start_time: specialDate.start_time,
              end_time: specialDate.end_time
            };
            breaks = [];
          }
        }

        // Fallback to business hours
        if (!workingHours && businessHours) {
          const dayHours = businessHours.regular_hours[dayName];
          if (dayHours) {
            workingHours = {
              is_active: dayHours.is_active,
              start_time: dayHours.start_time,
              end_time: dayHours.end_time
            };
            breaks = dayHours.breaks || [];
          }

          // Check for special date
          const specialDate = businessHours.special_dates?.find(d => d.date === dateStr);
          if (specialDate) {
            workingHours = {
              is_active: !specialDate.is_closed,
              start_time: specialDate.start_time,
              end_time: specialDate.end_time
            };
            breaks = [];
          }
        }

        // Default hours if nothing else found
        if (!workingHours) {
          workingHours = {
            is_active: dayName !== 'saturday',
            start_time: '09:00',
            end_time: '20:00'
          };
        }

        // טעינת תורים ליום הנבחר
        const startOfDayDate = startOfDay(new Date(dateStr));
        const endOfDayDate = addDays(startOfDayDate, 1);

        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('*')
          .eq('business_id', businessId)
          .eq('staff_id', selectedStaffId)
          .gte('start_time', startOfDayDate.toISOString())
          .lt('start_time', endOfDayDate.toISOString())
          .in('status', ['booked', 'confirmed']);

        if (appointmentsError) throw appointmentsError;

        // המרת התורים לפורמט פשוט יותר
        const appointments = (appointmentsData || []).map(apt => ({
          start: format(new Date(apt.start_time), 'HH:mm'),
          end: format(new Date(apt.end_time), 'HH:mm')
        }));

        setStaffHours({
          workingHours,
          breaks,
          appointments
        });

      } catch (error) {
        console.error('Error loading staff hours:', error);
        toast.error('שגיאה בטעינת שעות העבודה');
      } finally {
        setLoadingHours(false);
      }
    };

    loadStaffHours();
  }, [selectedStaffId, currentDate, businessId]);

  const isTimeInBreak = (time: Date, breaks: any[] = []) => {
  return breaks.some(breakItem => {
    const [breakStartHours, breakStartMinutes] = breakItem.start_time?.split(':') || [0, 0];
    const [breakEndHours, breakEndMinutes] = breakItem.end_time?.split(':') || [0, 0];
      
      const breakStart = new Date(time);
      breakStart.setHours(breakStartHours, breakStartMinutes, 0, 0);
      
      const breakEnd = new Date(time);
      breakEnd.setHours(breakEndHours, breakEndMinutes, 0, 0);
      
      return time >= breakStart && time < breakEnd;
    });
  };

  const isTimeAvailable = (time: Date, staff: any) => {
    // בדיקה אם הזמן בתוך שעות העבודה
    const [startHours, startMinutes] = staff.workingHours.start_time.split(':').map(Number);
    const [endHours, endMinutes] = staff.workingHours.end_time.split(':').map(Number);
    
    const workStart = new Date(time);
    workStart.setHours(startHours, startMinutes, 0, 0);
    
    const workEnd = new Date(time);
    workEnd.setHours(endHours, endMinutes, 0, 0);
    
    // חישוב זמן סיום התור
    const appointmentEnd = addMinutes(time, serviceDurationMinutes);
    
    // בדיקה שהתור מתחיל בשעות העבודה ומסתיים לפני סוף יום העבודה
    if (time < workStart || appointmentEnd > workEnd) {
      return false;
    }

    // בדיקת חפיפה עם תורים קיימים
    return !staff.appointments.some((apt: any) => {
      const aptStart = new Date(time);
      aptStart.setHours(parseInt(apt.start.split(':')[0]), parseInt(apt.start.split(':')[1]), 0, 0);
      
      const aptEnd = new Date(time);
      aptEnd.setHours(parseInt(apt.end.split(':')[0]), parseInt(apt.end.split(':')[1]), 0, 0);
      
      const aptEndWithRest = addMinutes(aptEnd, staff.settings?.rest_time || 0);

      return (
        (time >= aptStart && time < aptEndWithRest) ||
        (appointmentEnd > aptStart && appointmentEnd <= aptEndWithRest) ||
        (time <= aptStart && appointmentEnd >= aptEndWithRest)
      );
    });
  };

  const getAvailableTimeSlots = (staff: any) => {
  if (
    !staff?.workingHours?.is_active ||
    typeof staff?.workingHours?.start_time !== 'string' ||
    typeof staff?.workingHours?.end_time !== 'string'
  ) {
    return [];
  }

  const slots: { time: Date; available: boolean; isBreak: boolean }[] = [];
  const processedTimes = new Set<string>();

  const [startHours, startMinutes] = staff.workingHours.start_time.split(':').map(Number);
  const [endHours, endMinutes] = staff.workingHours.end_time.split(':').map(Number);

  let currentTime = new Date(currentDate);
  currentTime.setHours(startHours, startMinutes, 0, 0);

  const endTime = new Date(currentDate);
  endTime.setHours(endHours, endMinutes, 0, 0);

  while (currentTime <= endTime) {
    const timeStr = format(currentTime, 'HH:mm');

    if (!processedTimes.has(timeStr)) {
      const isBreakTime = isTimeInBreak(currentTime, staff.breaks || []);
      const isAvailable = isTimeAvailable(currentTime, staff);
      const appointmentEnd = addMinutes(currentTime, serviceDurationMinutes);
      const hasEnoughTime = appointmentEnd <= endTime;

      if ((isAvailable || isBreakTime) && hasEnoughTime) {
        slots.push({
          time: new Date(currentTime),
          available: isAvailable,
          isBreak: isBreakTime
        });
        processedTimes.add(timeStr);
      }
    }

    currentTime = addMinutes(currentTime, 20);
  }

  return slots;
};

  // סינון שעות שעברו
  const filterPassedTimes = (slots: { time: Date; available: boolean; isBreak: boolean }[]) => {
    if (!isSameDay(currentDate, today)) return slots;
    const now = new Date();
    return slots.filter(slot => isAfter(slot.time, now));
  };

  if (loading || loadingHours) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!availableStaff || availableStaff.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">לא נמצאו אנשי צוות זמינים</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {onBack && (
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowRight className="h-5 w-5" />
            <span>חזרה לבחירת שירות</span>
          </button>
        </div>
      )}

      {/* Staff Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {availableStaff.map((staff) => (
          <motion.button
            key={staff.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (selectedStaffId === staff.id) {
                onChange(selectedDate, '', '');
              } else {
                onChange(selectedDate, '', staff.id);
              }
            }}
            className={`w-full flex items-center gap-4 p-4 rounded-xl text-right transition-colors ${
              selectedStaffId === staff.id
                ? 'bg-indigo-50 border-2 border-indigo-600'
                : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
            }`}
          >
            {staff.profile_image_url ? (
              <img
                src={staff.profile_image_url}
                alt={staff.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
            )}
            <div className="flex-1 flex items-center justify-between">
              <div>
                <h3 className="font-medium">{staff.name}</h3>
                {staff.title && (
                  <p className="text-sm text-gray-500">{staff.title}</p>
                )}
              </div>
              <div className="text-left">
                <p className="font-medium text-indigo-600">₪{staff.price}</p>
                <p className="text-sm text-gray-500">{staff.duration} דקות</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Date and Time Selection */}
      <AnimatePresence>
        {selectedStaffId && staffHours && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Date Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentDate(prev => addDays(prev, -7))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {days.map((day) => (
                    <motion.button
                      key={day.toISOString()}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setCurrentDate(day);
                        onChange(day, '', selectedStaffId);
                      }}
                      className={`flex-shrink-0 flex flex-col items-center p-3 rounded-xl transition-colors ${
                        isSameDay(day, currentDate)
                          ? 'bg-indigo-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xs font-medium">
                        {format(day, 'EEEE', { locale: he }).replace('יום ', '')}
                      </span>
                      <span className="text-base font-bold mt-0.5">
                        {format(day, 'd', { locale: he })}
                      </span>
                      <span className="text-xs mt-0.5">
                        {format(day, 'MMM', { locale: he })}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Time Slots */}
            <div className="space-y-4">
              {availableStaff
                .filter(staff => staff.id === selectedStaffId)
                .map(staff => {
                  const availableSlots = filterPassedTimes(getAvailableTimeSlots({
                    ...staff,
                    workingHours: staffHours?.workingHours,
                    breaks: staffHours?.breaks,
                    appointments: staffHours?.appointments || []
                  }));
                  
                  if (availableSlots.length === 0) {
                    return (
                      <div key={staff.id} className="text-center py-8">
                        <p className="text-gray-500">אין שעות פנויות ביום זה</p>
                      </div>
                    );
                  }

                  return (
                    <div key={staff.id} className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((slot) => (
                        <motion.button
                          key={slot.time.toISOString()}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onChange(currentDate, format(slot.time, 'HH:mm'), staff.id)}
                          disabled={!slot.available && !slot.isBreak}
                          className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-colors ${
                            selectedTime === format(slot.time, 'HH:mm')
                              ? 'bg-indigo-600 text-white'
                              : slot.isBreak
                              ? 'bg-yellow-50/40 hover:bg-yellow-100/60 relative before:absolute before:inset-0 before:bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_8px,#fde68a_8px,#fde68a_16px)] before:opacity-40 before:rounded-xl'
                              : slot.available
                              ? 'bg-gray-50 hover:bg-gray-100'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <Clock className="h-4 w-4" />
                          <span>{format(slot.time, 'HH:mm')}</span>
                        </motion.button>
                      ))}
                    </div>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}