import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar,
  Clock,
  User,
  Scissors,
  Ban,
  Check,
  AlertTriangle,
  UserX,
  Timer,
  Phone,
  History,
  DollarSign
} from 'lucide-react';
import { format, parseISO, differenceInMinutes, setHours, setMinutes, setYear, setMonth, setDate } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/auth/hooks';
import { useAppointmentStatus } from '../../../../hooks/useAppointmentStatus';
import toast from 'react-hot-toast';
import { normalizeForStorage, normalizeDate, localToUtc } from '../../../../utils/date';
import { isValidPhoneNumber } from '../../../../utils/validation'; // Assume you have or add this util

interface StaffMember {
  id: string;
  name: string;
  role: string;
  business_id: string;
  price?: number;
}

interface StaffData {
  id: string;
  name: string;
  business_id: string;
  role: string;
}

interface PriceData {
  staff_id: string;
  price: number;
}

interface Appointment {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  staff_id: string;
  staff_name: string;
  service_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  duration: number;
  metadata?: {
    notes?: string;
    price?: number;
  };
  // הוסף את השדות הבאים כדי לתמוך ב-relations מה-join
  customers?: {
    id: string;
    name: string;
    phone: string;
    // ...הוסף כאן שדות רלוונטיים נוספים אם צריך
  };
  services?: {
    id: string;
    name_he: string;
    duration: number;
    price?: number; 
    // ...הוסף כאן שדות רלוונטיים נוספים אם צריך
  };
  users?: {
    id: string;
    name: string;
    // ...הוסף כאן שדות רלוונטיים נוספים אם צריך
  };
}

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: (updated?: Appointment) => void; // <-- עדכון כאן
}

interface StaffResponse {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  business_id: string;
  created_at: string;
  updated_at: string;
  price: number;
}

interface Service {
  id: string;
  name_he: string;
  duration: number;
  price?: number;
}

interface PendingChanges {
  date?: string;
  time?: string;
  staff_id?: string;
  staff_name?: string;
  service_id?: string;
  service_name?: string;
  customer_phone?: string;
  duration?: number;
}

export function AppointmentDetails({ appointment, onClose, onUpdate }: AppointmentDetailsProps) {
  const { user } = useAuth();
  const { updateAppointmentStatus, loading: statusLoading } = useAppointmentStatus();
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [editingTime, setEditingTime] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedTime, setSelectedTime] = useState(format(parseISO(appointment.start_time), 'HH:mm'));
  const [selectedDate, setSelectedDate] = useState(appointment.start_time.split('T')[0]);
  const [editingService, setEditingService] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState(appointment.duration);
  const [selectedEndTime, setSelectedEndTime] = useState<string | null>(null);

  // הוסף סטייט חדש למידע הכי עדכני של התור
  const [currentAppointment, setCurrentAppointment] = useState<Appointment>(appointment);

  // בכל פעם שהתור מתחלף (modal חדש), אתחל את currentAppointment
  useEffect(() => {
    setCurrentAppointment(appointment);
    setSelectedTime(format(parseISO(appointment.start_time), 'HH:mm'));
    setSelectedDate(appointment.start_time.split('T')[0]);
    setDurationInput(appointment.duration ?? appointment.services?.duration ?? 0);
    setSelectedEndTime(null);
    // אפשר גם לאפס pendingChanges כאן אם אתה רוצה שהשדות יתאפסו אחרי עדכון
    // setPendingChanges({});
  }, [appointment]);

  // Calculate appointment duration in minutes
  const duration = useMemo(() => {
    const start = parseISO(currentAppointment.start_time);
    const end = parseISO(currentAppointment.end_time);
    return differenceInMinutes(end, start);
  }, [currentAppointment.start_time, currentAppointment.end_time]);

  // Load staff members
  useEffect(() => {
    const fetchStaffMembers = async () => {
      try {
        const { data: staffData, error: staffError } = await supabase
          .from('users')
          .select('id, name, business_id, role')
          .eq('business_id', appointment.business_id)
          .in('role', ['staff', 'admin']);

        if (staffError) {
          console.error('Error fetching staff:', staffError);
          toast.error('שגיאה בטעינת אנשי הצוות');
          return;
        }

        const { data: pricesData, error: pricesError } = await supabase
          .from('staff_services')
          .select('staff_id, price')
          .eq('service_id', appointment.service_id);

        if (pricesError) {
          console.error('Error fetching prices:', pricesError);
        }

        const staffWithPrices: StaffMember[] = (staffData as StaffData[]).map((staff) => {
          const priceInfo = (pricesData as PriceData[])?.find(p => p.staff_id === staff.id);
          return {
            ...staff,
            price: priceInfo?.price
          };
        });

        const sortedStaff = staffWithPrices.sort((a, b) => a.name.localeCompare(b.name));
        setStaffMembers(sortedStaff);
      } catch (error) {
        console.error('Error in fetchStaffMembers:', error);
        toast.error('שגיאה בטעינת אנשי הצוות');
      }
    };

    fetchStaffMembers();
  }, [appointment.business_id, appointment.service_id]);

  // Load services for the business
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('id, name_he, duration, price')
          .eq('business_id', appointment.business_id);

        if (error) throw error;
        setServices(data || []);
      } catch (error) {
        toast.error('שגיאה בטעינת השירותים');
      }
    };
    fetchServices();
  }, [appointment.business_id]);

  const handleTimeSelect = (newTime: string) => {
    // Ensure time is in 5-minute steps
    const [hours, minutes] = newTime.split(':').map(Number);
    const roundedMinutes = Math.round(minutes / 5) * 5;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
    setSelectedTime(formattedTime);
    setPendingChanges(prev => ({ ...prev, time: formattedTime }));
    // אל תסגור את עריכת השעה, תן למשתמש לעבור לשעת סיום
    // setEditingTime(false); <-- הסר שורה זו
    setTimeout(() => {
      const endTimeInput = document.getElementById('end-time-input');
      if (endTimeInput) {
        (endTimeInput as HTMLInputElement).focus();
      }
    }, 100);
    // אל תפתח את modal שמירת שינויים כאן
  };

  const handleDateSelect = (newDate: string) => {
    setPendingChanges(prev => ({ ...prev, date: newDate }));
    setEditingDate(false);
    setShowEditConfirm(true);
  };

  const handleStaffSelect = (staffId: string, staffName: string) => {
    setPendingChanges(prev => ({ ...prev, staff_id: staffId, staff_name: staffName }));
    setShowStaffSelector(false);
    setShowEditConfirm(true);
  };

  // Service select handler
  const handleServiceSelect = (service: Service) => {
    // ודא ש-duration הוא מספר ולא מחרוזת זמן
    let durationValue = service.duration;
    if (typeof durationValue === 'string') {
      // נסה להמיר מ-"00:30:00" למספר דקות
      const parts = durationValue.split(':').map(Number);
      durationValue = parts[0] * 60 + (parts[1] || 0);
    }
    setPendingChanges(prev => ({
      ...prev,
      service_id: service.id,
      service_name: service.name_he,
      duration: durationValue
    }));
    setEditingService(false);
    setShowEditConfirm(true);
  };

  // Duration edit handler
  const handleDurationSave = () => {
    const val = Number(durationInput);
    if (isNaN(val) || val <= 0) {
      toast.error('משך השירות חייב להיות מספר חיובי');
      return;
    }
    setPendingChanges(prev => ({ ...prev, duration: val }));
    setEditingDuration(false);
    setShowEditConfirm(true);
  };

  // שדה קלט שעת סיום (רק אם המשתמש בוחר)
  const handleEndTimeSelect = (newEndTime: string) => {
    setSelectedEndTime(newEndTime);
    setPendingChanges(prev => ({ ...prev, end_time: newEndTime }));
    setShowEditConfirm(true);
  };

  const handleSaveChanges = async () => {
    try {
      setLoading(true);

      // --- שינוי שעת התחלה/סיום ---
      if (pendingChanges.date || pendingChanges.time || pendingChanges.end_time) {
        const originalStart = parseISO(appointment.start_time);

        // קבע שעת התחלה חדשה
        let newStartDate = originalStart;
        if (pendingChanges.date || pendingChanges.time) {
          const year = pendingChanges.date
            ? Number(pendingChanges.date.split('-')[0])
            : originalStart.getUTCFullYear();
          const month = pendingChanges.date
            ? Number(pendingChanges.date.split('-')[1]) - 1
            : originalStart.getUTCMonth();
          const day = pendingChanges.date
            ? Number(pendingChanges.date.split('-')[2])
            : originalStart.getUTCDate();
          const hours = pendingChanges.time
            ? Number(pendingChanges.time.split(':')[0]) - 3
            : originalStart.getUTCHours();
          const minutes = pendingChanges.time
            ? Number(pendingChanges.time.split(':')[1])
            : originalStart.getUTCMinutes();
          // הגנה: אם אחד מהערכים NaN, אל תבנה תאריך לא חוקי
          if (
            !isNaN(year) && !isNaN(month) && !isNaN(day) &&
            !isNaN(hours) && !isNaN(minutes)
          ) {
            newStartDate = new Date(Date.UTC(year, month, day, hours, minutes));
          } else {
            toast.error('שעת התחלה או תאריך לא תקינים');
            setLoading(false);
            return;
          }
        }

        // קבע שעת סיום חדשה (אם נבחרה והיא תקינה), אחרת שמור את שעת הסיום המקורית
        let newEndDate: Date;
        const endTimeStr = selectedEndTime;
        if (
          endTimeStr &&
          typeof endTimeStr === 'string' &&
          /^\d{2}:\d{2}$/.test(endTimeStr)
        ) {
          const [endHours, endMinutes] = endTimeStr.split(':').map(Number);
          if (
            endHours !== undefined &&
            endMinutes !== undefined &&
            !isNaN(endHours) &&
            !isNaN(endMinutes)
          ) {
            newEndDate = new Date(Date.UTC(
              newStartDate.getUTCFullYear(),
              newStartDate.getUTCMonth(),
              newStartDate.getUTCDate(),
              endHours - 3,
              endMinutes
            ));
          } else {
            toast.error('שעת סיום לא תקינה');
            setLoading(false);
            return;
          }
        } else if (endTimeStr === '' || endTimeStr === null) {
          // אם המשתמש לא בחר שעת סיום, שמור את שעת הסיום המקורית (אל תחשב אוטומטית)
          newEndDate = parseISO(appointment.end_time);
        } else {
          toast.error('שעת סיום לא תקינה');
          setLoading(false);
          return;
        }

        // הגנה: אם newEndDate לא חוקי
        if (isNaN(newEndDate.getTime())) {
          toast.error('שעת סיום לא תקינה');
          setLoading(false);
          return;
        }

        // עדכן גם את משך התור לפי שעת סיום חדשה
        const newDuration = Math.round((newEndDate.getTime() - newStartDate.getTime()) / 60000);

        const formatUTC = (date: Date) => {
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00+0000`;
        };

        const { error: dateError } = await supabase
          .from('appointments')
          .update({
            start_time: formatUTC(newStartDate),
            end_time: formatUTC(newEndDate),
            duration: newDuration
          })
          .eq('id', appointment.id);

        if (dateError) throw dateError;

        // Log the changes separately
        if (pendingChanges.time) {
          const { error: timeLogError } = await supabase
            .from('appointment_logs')
            .insert({
              appointment_id: appointment.id,
              user_id: user?.id,
              action: 'time_change',
              details: {
                timestamp: new Date().toISOString(),
                user_name: user?.user_metadata?.name || user?.email,
                old_time: format(originalStart, 'HH:mm', { locale: he }),
                new_time: pendingChanges.time,
                reason: 'שינוי זמן תור'
              }
            });

          if (timeLogError) throw timeLogError;
        }

        if (pendingChanges.date) {
          const { error: dateLogError } = await supabase
            .from('appointment_logs')
            .insert({
              appointment_id: appointment.id,
              user_id: user?.id,
              action: 'time_change',
              details: {
                reason: 'שינוי זמן תור',
                new_time: format(parseISO(pendingChanges.date), 'd', { locale: he }),
                old_time: format(originalStart, 'd', { locale: he }),
                timestamp: new Date().toISOString(),
                user_name: user?.user_metadata?.name || user?.email
              }
            });

          if (dateLogError) throw dateLogError;
        }
      }

      if (pendingChanges.staff_id) {
        const { error: staffError } = await supabase
          .from('appointments')
          .update({
            staff_id: pendingChanges.staff_id
          })
          .eq('id', appointment.id);

        if (staffError) throw staffError;

        // Add log for staff change
        const { error: logError } = await supabase
          .from('appointment_logs')
          .insert({
            appointment_id: appointment.id,
            user_id: user?.id,
            action: 'staff_change',
            details: {
              timestamp: new Date().toISOString(),
              user_name: user?.user_metadata?.name || user?.email,
              old_staff: appointment.staff_name,
              new_staff: pendingChanges.staff_name,
              reason: 'שינוי איש צוות'
            }
          });

        if (logError) throw logError;
      }

      // Service change
      if (pendingChanges.service_id) {
        // ודא ש-duration הוא מספר ולא מחרוזת
        let durationValue = pendingChanges.duration;
        if (typeof durationValue === 'string') {
          const parts = durationValue.split(':').map(Number);
          durationValue = parts[0] * 60 + (parts[1] || 0);
        }
        const { error: serviceError } = await supabase
          .from('appointments')
          .update({
            service_id: pendingChanges.service_id,
            // עדכן גם את משך השירות אם יש
            ...(durationValue ? { duration: durationValue } : {})
          })
          .eq('id', appointment.id);

        if (serviceError) throw serviceError;

        // Log
        await supabase.from('appointment_logs').insert({
          appointment_id: appointment.id,
          user_id: user?.id,
          action: 'service_change',
          details: {
            timestamp: new Date().toISOString(),
            user_name: user?.user_metadata?.name || user?.email,
            old_service: appointment.services?.name_he || appointment.service_name,
            new_service: pendingChanges.service_name,
            reason: 'שינוי שירות'
          }
        });
      }

      // Phone change
      if (
        pendingChanges.customer_phone &&
        pendingChanges.customer_phone !== (appointment.customers?.phone || appointment.customer_phone) &&
        appointment.customers?.id // ודא שיש לקוח
      ) {
        const { error: phoneError } = await supabase
          .from('customers')
          .update({ phone: pendingChanges.customer_phone })
          .eq('id', appointment.customers.id);

        if (phoneError) throw phoneError;

        // Log
        await supabase.from('appointment_logs').insert({
          appointment_id: appointment.id,
          user_id: user?.id,
          action: 'phone_change',
          details: {
            timestamp: new Date().toISOString(),
            user_name: user?.user_metadata?.name || user?.email,
            old_phone: appointment.customers?.phone || appointment.customer_phone,
            new_phone: pendingChanges.customer_phone,
            reason: 'שינוי טלפון'
          }
        });
      }

      // Duration change
      if (pendingChanges.duration && pendingChanges.duration !== appointment.duration) {
        // Update appointment duration and end_time
        const start = parseISO(appointment.start_time);
        const newEnd = new Date(start.getTime() + pendingChanges.duration * 60000);
        const formatUTC = (date: Date) => {
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00+0000`;
        };
        const { error: durationError } = await supabase
          .from('appointments')
          .update({
            duration: pendingChanges.duration, // <-- ודא שזה מספר, לא מחרוזת!
            end_time: formatUTC(newEnd)
          })
          .eq('id', appointment.id);

        if (durationError) throw durationError;

        // Log
        await supabase.from('appointment_logs').insert({
          appointment_id: appointment.id,
          user_id: user?.id,
          action: 'duration_change',
          details: {
            timestamp: new Date().toISOString(),
            user_name: user?.user_metadata?.name || user?.email,
            old_duration: appointment.duration,
            new_duration: pendingChanges.duration,
            reason: 'שינוי משך שירות'
          }
        });
      }

      toast.success('התור עודכן בהצלחה');

      // שלוף מחדש את התור מה-DB כולל joins
      const { data: updated, error: fetchError } = await supabase
        .from('appointments')
        .select('*, customers(*), services(*)') // כאן services(*) כולל גם duration
        .eq('id', appointment.id)
        .single();

      if (!fetchError && updated) {
        setCurrentAppointment(updated);
        // עדכן גם את השדות התלויים (inputs) למידע הכי עדכני
        setSelectedTime(format(parseISO(updated.start_time), 'HH:mm'));
        setSelectedDate(updated.start_time.split('T')[0]);
        setDurationInput(updated.duration);
        onUpdate(updated); // <-- העבר את התור החדש ל-parent
      } else {
        onUpdate(); // fallback
      }

      setShowEditConfirm(false);
      setPendingChanges({});
      setSelectedEndTime(null); // אפס את שעת הסיום שנבחרה
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('שגיאה בעדכון התור');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    const success = await updateAppointmentStatus({
      appointmentId: appointment.id,
      newStatus: 'confirmed',
      reason: 'אישור ידני'
    });
    
    if (success) {
      onUpdate();
      onClose();
    }
  };

  const handleMarkCompleted = async () => {
    const success = await updateAppointmentStatus({
      appointmentId: appointment.id,
      newStatus: 'completed',
      reason: 'סימון ידני כהושלם'
    });
    
    if (success) {
      onUpdate();
      onClose();
    }
  };

  const handleMarkNoShow = async () => {
    const success = await updateAppointmentStatus({
      appointmentId: appointment.id,
      newStatus: 'no_show',
      reason: 'סימון ידני כלא הגיע'
    });
    
    if (success) {
      onUpdate();
      onClose();
    }
  };

  const handleMarkBooked = async () => {
    const success = await updateAppointmentStatus({
      appointmentId: appointment.id,
      newStatus: 'booked',
      reason: 'החזרה ידנית למצב המתנה'
    });
    
    if (success) {
      onUpdate();
      onClose();
    }
  };

  const handleCancel = async () => {
    const success = await updateAppointmentStatus({
      appointmentId: appointment.id,
      newStatus: 'canceled',
      reason: 'ביטול ידני'
    });
    
    if (success) {
      onUpdate();
      onClose();
    }
    
    setShowCancelConfirm(false);
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'booked':
        return 'ממתין לאישור';
      case 'confirmed':
        return 'מאושר';
      case 'completed':
        return 'הושלם';
      case 'no_show':
        return 'לא הגיע';
      case 'canceled':
        return 'בוטל';
      default:
        return status;
    }
  };

  // מחק את כל ה-useEffect שמאזינים ל-[appointment] או [appointment.id] או שמבצעים polling

  // הוסף useEffect שמאזין ל-currentAppointment.id ומבצע subscribe ל-realtime של Supabase (אם יש לך Supabase v2 ומעלה)
  useEffect(() => {
    // רענון ראשוני
    async function fetchAppointmentAndLogs() {
      const { data: appointmentData } = await supabase
        .from('appointments')
        .select('*, customers(*), services(*)')
        .eq('id', appointment.id)
        .single();
      if (appointmentData) {
        setCurrentAppointment(appointmentData);
        setSelectedTime(format(parseISO(appointmentData.start_time), 'HH:mm'));
        setSelectedDate(appointmentData.start_time.split('T')[0]);
        setDurationInput(appointmentData.duration ?? appointmentData.services?.duration ?? 0);
        setSelectedEndTime(null);
      }
      const { data: logsData } = await supabase
        .from('appointment_logs')
        .select('*')
        .eq('appointment_id', appointment.id)
        .order('created_at', { ascending: false });
      if (logsData) setLogs(logsData);
    }
    fetchAppointmentAndLogs();

    // Supabase realtime subscription (אם יש לך Supabase Realtime מופעל)
    const channel = supabase
      .channel('realtime-appointments-' + appointment.id)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `id=eq.${appointment.id}` },
        (payload) => {
          // כל שינוי בתור - שלוף מחדש
          fetchAppointmentAndLogs();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointment_logs', filter: `appointment_id=eq.${appointment.id}` },
        (payload) => {
          // כל שינוי בלוגים - שלוף מחדש
          fetchAppointmentAndLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointment.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" // <-- שים לב z-index גבוה
      style={{
        // טריק: אפשר גלילה תמידית על המודל (אם התוכן גבוה מהמסך)
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-y-auto" // <-- overflow-y-auto כאן
        style={{
          maxHeight: '90vh' // טריק: לא לאפשר למודל לחרוג מהמסך
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{currentAppointment.customers?.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  currentAppointment.status === 'booked' ? 'bg-yellow-100 text-yellow-800' :
                  currentAppointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  currentAppointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  currentAppointment.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getStatusText(currentAppointment.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Date */}
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setEditingDate(true)}
                >
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {editingDate ? (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      onBlur={() => handleDateSelect(selectedDate)}
                      className="w-32 p-1 border border-gray-300 rounded"
                      autoFocus
                    />
                  ) : (
                    <span>{format(parseISO(pendingChanges.date || currentAppointment.start_time), 'EEEE, d בMMMM', { locale: he })}</span>
                  )}
                </div>
                
                {/* Time */}
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setEditingTime(true)}
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  {editingTime ? (
                    <>
                      <input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        onBlur={() => handleTimeSelect(selectedTime)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const endTimeInput = document.getElementById('end-time-input');
                            if (endTimeInput) {
                              (endTimeInput as HTMLInputElement).focus();
                            }
                          }
                        }}
                        className="w-24 p-1 border border-gray-300 rounded"
                        autoFocus
                      />
                      <span className="mx-1">עד</span>
                      <input
                        id="end-time-input"
                        type="time"
                        value={selectedEndTime ?? ''}
                        onChange={(e) => setSelectedEndTime(e.target.value)}
                        onBlur={(e) => handleEndTimeSelect(e.target.value)}
                        className="w-24 p-1 border border-gray-300 rounded"
                        placeholder={format(parseISO(currentAppointment.end_time), 'HH:mm')}
                      />
                    </>
                  ) : (
                    <span>
                      {format(parseISO(currentAppointment.start_time), 'HH:mm', { locale: he })}
                      {' - '}
                      {format(parseISO(currentAppointment.end_time), 'HH:mm', { locale: he })}
                    </span>
                  )}
                </div>

                {/* Service */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setEditingService(true)}
                >
                  <Scissors className="h-4 w-4 text-gray-400" />
                  <span>
                    {pendingChanges.service_name ||
                      currentAppointment.services?.name_he ||
                      currentAppointment.service_name}
                  </span>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a
                    href={`tel:${currentAppointment.customers?.phone || currentAppointment.customer_phone}`}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    {currentAppointment.customers?.phone || currentAppointment.customer_phone}
                  </a>
                </div>

                {/* Staff */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setShowStaffSelector(true)}
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span>
                    {pendingChanges.staff_name ||
                      // נסה קודם users?.name, אם לא קיים עבור ל-staffMembers
                      currentAppointment.users?.name ||
                      staffMembers.find(s => s.id === currentAppointment.staff_id)?.name ||
                      currentAppointment.staff_name ||
                      ''}
                  </span>
                </div>

                {/* Duration */}
                <div
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setEditingDuration(true)}
                >
                  <Timer className="h-4 w-4 text-gray-400" />
                  {editingDuration ? (
                    <input
                      type="number"
                      min={1}
                      value={durationInput === 0 ? '' : durationInput}
                      onChange={(e) => {
                        // אם המשתמש מוחק הכל, תן ערך ריק (ולא 0)
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setDurationInput(val as any);
                      }}
                      onFocus={e => {
                        // בכניסה לשדה, סמן את כל הטקסט כדי שהמשתמש יוכל להקליד ישר
                        e.target.select();
                      }}
                      onBlur={handleDurationSave}
                      className="w-20 p-1 border border-gray-300 rounded text-right"
                      autoFocus
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  ) : (
                    <span>
                      {(() => {
                        if (pendingChanges.duration && pendingChanges.duration > 0) return pendingChanges.duration + ' דקות';
                        if (durationInput && durationInput > 0) return durationInput + ' דקות';
                        if (currentAppointment.duration && currentAppointment.duration > 0) return currentAppointment.duration + ' דקות';
                        if (currentAppointment.services?.duration && currentAppointment.services.duration > 0) return currentAppointment.services.duration + ' דקות';
                        if (currentAppointment.start_time && currentAppointment.end_time) {
                          const diff = differenceInMinutes(parseISO(currentAppointment.end_time), parseISO(currentAppointment.start_time));
                          if (diff > 0) return diff + ' דקות';
                        }
                        return '';
                      })()}
                    </span>
                  )}
                </div>

                {currentAppointment.metadata?.price && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span>₪{currentAppointment.metadata.price}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[300px] overflow-y-auto">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-gray-400" />
            <h3 className="font-medium">היסטוריית שינויים</h3>
          </div>
          
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <div className="w-20 text-gray-500">
                  {format(parseISO(log.created_at), 'HH:mm', { locale: he })}
                </div>
                <div className="flex-1">
                  {/* הצג את הלוגים בעברית בצורה ידידותית - רק הערך החדש */}
                  {(() => {
                    if (log.action === 'status_change') {
                      return (
                        <>
                          סטטוס התור הוחלף ל
                          <span className="font-bold"> {getStatusText(log.new_status)}</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                          {log.details.reason && (
                            <span className="text-gray-500"> ({log.details.reason})</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'time_change') {
                      return (
                        <>
                          שעת התור הוחלפה ל
                          <span className="font-bold"> {log.details.new_time}</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'staff_change') {
                      return (
                        <>
                          איש הצוות הוחלף ל
                          <span className="font-bold"> {log.details.new_staff}</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'service_change') {
                      return (
                        <>
                          השירות הוחלף ל
                          <span className="font-bold"> {log.details.new_service}</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'duration_change') {
                      return (
                        <>
                          משך השירות הוחלף ל
                          <span className="font-bold"> {log.details.new_duration} דקות</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'phone_change') {
                      return (
                        <>
                          טלפון הלקוח הוחלף ל
                          <span className="font-bold"> {log.details.new_phone}</span>
                          {log.details.user_name && (
                            <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                          )}
                        </>
                      );
                    }
                    if (log.action === 'loyalty_update') {
                      return (
                        <>
                          עדכון נאמנות: נוספו <span className="font-bold">{log.details.points_added}</span> נקודות
                          {log.details.diamonds_added > 0 && (
                            <span> ו־<span className="font-bold">{log.details.diamonds_added}</span> יהלומים</span>
                          )}
                          <span className="text-gray-500">
                            {' (סה"כ: '}
                            {log.details.total_points} נקודות, {log.details.total_diamonds} יהלומים)
                          </span>
                        </>
                      );
                    }
                    // ברירת מחדל - הצג את הפעולה כמו שהיא
                    return (
                      <span>
                        {log.action}
                        {log.details?.user_name && (
                          <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-end gap-2">
            {currentAppointment.status === 'booked' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={statusLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
              >
                <Check className="h-5 w-5" />
                <span>אשר תור</span>
              </motion.button>
            )}

            {currentAppointment.status === 'confirmed' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkNoShow}
                  disabled={statusLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 whitespace-nowrap"
                >
                  <UserX className="h-5 w-5" />
                  <span>לא הגיע</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkCompleted}
                  disabled={statusLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 whitespace-nowrap"
                >
                  <Check className="h-5 w-5" />
                  <span>הושלם</span>
                </motion.button>
              </>
            )}

            {(currentAppointment.status === 'completed' || currentAppointment.status === 'no_show') && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleMarkBooked}
                disabled={statusLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
              >
                <Calendar className="h-5 w-5" />
                <span>החזר למצב המתנה</span>
              </motion.button>
            )}

            {currentAppointment.status !== 'canceled' && currentAppointment.status !== 'no_show' && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCancelConfirm(true)}
                disabled={statusLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 whitespace-nowrap"
              >
                <Ban className="h-5 w-5" />
                <span>בטל תור</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Staff Selector Modal */}
        <AnimatePresence>
          {showStaffSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={() => setShowStaffSelector(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-lg p-4 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  {staffMembers.map((staff) => (
                    <motion.button
                      key={staff.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleStaffSelect(staff.id, staff.name)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium">{staff.name}</span>
                      {staff.price && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span>₪{staff.price}</span>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Service Selector Modal */}
        <AnimatePresence>
          {editingService && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={() => setEditingService(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-lg p-4 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-2">
                  {services.map((service) => (
                    <motion.button
                      key={service.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleServiceSelect(service)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium">{service.name_he}</span>
                      <span className="text-gray-500">{service.duration} דק'</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Confirmation Modal */}
        <AnimatePresence>
          {showEditConfirm && Object.keys(pendingChanges).length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowEditConfirm(false);
                  setPendingChanges({});
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">אישור שינויים</h3>
                
                <div className="space-y-4 mb-6">
                  {pendingChanges.date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">תאריך חדש:</div>
                        <div className="font-medium">{format(parseISO(pendingChanges.date), 'EEEE, d בMMMM yyyy', { locale: he })}</div>
                      </div>
                    </div>
                  )}
                  
                  {pendingChanges.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">שעה חדשה:</div>
                        <div className="font-medium">{pendingChanges.time}</div>
                      </div>
                    </div>
                  )}

                  {pendingChanges.staff_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">איש צוות חדש:</div>
                        <div className="font-medium">{pendingChanges.staff_name}</div>
                      </div>
                    </div>
                  )}

                  {pendingChanges.service_name && (
                    <div className="flex items-center gap-2">
                      <Scissors className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">שירות חדש:</div>
                        <div className="font-medium">{pendingChanges.service_name}</div>
                      </div>
                    </div>
                  )}

                  {pendingChanges.customer_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">טלפון חדש:</div>
                        <div className="font-medium">{pendingChanges.customer_phone}</div>
                      </div>
                    </div>
                  )}

                  {pendingChanges.duration !== undefined && (
                    <div className="flex items-center gap-2">
                      <Timer className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">משך שירות חדש:</div>
                        <div className="font-medium">{pendingChanges.duration} דקות</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowEditConfirm(false);
                      setPendingChanges({});
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveChanges}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>שומר...</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-5 w-5" />
                        <span>שמור שינויים</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Confirmation Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowCancelConfirm(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-white rounded-xl p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">אישור ביטול תור</h3>
                <p className="text-sm text-gray-500 mb-6">
                  האם אתה בטוח שברצונך לבטל את התור הזה? פעולה זו לא ניתן לשינוי.
                </p>

                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>מבצע ביטול...</span>
                      </>
                    ) : (
                      <>
                        <Ban className="h-5 w-5" />
                        <span>בטל תור</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}