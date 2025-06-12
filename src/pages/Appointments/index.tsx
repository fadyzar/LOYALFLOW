import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, addHours, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../contexts/auth/hooks';
import { supabase } from '../../lib/supabase';
import { DayView } from '../../components/appointments/DayView';
import { AppointmentDetails } from '../../components/appointments/DayView/components/AppointmentDetails';
import { NewAppointmentFlow } from '../../components/appointments/NewAppointmentFlow';
import toast from 'react-hot-toast';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  customer_name: string;
  service_name: string;
  staff_id: string;
  status: string;
  metadata?: {
    paid?: boolean;
    invoice_id?: string;
    duration?: number;
    price?: number;
  };
}

interface AppointmentData {
  id: string;
  start_time: string;
  end_time: string;
  staff_id: string;
  status: string;
  metadata?: {
    paid?: boolean;
    invoice_id?: string;
    duration?: number;
    price?: number;
  };
  customers?: {
    name: string;
    phone: string;
  };
  services?: {
    name: string;
    name_he: string;
    duration: number;
  };
  users?: {
    name: string;
  };
}

export default function Appointments() {
  const { user, business, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; staffId: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCurrentTime, setShowCurrentTime] = useState(false);
  const [appointmentsChannel, setAppointmentsChannel] = useState<any>(null);

  const days = Array.from({ length: 5 }, (_, i) => addDays(selectedDate, i - 2));

  const fetchAppointments = useCallback(async (id: string | null) => {
    if (!id) return;
    
      setLoadingAppointments(true);
    try {
      const startDateTime = addHours(startOfDay(selectedDate), -2);
      const endDateTime = addHours(endOfDay(selectedDate), -2);

      let query = supabase
        .from('appointments')
        .select(`
          *,
          customers (
            name,
            phone
          ),
          services (
            name,
            name_he,
            duration
          ),
          users (
            name
          )
        `)
        .eq('business_id', id)
        .gte('start_time', startDateTime.toISOString())
        .lt('start_time', endDateTime.toISOString());

      if (selectedStaff !== 'all') {
        query = query.eq('staff_id', selectedStaff);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const transformedData = data?.map(apt => ({
        ...apt,
        customer_name: apt.customers?.name,
        customer_phone: apt.customers?.phone,
        service_name: apt.services?.name_he,
        staff_name: apt.users?.name,
        service_duration: apt.metadata?.duration,
        service_price: apt.metadata?.price
      })) || [];

      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    // Get business ID from local storage
    const storedBusinessId = localStorage.getItem('businessId');
    if (storedBusinessId) {
      setBusinessId(storedBusinessId);
    }

    // Initial fetch
    fetchAppointments(businessId);

    // Set up real-time subscription
    const subscription = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `business_id=eq.${businessId}`,
        },
        () => {
          fetchAppointments(businessId);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [businessId, fetchAppointments]);

  const fetchStaff = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          role,
          title,
          profile_image_url,
          settings
        `)
        .eq('business_id', id)
        .in('role', ['staff', 'admin'])
        .order('created_at');
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        const { data: adminData, error: adminError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('business_id', id)
          .eq('role', 'admin')
          .single();

        if (adminError) throw adminError;
        setStaff([adminData]);
      } else {
        setStaff(data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }
  }, []);

  const loadData = useCallback(async (id: string) => {
    try {
      setLoadingAppointments(true);
      await Promise.all([
        fetchAppointments(id),
        fetchStaff(id)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoadingAppointments(false);
    }
  }, [fetchAppointments, fetchStaff]);

  useEffect(() => {
    const initializeData = async () => {
      if (authLoading) return;

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        let id = business?.id;

        if (!id) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          id = userData?.business_id;
        }

        if (!id) {
          throw new Error('לא נמצא עסק מקושר');
        }

        setBusinessId(id);
        await loadData(id);
      } catch (error: any) {
        console.error('Error initializing data:', error);
        toast.error(error.message || 'שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user?.id, business?.id, authLoading, loadData]);

  useEffect(() => {
    if (businessId && !loading) {
      fetchAppointments(businessId);
    }
  }, [selectedDate, selectedStaff, businessId, loading, fetchAppointments]);

  // עדכון הצגת השעה הנוכחית
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTime(now);
      setShowCurrentTime(isSameDay(selectedDate, now));
    };

    // עדכון ראשוני
    updateCurrentTime();

    // עדכון כל דקה
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDateChange = (date: Date) => {
    console.log('Changing date to:', format(date, 'yyyy-MM-dd'));
    setSelectedDate(date);
  };

  const handleGoToToday = () => {
    handleDateChange(new Date());
  };

  const handleTimeSlotClick = (date: Date, staffId: string) => {
    setSelectedTimeSlot({ date, staffId });
    setShowNewForm(true);
  };

  const handleAppointmentUpdate = useCallback((payload: Partial<Appointment>) => {
    // ... existing code ...
  }, []);

  const handleStatusChange = useCallback((status: string) => {
    // ... existing code ...
  }, []);

  const handleAppointmentClick = useCallback((apt: Appointment) => {
    // ... existing code ...
  }, []);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!businessId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">לא נמצא עסק מקושר</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex-none">
        {/* Days Selection */}
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors relative"
              >
                <Calendar className="h-4 w-4" />
                {showDatePicker && (
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => {
                      const date = parseISO(e.target.value);
                      handleDateChange(date);
                      setShowDatePicker(false);
                    }}
                    className="absolute top-full left-0 mt-1 p-2 border border-gray-200 rounded-lg shadow-lg bg-white"
                    style={{ zIndex: 50 }}
                    autoFocus
                    onBlur={() => setShowDatePicker(false)}
                  />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToToday}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                היום
              </motion.button>
            </div>

            <div className="flex items-center gap-1 flex-1 justify-center">
              <button
                onClick={() => handleDateChange(subDays(selectedDate, 1))}
                className="p-1 text-gray-400 hover:text-gray-600 z-10"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {days.map((day) => (
                  <motion.button
                    key={day.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDateChange(day)}
                    className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                      isSameDay(day, selectedDate)
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
                onClick={() => handleDateChange(addDays(selectedDate, 1))}
                className="p-1 text-gray-400 hover:text-gray-600 z-10"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden relative">
        {loadingAppointments ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DayView
            selectedDate={selectedDate}
            appointments={appointments}
            staff={staff}
            onAppointmentClick={setSelectedAppointment}
            onTimeSlotClick={handleTimeSlotClick}
            showCurrentTime={showCurrentTime}
            currentTime={currentTime}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedAppointment && (
          <AppointmentDetails
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onUpdate={() => {
              if (selectedAppointment.start_time) {
                setSelectedDate(new Date(selectedAppointment.start_time));
              }
              loadData(businessId);
            }}
          />
        )}

        {showNewForm && (
          <NewAppointmentFlow
            onClose={() => {
              setShowNewForm(false);
              setSelectedTimeSlot(null);
            }}
            onSuccess={() => {
              setShowNewForm(false);
              setSelectedTimeSlot(null);
              loadData(businessId);
            }}
            initialDate={selectedTimeSlot?.date}
            initialStaffId={selectedTimeSlot?.staffId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}