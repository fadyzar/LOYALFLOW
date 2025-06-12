import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Users, User, TrendingUp, ArrowLeft, Calendar, DollarSign, CheckCircle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../contexts/auth/hooks';
import { supabase } from '../lib/supabase';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { he } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffData {
  name: string;
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
    topServices: Map<string, number>;
    topHours: Map<string, number>;
    topDays: Map<string, number>;
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
  byStaff: {
    [key: string]: StaffData;
  };
}

type PeriodKey = 'daily' | 'weekly' | 'monthly';

function Statistics() {
  const navigate = useNavigate();
  const { user, business } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [showAllStaff, setShowAllStaff] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('he-IL').format(num);
  };

  useEffect(() => {
    const fetchStatsData = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        console.log('Starting to fetch stats data...');

        let businessId = business?.id;
        if (!businessId) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('business_id, role')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;
          businessId = userData?.business_id;
          setCurrentUserRole(userData?.role);
        }

        if (!businessId) {
          throw new Error('לא נמצא עסק מקושר');
        }

        // Calculate date ranges
        const today = startOfDay(new Date());
        const weekStart = startOfWeek(today, { weekStartsOn: 0 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        // Fetch appointments for the entire month
        const { data: appointments, error: appointmentsError } = await supabase
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
          .gte('start_time', monthStart.toISOString())
          .lt('start_time', monthEnd.toISOString());

        if (appointmentsError) throw appointmentsError;

        // Initialize stats object
        const stats: StatsData = {
          daily: { total: 0, completed: 0, revenue: 0 },
          weekly: { total: 0, completed: 0, revenue: 0 },
          monthly: { total: 0, completed: 0, revenue: 0 },
          byStaff: {}
        };

        // Process appointments
        appointments?.forEach((apt: any) => {
          const aptDate = startOfDay(new Date(apt.start_time));
          const price = apt.services?.price || 0;
          const staffId = apt.staff_id;
          const staffName = apt.users?.name || 'לא ידוע';
          const isCompleted = apt.status === 'completed';
          const isCancelled = apt.status === 'cancelled';
          const serviceName = apt.services?.name || 'לא ידוע';
          const hour = format(new Date(apt.start_time), 'HH');
          const day = format(new Date(apt.start_time), 'EEEE', { locale: he });

          if (isCancelled) return;

          // If user is staff, only process their own appointments
          if (currentUserRole === 'staff' && staffId !== user.id) return;

          // Initialize staff stats if needed
          if (staffId && !stats.byStaff![staffId]) {
            stats.byStaff![staffId] = {
              name: staffName,
              daily: { total: 0, completed: 0, revenue: 0 },
              weekly: { total: 0, completed: 0, revenue: 0 },
              monthly: { 
                total: 0, 
                completed: 0, 
                revenue: 0,
                topServices: new Map(),
                topHours: new Map(),
                topDays: new Map()
              }
            };
          }

          // Update monthly stats
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

            // Update service statistics - only keep top 3
            const serviceCount = (stats.byStaff![staffId].monthly.topServices.get(serviceName) || 0) + 1;
            stats.byStaff![staffId].monthly.topServices.set(serviceName, serviceCount);

            // Update hour statistics - only keep top 3
            const hourCount = (stats.byStaff![staffId].monthly.topHours.get(hour) || 0) + 1;
            stats.byStaff![staffId].monthly.topHours.set(hour, hourCount);

            // Update day statistics - only keep top 3
            const dayCount = (stats.byStaff![staffId].monthly.topDays.get(day) || 0) + 1;
            stats.byStaff![staffId].monthly.topDays.set(day, dayCount);
          }

          // Update weekly stats if within current week
          if (aptDate >= weekStart && aptDate <= weekEnd) {
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

          // Update daily stats if today
          if (aptDate.getTime() === today.getTime()) {
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

        // Filter staff data if needed
        if (currentUserRole !== 'admin' || (currentUserRole === 'admin' && !showAllStaff)) {
          const filteredStats = {
            ...stats,
            byStaff: Object.fromEntries(
              Object.entries(stats.byStaff || {}).filter(([id]) => id === user.id)
            )
          };
          setStatsData(filteredStats);
        } else {
          setStatsData(stats);
        }

        console.log('Stats data fetched successfully:', stats);
      } catch (error: any) {
        console.error('Error in fetchStatsData:', error);
        toast.error(error.message || 'שגיאה בטעינת הנתונים');
      } finally {
        setLoading(false);
      }
    };

    fetchStatsData();
  }, [user?.id, business?.id, selectedDate, showAllStaff, currentUserRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-16 h-16 relative"
        >
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </motion.div>
      </div>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    return current >= previous ? 
      <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : 
      <ArrowDownRight className="w-4 h-4 text-red-500" />;
  };

  // First, let's fix the ShekelIcon component to handle className prop
  interface IconProps {
    className?: string;
  }

  const ShekelIcon: React.FC<IconProps> = ({ className }) => (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4V20M16 4L12 8M8 20L12 16M18 4V12C18 14.2091 16.2091 16 14 16H12M6 20V12C6 9.79086 7.79086 8 10 8H12" 
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <main className="fixed inset-0 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="flex items-center h-16 bg-white/60 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 mx-3 hover:bg-white/30 rounded-xl transition-all duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
        </button>
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"
        >
          סטטיסטיקות
        </motion.h1>
        <div className="flex-1" />
        <div className="flex items-center bg-white/80 rounded-xl px-4 py-2 mx-3 border border-white/40 shadow-lg shadow-indigo-500/5 backdrop-blur-lg">
          <Calendar className="w-4 h-4 text-indigo-500 ml-2" />
          <input
            type="month"
            value={format(selectedDate, 'yyyy-MM')}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-');
              setSelectedDate(new Date(parseInt(year), parseInt(month) - 1));
            }}
            className="bg-transparent text-sm outline-none w-28 font-medium text-gray-700"
          />
        </div>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto pb-20 px-4">
        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4"
        >
          <div className="relative bg-white/60 backdrop-blur-lg rounded-xl group hover:bg-white/80 transition-all duration-500 shadow-lg shadow-indigo-500/5 border border-white/20">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg group-hover:scale-110 transition-all duration-500 relative">
                  <div className="absolute inset-0 rounded-lg bg-blue-500/10 blur-lg group-hover:blur-xl transition-all duration-500" />
                  <Clock className="w-5 h-5 text-blue-600 relative z-10" />
                </div>
                <span className="text-sm font-medium text-gray-600">תורים היום</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500">
                  {formatNumber(statsData?.daily.completed || 0)}
                </div>
                    <div className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber(statsData?.daily.total || 0)}</div>
              </div>
                  <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                      <span className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatNumber(statsData?.daily.revenue || 0)}₪
                  </span>
                      <span className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber((statsData?.daily.total || 0) * 100)}₪</span>
                    </div>
                    {getTrendIcon(statsData?.daily.revenue || 0, (statsData?.daily.revenue || 0) * 0.8)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Stats Card */}
          <div className="relative bg-white/60 backdrop-blur-lg rounded-xl group hover:bg-white/80 transition-all duration-500 shadow-lg shadow-purple-500/5 border border-white/20">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg group-hover:scale-110 transition-all duration-500 relative">
                  <div className="absolute inset-0 rounded-lg bg-purple-500/10 blur-lg group-hover:blur-xl transition-all duration-500" />
                  <BarChart2 className="w-5 h-5 text-purple-600 relative z-10" />
                </div>
                <span className="text-sm font-medium text-gray-600">תורים השבוע</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500">
                  {formatNumber(statsData?.weekly.completed || 0)}
                </div>
                    <div className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber(statsData?.weekly.total || 0)}</div>
              </div>
                  <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                      <span className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {formatNumber(statsData?.weekly.revenue || 0)}₪
                  </span>
                      <span className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber((statsData?.weekly.total || 0) * 100)}₪</span>
                    </div>
                    {getTrendIcon(statsData?.weekly.revenue || 0, (statsData?.weekly.revenue || 0) * 0.8)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Average Income Card */}
          <div className="relative bg-white/60 backdrop-blur-lg rounded-xl group hover:bg-white/80 transition-all duration-500 shadow-lg shadow-emerald-500/5 border border-white/20">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg group-hover:scale-110 transition-all duration-500 relative">
                  <div className="absolute inset-0 rounded-lg bg-emerald-500/10 blur-lg group-hover:blur-xl transition-all duration-500" />
                  <ShekelIcon className="w-5 h-5 text-emerald-600 relative z-10" />
                </div>
                <span className="text-sm font-medium text-gray-600">הכנסה ממוצעת</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-3xl font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500">
                    {statsData?.monthly.completed ? Math.round(statsData.monthly.revenue / statsData.monthly.completed) : 0}
                  </span>
                  <span className="text-lg font-medium text-emerald-600 mt-1">₪</span>
                </div>
                <div className="text-xs font-medium text-gray-400">לתור</div>
              </div>
            </div>
          </div>

          {/* Monthly Stats Card */}
          <div className="relative bg-white/60 backdrop-blur-lg rounded-xl group hover:bg-white/80 transition-all duration-500 shadow-lg shadow-indigo-500/5 border border-white/20">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 rounded-lg group-hover:scale-110 transition-all duration-500 relative">
                  <div className="absolute inset-0 rounded-lg bg-indigo-500/10 blur-lg group-hover:blur-xl transition-all duration-500" />
                  <TrendingUp className="w-5 h-5 text-indigo-600 relative z-10" />
                </div>
                <span className="text-sm font-medium text-gray-600">תורים החודש</span>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-3xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-500">
                  {formatNumber(statsData?.monthly.completed || 0)}
                </div>
                    <div className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber(statsData?.monthly.total || 0)}</div>
              </div>
                  <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                      <span className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                    {formatNumber(statsData?.monthly.revenue || 0)}₪
                  </span>
                      <span className="text-sm font-medium text-gray-400 mt-1">מתוך {formatNumber((statsData?.monthly.total || 0) * 100)}₪</span>
                    </div>
                    {getTrendIcon(statsData?.monthly.revenue || 0, (statsData?.monthly.revenue || 0) * 0.8)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Staff Performance */}
        {currentUserRole === 'admin' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl shadow-indigo-500/5 overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-gray-500/10 to-gray-500/5 rounded-xl relative">
                  <div className="absolute inset-0 rounded-xl bg-gray-500/10 blur-xl" />
                  <Users className="w-6 h-6 text-gray-700 relative z-10" />
                </div>
                <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  ביצועי צוות
                </h2>
              </div>
              <button
                onClick={() => setShowAllStaff(!showAllStaff)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-sm font-medium text-gray-700 transition-all duration-300 shadow-sm"
              >
                {showAllStaff ? 'הצג רק אותי' : 'הצג את כל הצוות'}
              </button>
            </div>
            
            <div className="divide-y divide-white/10">
              <div className="grid grid-cols-4 py-4 px-6 bg-gray-50/50">
                <div className="text-sm font-medium text-gray-500">שם</div>
                <div className="text-center text-sm font-medium text-gray-500">היום</div>
                <div className="text-center text-sm font-medium text-gray-500">השבוע</div>
                <div className="text-center text-sm font-medium text-gray-500">החודש</div>
              </div>
              {statsData?.byStaff && Object.entries(statsData.byStaff).map(([staffId, staffStats], index) => {
                // Find max values for each period and count how many staff members have that value
                const dailyRevenues = Object.values(statsData.byStaff || {}).map(s => s.daily.revenue);
                const maxDaily = Math.max(...dailyRevenues);
                const dailyWinners = dailyRevenues.filter(r => r === maxDaily).length;

                const weeklyRevenues = Object.values(statsData.byStaff || {}).map(s => s.weekly.revenue);
                const maxWeekly = Math.max(...weeklyRevenues);
                const weeklyWinners = weeklyRevenues.filter(r => r === maxWeekly).length;

                const monthlyRevenues = Object.values(statsData.byStaff || {}).map(s => s.monthly.revenue);
                const maxMonthly = Math.max(...monthlyRevenues);
                const monthlyWinners = monthlyRevenues.filter(r => r === maxWeekly).length;

                return (
                  <motion.div 
                    key={staffId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1) }}
                    className="grid grid-cols-4 py-4 px-6 hover:bg-white/40 transition-colors duration-300"
                  >
                    <div className="font-medium text-gray-700">{staffStats.name}</div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-semibold ${staffStats.daily.revenue === maxDaily && dailyWinners === 1 ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent' : 'text-gray-700'}`}>
                          {formatNumber(staffStats.daily.revenue)}₪
                        </span>
                        {staffStats.daily.revenue === maxDaily && dailyWinners === 1 && (
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {formatNumber(staffStats.daily.completed)}/{formatNumber(staffStats.daily.total)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-semibold ${staffStats.weekly.revenue === maxWeekly && weeklyWinners === 1 ? 'bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent' : 'text-gray-700'}`}>
                          {formatNumber(staffStats.weekly.revenue)}₪
                        </span>
                        {staffStats.weekly.revenue === maxWeekly && weeklyWinners === 1 && (
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {formatNumber(staffStats.weekly.completed)}/{formatNumber(staffStats.weekly.total)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`font-semibold ${staffStats.monthly.revenue === maxMonthly && monthlyWinners === 1 ? 'bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent' : 'text-gray-700'}`}>
                          {formatNumber(staffStats.monthly.revenue)}₪
                        </span>
                        {staffStats.monthly.revenue === maxMonthly && monthlyWinners === 1 && (
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" />
                        )}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {formatNumber(staffStats.monthly.completed)}/{formatNumber(staffStats.monthly.total)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-8 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl shadow-indigo-500/5 overflow-hidden p-6"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="p-3 bg-gradient-to-br from-gray-500/10 to-gray-500/5 rounded-xl relative">
                <div className="absolute inset-0 rounded-xl bg-gray-500/10 blur-xl" />
                <Users className="w-6 h-6 text-gray-700 relative z-10" />
              </div>
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-semibold text-gray-700">
                  ביצועי צוות
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  אין הרשאה לצפייה בנתוני צוות
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Completion Rate */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 mb-6 bg-white/60 backdrop-blur-lg rounded-2xl border border-white/20 shadow-xl shadow-indigo-500/5"
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-xl relative">
                <div className="absolute inset-0 rounded-xl bg-blue-500/10 blur-xl" />
                <BarChart2 className="w-6 h-6 text-blue-600 relative z-10" />
              </div>
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                שיעור השלמה
              </h2>
            </div>
            <div className="text-center">
              <div className="inline-flex items-baseline">
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 260,
                    damping: 20,
                    delay: 0.5 
                  }}
                  className="text-7xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent"
                >
                  {statsData?.monthly.total ? Math.round((statsData.monthly.completed / statsData.monthly.total) * 100) : 0}
                </motion.span>
                <span className="text-3xl text-gray-400 ml-2">%</span>
              </div>
              <span className="text-gray-500 block mt-3 text-lg">מהתורים החודש הושלמו</span>
            </div>
          </div>
        </motion.div>

        {/* Service Analysis */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 mb-4 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl shadow-indigo-500/10"
        >
          <div className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl relative group">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-xl group-hover:blur-2xl transition-all duration-500" />
                <TrendingUp className="w-6 h-6 text-indigo-600 relative z-10 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                ניתוח שירותים
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Top Service */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white/40 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg shadow-indigo-500/5 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-sm font-semibold text-indigo-600 mb-3">השירות הנפוץ ביותר</h3>
                <div className="space-y-1">
                  {(() => {
                    const allServices = Object.values(statsData?.byStaff || {}).flatMap(staff => 
                      Array.from(staff.monthly.topServices.entries()).map(([service, count]) => ({
                        service,
                        count
                      }))
                    ).reduce((acc, { service, count }) => {
                      acc[service] = (acc[service] || 0) + count;
                      return acc;
                    }, {} as Record<string, number>);

                    const totalAppointments = Object.values(allServices).reduce((sum, count) => sum + count, 0);
                    const [topService, topCount] = Object.entries(allServices)
                      .sort((a, b) => b[1] - a[1])[0] || ['אין נתונים', 0];

                    const percentage = Math.round((topCount / totalAppointments) * 100);
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-700">{topService}</span>
                        <div className="flex items-center gap-2">
                          <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
                          >
                            {percentage}%
                          </motion.span>
                          <span className="text-sm text-gray-400">({formatNumber(topCount)} תורים)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Peak Hours */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white/40 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-500 group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-sm font-semibold text-purple-600 mb-3">שעות שיא</h3>
                <div className="space-y-2">
                  {(() => {
                    const allHours = Object.values(statsData?.byStaff || {}).flatMap(staff => 
                      Array.from(staff.monthly.topHours.entries()).map(([hour, count]) => ({
                        hour,
                        count
                      }))
                    ).reduce((acc, { hour, count }) => {
                      acc[hour] = (acc[hour] || 0) + count;
                      return acc;
                    }, {} as Record<string, number>);

                    const totalAppointments = Object.values(allHours).reduce((sum, count) => sum + count, 0);
                    const topHours = Object.entries(allHours)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    return topHours.map(([hour, count], index) => {
                      const percentage = Math.round((count / totalAppointments) * 100);
                      return (
                        <motion.div 
                          key={hour}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.9 + index * 0.1 }}
                          className="flex items-center justify-between"
                        >
                          <span className="text-lg font-medium text-gray-700">{hour}:00</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                              {percentage}%
                            </span>
                            <span className="text-sm text-gray-400">({formatNumber(count)} תורים)</span>
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              </motion.div>

              {/* Peak Day */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="bg-white/40 backdrop-blur-lg rounded-2xl p-5 border border-white/20 shadow-lg shadow-pink-500/5 hover:shadow-xl hover:shadow-pink-500/10 transition-all duration-500 group"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <h3 className="text-sm font-semibold text-pink-600 mb-3">היום העמוס ביותר</h3>
                <div className="space-y-1">
                  {(() => {
                    const allDays = Object.values(statsData?.byStaff || {}).flatMap(staff => 
                      Array.from(staff.monthly.topDays.entries()).map(([day, count]) => ({
                        day,
                        count
                      }))
                    ).reduce((acc, { day, count }) => {
                      acc[day] = (acc[day] || 0) + count;
                      return acc;
                    }, {} as Record<string, number>);

                    const totalAppointments = Object.values(allDays).reduce((sum, count) => sum + count, 0);
                    const [topDay, topCount] = Object.entries(allDays)
                      .sort((a, b) => b[1] - a[1])[0] || ['אין נתונים', 0];

                    const percentage = Math.round((topCount / totalAppointments) * 100);
                    return (
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-700">{topDay}</span>
                        <div className="flex items-center gap-2">
                          <motion.span 
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent"
                          >
                            {percentage}%
                          </motion.span>
                          <span className="text-sm text-gray-400">({formatNumber(topCount)} תורים)</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default Statistics; 