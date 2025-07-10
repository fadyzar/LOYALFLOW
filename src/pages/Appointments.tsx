import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays, isSameDay, startOfDay, endOfDay, addHours, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar, ChevronRight, ChevronLeft, BarChart2, Users, User, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';
import { DayView } from '../components/appointments/DayView';
import { AppointmentDetails } from '../components/appointments/DayView/components/AppointmentDetails';
import { NewAppointmentFlow } from '../components/appointments/NewAppointmentFlow';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';


interface AppointmentWithRelations {
  id: string;
  start_time: string;
  end_time: string;
  staff_id: string;
  service_id: string;
  status: string;
  users?: {
    id: string;
    name: string;
  };
  services?: {
    id: string;
    name: string;
    price: number;
  };
}

interface StatsData {
  daily: {
    total: number;
    completed: number;
    revenue: number;
  };
  weekly: {
    total: number;
    completed: number;
    revenue: number;
  };
  monthly: {
    total: number;
    completed: number;
    revenue: number;
  };
  byStaff?: Record<string, {
    name: string;
    daily: { total: number; completed: number; revenue: number; };
    weekly: { total: number; completed: number; revenue: number; };
    monthly: { total: number; completed: number; revenue: number; };
  }>;
}

function Appointments() {
  const { user, business, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedStaff, setSelectedStaff] = useState<string | 'all'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; staffId: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCurrentTime, setShowCurrentTime] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [showAllStaff, setShowAllStaff] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const days = Array.from({ length: 5 }, (_, i) => addDays(selectedDate, i - 2));

  const fetchAppointments = useCallback(async (id: string) => {
    try {
      setLoadingAppointments(true);
      console.log('Fetching appointments for date:', format(selectedDate, 'yyyy-MM-dd'));
      
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
      
      const transformedData = data?.map((apt: AppointmentWithRelations) => ({
        ...apt,
        customer_name: apt.users?.name,
        service_name: apt.services?.name
      })) || [];

      console.log('Fetched appointments:', transformedData);
      setAppointments(transformedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedDate, selectedStaff]);

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
          specialties,
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
      await Promise.all([
        fetchAppointments(id),
        fetchStaff(id)
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
  }, [fetchAppointments, fetchStaff]);

  const fetchStatsData = useCallback(async () => {
    if (!businessId) {
      console.log('No businessId, returning early');
      return;
    }

    try {
      console.log('Starting to fetch stats data...');
      const now = new Date();
      const startOfToday = startOfDay(now);
      const startOfWeek = startOfDay(subDays(now, now.getDay()));

      console.log('Fetching user role for user:', user?.id);
      // First, get current user's role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user?.id)
        .single();

      if (userError) {
        console.error('Error fetching user role:', userError);
        throw userError;
      }

      const userRole = userData?.role || null;
      setCurrentUserRole(userRole);

      console.log('User role data:', userData);
      console.log('Is user admin?', userRole === 'admin');
      console.log('Show all staff?', showAllStaff);

      // Then get all relevant appointments
      console.log('Building base query...');
      const startOfSelectedMonth = startOfDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
      const endOfSelectedMonth = endOfDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0));
      
      console.log('Date range:', {
        start: startOfSelectedMonth.toISOString(),
        end: endOfSelectedMonth.toISOString()
      });

      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          staff_id,
          service_id,
          status,
          users!inner (
            id,
            name,
            role
          ),
          services (
            id,
            name,
            price
          )
        `)
        .eq('business_id', businessId)
        .gte('start_time', startOfSelectedMonth.toISOString())
        .lt('start_time', endOfSelectedMonth.toISOString());

      // Only filter by user ID if not admin, or if admin and specifically choosing to see only their data
      if (userRole !== 'admin' || (userRole === 'admin' && !showAllStaff)) {
        console.log('Adding staff_id filter for user:', user?.id);
        query = query.eq('staff_id', user?.id);
      } else {
        console.log('No staff_id filter - showing all data for admin');
      }

      console.log('Executing query...');
      const { data: appointments, error: appointmentsError } = await query;

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        throw appointmentsError;
      }

      console.log('Appointments fetched:', appointments?.length);
      console.log('Appointments data:', appointments);

      const stats: StatsData = {
        daily: { total: 0, completed: 0, revenue: 0 },
        weekly: { total: 0, completed: 0, revenue: 0 },
        monthly: { total: 0, completed: 0, revenue: 0 },
        byStaff: {}
      };

      // Process appointments
      appointments?.forEach((apt: AppointmentWithRelations) => {
        console.log('Processing appointment:', apt.id);
        const aptDate = new Date(apt.start_time);
        const price = apt.services?.price || 0;
        const staffId = apt.staff_id;
        const staffName = apt.users?.name || 'לא ידוע';
        const isCompleted = apt.status === 'completed';
        const isCancelled = apt.status === 'cancelled';

        console.log('Appointment details:', {
          date: aptDate,
          price,
          staffId,
          staffName,
          isCompleted,
          isCancelled
        });

        // Skip cancelled appointments in stats
        if (isCancelled) {
          console.log('Skipping cancelled appointment');
          return;
        }

        // Initialize staff stats if not exists
        if (staffId && !stats.byStaff![staffId]) {
          console.log('Initializing stats for staff:', staffName);
          stats.byStaff![staffId] = {
            name: staffName,
            daily: { total: 0, completed: 0, revenue: 0 },
            weekly: { total: 0, completed: 0, revenue: 0 },
            monthly: { total: 0, completed: 0, revenue: 0 }
          };
        }

        // Monthly stats
        stats.monthly.total++;
        if (isCompleted) {
          stats.monthly.completed++;
          stats.monthly.revenue += price;
        }
        if (staffId) {
          stats.byStaff![staffId].monthly.total++;
          if (isCompleted) {
            stats.byStaff![staffId].monthly.completed++;
            stats.byStaff![staffId].monthly.revenue += price;
          }
        }

        // Weekly stats - check if appointment is in current week
        const today = new Date();
        const startOfWeek = startOfDay(subDays(today, today.getDay()));
        if (aptDate >= startOfWeek) {
          stats.weekly.total++;
          if (isCompleted) {
            stats.weekly.completed++;
            stats.weekly.revenue += price;
          }
          if (staffId) {
            stats.byStaff![staffId].weekly.total++;
            if (isCompleted) {
              stats.byStaff![staffId].weekly.completed++;
              stats.byStaff![staffId].weekly.revenue += price;
            }
          }
        }

        // Daily stats - check if appointment is today
        const startOfToday = startOfDay(today);
        if (aptDate >= startOfToday) {
          stats.daily.total++;
          if (isCompleted) {
            stats.daily.completed++;
            stats.daily.revenue += price;
          }
          if (staffId) {
            stats.byStaff![staffId].daily.total++;
            if (isCompleted) {
              stats.byStaff![staffId].daily.completed++;
              stats.byStaff![staffId].daily.revenue += price;
            }
          }
        }
      });

      console.log('Final stats data:', stats);
      setStatsData(stats);
    } catch (error) {
      console.error('Error in fetchStatsData:', error);
      toast.error('שגיאה בטעינת הנתונים');
    }
  }, [businessId, user?.id, showAllStaff]);

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

  useEffect(() => {
    if (showStats) {
      fetchStatsData();
    }
  }, [showStats, fetchStatsData]);

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
                <AnimatePresence>
                  {showDatePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full right-0 mt-1"
                      style={{ zIndex: 50 }}
                    >
                      <input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const date = parseISO(e.target.value);
                          handleDateChange(date);
                          setShowDatePicker(false);
                        }}
                        className="p-2 border border-gray-200 rounded-lg shadow-lg bg-white"
                        autoFocus
                        onBlur={() => setShowDatePicker(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoToToday}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                היום
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/statistics')}
                className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors relative"
                title="סטטיסטיקות"
              >
                <BarChart2 className="h-4 w-4" />
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
      <div className="flex-1 overflow-auto relative">
        {loadingAppointments ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm z-20">
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
            refreshAppointments={() => loadData(businessId)}
          />
        )}
        {!loadingAppointments && appointments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            אין תורים ביום זה
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {selectedAppointment && (
          <AppointmentDetails
            key={selectedAppointment?.id + (selectedAppointment?.updated_at || '')}
            appointment={selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            onUpdate={(updated) => {
              if (updated) setSelectedAppointment(updated);
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

export default Appointments;