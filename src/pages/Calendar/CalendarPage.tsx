import React, { useCallback, useEffect, useState } from 'react';
import { CalendarEvent, TouchGesture } from '../../types/calendar';
import { useCalendarState } from '../../hooks/useCalendarState';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import CalendarHeader from '../../components/calendar/CalendarHeader';
import DayView from '../../components/calendar/DayView';
import WeekView from '../../components/calendar/WeekView';
import MonthView from '../../components/calendar/MonthView';
import EventModal from '../../components/calendar/EventModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/auth/hooks';
import { AppointmentDetails } from '../../components/appointments/DayView/components/AppointmentDetails';
import { useNavigate } from 'react-router-dom';


function CalendarPage() {
  const {
    currentDate,
    setCurrentDate,
    view,
    setView,
    events,
    setEvents,
    addEvent,
    updateEvent,
    dragState,
    setDragState,
    showEventModal,
    setShowEventModal,
    selectedTimeSlot,
    setSelectedTimeSlot,
    navigateDate
  } = useCalendarState();

const { business, user, session, refreshBusiness } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  console.log('👤 user:', user);
  console.log('🏢 business:', business);
}, [business]);

// רענון business בכל כניסה לדף היומן
useEffect(() => {
  if (refreshBusiness) {
    refreshBusiness();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [businessHours, setBusinessHours] = useState<{ start_time: string; end_time: string } | null>(null);
  const [businessHoursLoading, setBusinessHoursLoading] = useState(false);

  // במקום להשתמש רק ב-business, ודא שאתה מחכה שה-business ייטען מה-context לפני שמבצעים fetch
useEffect(() => {
  // הוסף בדיקה: אם אין user, אל תעשה כלום
  if (!user) return;

  // אם business עדיין null, חכה שייטען (אל תבצע fetchStaff)
  if (!business || !business.id) {
    console.log('⏳ מחכה לטעינת business מה-context...');
    return;
  }

  const fetchStaff = async () => {
    if (!business.id) return;

    // נסה לשלוף גם את role, metadata, name, email
    const { data, error } = await supabase
        .from('users')
        .select('id, metadata, name, email, role, business_id')
        .eq('business_id', business.id)
        .in('role', ['staff', 'admin']); // נסה גם admin אם צריך

      if (error) {
        console.error('שגיאה בטעינת אנשי צוות:', error?.message);
        setStaffList([]);
        return;
      }

      if (!data || data.length === 0) {
        console.warn('לא נמצאו אנשי צוות לעסק:', business.id);
        setStaffList([]);
        return;
      }

      // הדפס את התוצאה לבדיקה
      console.log('staff raw data:', data);

      const staffWithNames = data.map((user: any) => ({
        id: user.id,
        name: user.metadata?.name || user.name || user.email || 'ללא שם',
      }));
      setStaffList(staffWithNames);
    };

    fetchStaff();
}, [business, user]);

  // 1. Fetch business_hours only after business?.id is available.
  // 2. Use a separate loading state for businessHours if you want to show a loader.
  // 3. Pass open/close times as empty string or undefined if not loaded, and render DayView only when ready.

  useEffect(() => {
    // Only run when business?.id is available
    if (!business || !business.id) {
      setBusinessHours(null);
      return;
    }

    setBusinessHoursLoading(true);

    const fetchBusinessHours = async () => {
      try {
        const { data, error } = await supabase
          .from('business_hours')
          .select('regular_hours, special_dates')
          .eq('business_id', business.id)
          .single();

        if (error || !data) {
          setBusinessHours(null);
          setBusinessHoursLoading(false);
          return;
        }

        const regularHours = typeof data.regular_hours === 'string'
          ? JSON.parse(data.regular_hours)
          : data.regular_hours;

        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayName = dayNames[currentDate.getDay()];
        const todayHours = regularHours && regularHours[currentDayName];

        const special = Array.isArray(data.special_dates)
          ? data.special_dates.find((s: any) => s.date === currentDate.toISOString().split('T')[0])
          : null;

        if (special && special.is_closed) {
          setBusinessHours(null);
        } else if (special && special.start_time && special.end_time) {
          setBusinessHours({ start_time: special.start_time, end_time: special.end_time });
        } else if (todayHours && todayHours.is_active && todayHours.start_time && todayHours.end_time) {
          setBusinessHours({ start_time: todayHours.start_time, end_time: todayHours.end_time });
        } else {
          setBusinessHours(null);
        }
      } finally {
        setBusinessHoursLoading(false);
      }
    };

    fetchBusinessHours();
  }, [business, currentDate]);

  const fetchAppointmentsFromDB = async () => {
    if (!business || !business.id) return [];
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        start_time,
        end_time,
        staff_id,
        status,
        business_id,
        customer:customer_id (
          id,
          name,
          phone
        )
      `)
      .eq('business_id', business.id); // סינון לפי העסק הנוכחי

    if (error) {
      console.error('שגיאה בשליפה מ-Supabase:', error.message);
      return [];
    }

    // ודא שstaffId קיים על כל תור, ושהסינון עובד
    return data
      .filter((a: any) => !selectedStaffId || a.staff_id === selectedStaffId)
      .map((a: any) => {
        let color = '';
        let statusLabel = '';
        switch (a.status) {
          case 'booked':
            statusLabel = 'ממתין לאישור';
            color = '#3B82F6';
            break;
          case 'confirmed':
            statusLabel = 'מאושר';
            color = '#10B981';
            break;
          case 'completed':
            statusLabel = 'הושלם';
            color = '#6366F1';
            break;
          case 'canceled':
            statusLabel = 'בוטל';
            color = '#EF4444';
            break;
          case 'no_show':
            statusLabel = 'לא הגיע';
            color = '#F59E0B';
            break;
          default:
            statusLabel = 'לא ידוע';
            color = '#9CA3AF';
        }

        return {
          id: a.id,
          title:
            a.customer?.name && a.customer?.phone
              ? `${a.customer.name} - ${a.customer.phone} - ${statusLabel}`
              : `ללא כותרת - ${statusLabel}`,
          startTime: new Date(a.start_time),
          endTime: new Date(a.end_time),
          staffId: a.staff_id, // ודא שזה staffId (ולא staff_id)
          color
        };
      });
  };

  useEffect(() => {
    const loadEvents = async () => {
      const realEvents = await fetchAppointmentsFromDB();
      setEvents(realEvents);
    };

    loadEvents();
  }, [currentDate, selectedStaffId]);

  const handleGesture = useCallback((gesture: TouchGesture) => {
    switch (gesture.type) {
      case 'swipe':
        gesture.direction === 'left' ? navigateDate('next') : navigateDate('prev');
        break;
      case 'doubletap':
        setSelectedTimeSlot(new Date());
        setShowEventModal(true);
        break;
    }
  }, [navigateDate]);

  const { handleTouchStart, handleTouchEnd } = useTouchGestures({
    onGesture: handleGesture,
    threshold: 50
  });

  const handleDragStart = useCallback((event: CalendarEvent, position: { x: number; y: number }) => {
    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedEvent: event,
      startPosition: position,
      currentPosition: position,
      originalTime: event.startTime
    }));
  }, [setDragState]);

  // הוסף state חדש לשמירת מיקום זמני של תור בזמן גרירה
  const [dragPreviewEvent, setDragPreviewEvent] = useState<CalendarEvent | null>(null);

  const handleDragMove = useCallback((position: { x: number; y: number }) => {
    if (dragState.isDragging && dragState.draggedEvent) {
      setDragState(prev => ({
        ...prev,
        currentPosition: position
      }));

      // חישוב זמן חדש לפי מיקום הגרירה והצגת תור זמני (preview)
      const timeDiff = position.y - dragState.startPosition.y;
      const minutesDiff = Math.round(timeDiff / (80 / 60));
      const newStartTime = snapToFiveMinutes(new Date(dragState.originalTime.getTime() + minutesDiff * 60000));
      const duration = dragState.draggedEvent.endTime.getTime() - dragState.draggedEvent.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      setDragPreviewEvent({
        ...dragState.draggedEvent,
        startTime: newStartTime,
        endTime: newEndTime
      });
    }
  }, [dragState.isDragging, dragState.draggedEvent, dragState.startPosition.y, dragState.originalTime, setDragState]);

  const snapToFiveMinutes = (date: Date): Date => {
    const snapped = new Date(date);
    const minutes = snapped.getMinutes();
    const remainder = minutes % 5;
    snapped.setMinutes(minutes - remainder + (remainder >= 3 ? 5 : 0));
    snapped.setSeconds(0, 0);
    return snapped;
  };

  const handleDragEnd = useCallback(() => {
    if (dragState.isDragging && dragState.draggedEvent) {
      const timeDiff = dragState.currentPosition.y - dragState.startPosition.y;
      const minutesDiff = Math.round(timeDiff / (80 / 60));
      const newStartTime = snapToFiveMinutes(new Date(dragState.originalTime.getTime() + minutesDiff * 60000));
      const duration = dragState.draggedEvent.endTime.getTime() - dragState.draggedEvent.startTime.getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      updateEvent(dragState.draggedEvent.id, { startTime: newStartTime, endTime: newEndTime });

      const updateAppointmentInDB = async () => {
        const { error } = await supabase
          .from('appointments')
          .update({
            start_time: newStartTime.toISOString(),
            end_time: newEndTime.toISOString()
          })
          .eq('id', dragState.draggedEvent.id);

        if (error) {
          console.error('שגיאה בעדכון תור ב-DB:', error.message);
        } else {
          fetchAppointmentsFromDB().then(setEvents);
        }
      };
      updateAppointmentInDB();
    }

    setDragPreviewEvent(null); // נקה את ה-preview בסיום גרירה

    setDragState({
      isDragging: false,
      draggedEvent: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      originalTime: new Date()
    });
  }, [dragState, updateEvent, setDragState, fetchAppointmentsFromDB, setEvents]);

  const handleTimeSlotDoubleClick = useCallback((date: Date) => {
    setSelectedTimeSlot(snapToFiveMinutes(date));
    setEditingEvent(null);
    setShowEventModal(true);
  }, []);

  const handleEventClick = useCallback((event: CalendarEvent) => {
  // נניח ש-calendarEvent.id זהה ל-appointment.id
  const fetchAppointmentDetails = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customer_id (
          id, name, phone
        ),
        users:staff_id (
          id, name
        ),
        services:service_id (
          id, name_he
        )
      `)
      .eq('id', event.id)
      .single();

    if (error || !data) {
      console.error('❌ לא הצלחנו לשלוף את פרטי התור:', error);
      return;
    }

    setSelectedAppointment(data); // זה מה שיפתח את AppointmentDetails
  };

  fetchAppointmentDetails();
}, []);

  // הוסף את הפונקציה החסרה handleAddEvent
  const handleAddEvent = useCallback(() => {
    setSelectedTimeSlot(snapToFiveMinutes(new Date()));
    setEditingEvent(null);
    setShowEventModal(true);
  }, [setSelectedTimeSlot, setEditingEvent, setShowEventModal]);

  // הוסף את הפונקציה החסרה handleEventSave
  const handleEventSave = useCallback((eventData: Omit<CalendarEvent, 'id'>) => {
    const snappedEventData = {
      ...eventData,
      startTime: snapToFiveMinutes(eventData.startTime),
      endTime: snapToFiveMinutes(eventData.endTime)
    };
    if (editingEvent) {
      updateEvent(editingEvent.id, snappedEventData);
    } else {
      addEvent(snappedEventData);
    }
    setShowEventModal(false);
    setSelectedTimeSlot(null);
    setEditingEvent(null);
  }, [addEvent, updateEvent, editingEvent, setShowEventModal, setSelectedTimeSlot, setEditingEvent]);


  // עדכן את callback כך שיסגור את הפופאפ מיד, וירענן רק אם יש שינוי סטטוס
  const handleAppointmentStatusChange = useCallback(() => {
    setSelectedAppointment(null); // סגור את הפופאפ מיד

  }, []);

  // הוסף פונקציה שמרעננת את התורים אחרי שינוי סטטוס
  const handleAppointmentUpdate = useCallback(() => {
    setSelectedAppointment(null); // סגור את הפופאפ
    // רענון האירועים ביומן
    fetchAppointmentsFromDB().then(setEvents);
  }, [fetchAppointmentsFromDB, setEvents]);

  // הוסף פונקציה פשוטה לטיפול בבחירת יום בתצוגת חודש
  const handleDateSelect = useCallback((date: Date) => {
    setCurrentDate(date);
    setView('day');
  }, [setCurrentDate, setView]);

  // ודא שבקומפוננטות DayView/WeekView אתה מעביר events מסוננים לפי selectedStaffId
  const renderCalendarView = () => {
    // Optionally, show a loader while businessHours are loading
    if (business && business.id && businessHoursLoading) {
      return <div>טוען שעות פעילות...</div>;
    }

    const filteredEvents = selectedStaffId
      ? events.filter((e: any) => e.staffId === selectedStaffId)
      : events;

    const commonProps = {
      currentDate,
      events: filteredEvents,
      dragState,
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      onTimeSlotDoubleClick: handleTimeSlotDoubleClick,
      onEventClick: handleEventClick,
      dragPreviewEvent // חדש!
    };

    switch (view) {
      case 'day':
        return (
          <DayView
            {...commonProps}
            businessOpenTime={businessHours?.start_time || ''}
            businessCloseTime={businessHours?.end_time || ''}
          />
        );
      case 'week':
        return <WeekView {...commonProps} />;
      case 'month':
        return <MonthView currentDate={currentDate} events={filteredEvents} onDateSelect={handleDateSelect} />;
      default:
        return <WeekView {...commonProps} />;
    }
  };

  

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col" dir="rtl">
      <div className="flex justify-center mt-4 mb-2">
        <div className="flex items-center space-x-2 bg-white shadow px-4 py-2 rounded-xl border">
          <label className="text-sm font-medium">סנן לפי איש צוות:</label>
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedStaffId || ''}
            onChange={(e) => setSelectedStaffId(e.target.value || null)}
          >
            
            <option value="">הצג הכל</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onNavigate={navigateDate}
        onAddEvent={handleAddEvent}
      />

      <div className="flex-1 overflow-hidden px-4 pb-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {renderCalendarView()}
      </div>
     {selectedAppointment && (
  <AppointmentDetails
    appointment={selectedAppointment}
    onClose={() => setSelectedAppointment(null)}
    onUpdate={handleAppointmentUpdate}
  />
)}

      <EventModal
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setSelectedTimeSlot(null);
          setEditingEvent(null);
        }}
        onSave={handleEventSave}
        initialDate={selectedTimeSlot || undefined}
        editEvent={editingEvent || undefined}
      />
    </div>
  );
}

export default CalendarPage;
