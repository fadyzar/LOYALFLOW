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
}

interface AppointmentDetailsProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: () => void;
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

interface PendingChanges {
  date?: string;
  time?: string;
  staff_id?: string;
  staff_name?: string;
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
  const [selectedTime, setSelectedTime] = useState(format(parseISO(appointment.start_time), 'HH:mm'));
  const [selectedDate, setSelectedDate] = useState(appointment.start_time.split('T')[0]);

  // Calculate appointment duration in minutes
  const duration = useMemo(() => {
    const start = parseISO(appointment.start_time);
    const end = parseISO(appointment.end_time);
    return differenceInMinutes(end, start);
  }, [appointment.start_time, appointment.end_time]);

  // Load logs from database
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('appointment_logs')
          .select('*')
          .eq('appointment_id', appointment.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (error) {
        console.error('Error loading appointment logs:', error);
      }
    };

    loadLogs();
  }, [appointment.id]);

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

  const handleTimeSelect = (newTime: string) => {
    // Ensure time is in 5-minute steps
    const [hours, minutes] = newTime.split(':').map(Number);
    const roundedMinutes = Math.round(minutes / 5) * 5;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
    
    setPendingChanges(prev => ({ ...prev, time: formattedTime }));
    setEditingTime(false);
    setShowEditConfirm(true);
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

  const handleSaveChanges = async () => {
    try {
      setLoading(true);

      if (pendingChanges.date || pendingChanges.time) {
        // Get the original appointment times
        const originalStart = parseISO(appointment.start_time);
        const originalEnd = parseISO(appointment.end_time);
        const duration = originalEnd.getTime() - originalStart.getTime();

        // Create new date based on pending changes
        let newStartDate: Date;
        
        if (pendingChanges.date && pendingChanges.time) {
          // Both date and time changed
          const [year, month, day] = pendingChanges.date.split('-').map(Number);
          const [hours, minutes] = pendingChanges.time.split(':').map(Number);
          newStartDate = new Date(Date.UTC(year, month - 1, day, hours - 3, minutes));
        } else if (pendingChanges.date) {
          // Only date changed
          const [year, month, day] = pendingChanges.date.split('-').map(Number);
          newStartDate = new Date(Date.UTC(
            year,
            month - 1,
            day,
            originalStart.getUTCHours(),
            originalStart.getUTCMinutes()
          ));
        } else if (pendingChanges.time) {
          // Only time changed
          const [hours, minutes] = pendingChanges.time.split(':').map(Number);
          newStartDate = new Date(Date.UTC(
            originalStart.getUTCFullYear(),
            originalStart.getUTCMonth(),
            originalStart.getUTCDate(),
            hours - 3,
            minutes
          ));
        } else {
          throw new Error('No time or date changes to save');
        }

        const newEndDate = new Date(newStartDate.getTime() + duration);

        // Format for database (UTC)
        const formatUTC = (date: Date) => {
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:00+0000`;
        };

        const { error: dateError } = await supabase
          .from('appointments')
          .update({
            start_time: formatUTC(newStartDate),
            end_time: formatUTC(newEndDate)
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

      toast.success('התור עודכן בהצלחה');
      onUpdate();
      setShowEditConfirm(false);
      setPendingChanges({});
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">{appointment.customers?.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  appointment.status === 'booked' ? 'bg-yellow-100 text-yellow-800' :
                  appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                  appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                  appointment.status === 'no_show' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getStatusText(appointment.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                    <span>{format(parseISO(pendingChanges.date || appointment.start_time), 'EEEE, d בMMMM', { locale: he })}</span>
                  )}
                </div>
                
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:text-indigo-600 transition-colors"
                  onClick={() => !loading && setEditingTime(true)}
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  {editingTime ? (
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      onBlur={() => handleTimeSelect(selectedTime)}
                      className="w-32 p-1 border border-gray-300 rounded"
                      autoFocus
                    />
                  ) : (
                    <span>
                      {format(parseISO(appointment.start_time), 'HH:mm', { locale: he })}
                      {' - '}
                      {format(parseISO(appointment.end_time), 'HH:mm', { locale: he })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-gray-400" />
                  <span>{appointment.services?.name_he}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <a href={`tel:${appointment.customers?.phone}`} className="text-indigo-600 hover:text-indigo-700">
                    {appointment.customers?.phone}
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{appointment.users?.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-gray-400" />
                  <span>{duration} דקות</span>
                </div>

                {appointment.metadata?.price && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span>₪{appointment.metadata.price}</span>
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
                  {log.action === 'status_change' ? (
                    <>
                      שינוי סטטוס: {getStatusText(log.old_status)} ל{getStatusText(log.new_status)}
                      {log.details.user_name && (
                        <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                      )}
                      {log.details.reason && (
                        <span className="text-gray-500"> ({log.details.reason})</span>
                      )}
                    </>
                  ) : log.action === 'time_change' ? (
                    <>
                      שינוי זמן: {log.details.old_time} ל-{log.details.new_time}
                      {log.details.user_name && (
                        <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                      )}
                    </>
                  ) : log.action === 'staff_change' ? (
                    <>
                      שינוי איש צוות: {log.details.old_staff} ל{log.details.new_staff}
                      {log.details.user_name && (
                        <span className="text-gray-500"> ע"י {log.details.user_name}</span>
                      )}
                    </>
                  ) : log.action === 'loyalty_update' ? (
                    <>
                      עדכון נאמנות: {log.details.points_added} נקודות
                      {log.details.diamonds_added > 0 && (
                        <span> ו-{log.details.diamonds_added} יהלומים</span>
                      )}
                      <span className="text-gray-500"> (סה"כ: {log.details.total_points} נקודות, {log.details.total_diamonds} יהלומים)</span>
                    </>
                  ) : (
                    log.action
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-end gap-2">
            {appointment.status === 'booked' && (
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

            {appointment.status === 'confirmed' && (
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

            {(appointment.status === 'completed' || appointment.status === 'no_show') && (
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

            {appointment.status !== 'canceled' && appointment.status !== 'no_show' && (
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
                        <div>{format(parseISO(pendingChanges.date), 'EEEE, d בMMMM yyyy', { locale: he })}</div>
                      </div>
                    </div>
                  )}
                  
                  {pendingChanges.time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">שעה חדשה:</div>
                        <div>{pendingChanges.time}</div>
                      </div>
                    </div>
                  )}

                  {pendingChanges.staff_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">איש צוות חדש:</div>
                        <div>{pendingChanges.staff_name}</div>
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">ביטול תור</h3>
                    <p className="text-sm text-gray-500">
                      האם אתה בטוח שברצונך לבטל את התור?
                    </p>
                  </div>
                </div>

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
                    disabled={statusLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {statusLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>מבטל...</span>
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