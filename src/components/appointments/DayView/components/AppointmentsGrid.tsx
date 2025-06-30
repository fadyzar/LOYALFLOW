import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, addMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { Staff, Appointment, StaffHours } from '../types';
import { CELL_HEIGHT, TIME_SLOTS, DRAG_SNAP } from '../constants';
import { calculateAppointmentPosition, getStatusColor } from '../utils';
import { useTimeSlots } from '../hooks/useTimeSlots';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/auth/hooks';
import toast from 'react-hot-toast';
import { useLongPress } from '../../../../hooks/useLongPress';
// import { StaffHeader } from './StaffHeader';


interface AppointmentsGridProps {
  staff: Staff[];
  // staffHours: Record<string, StaffHours>;
  appointments: Appointment[];
  selectedDate: Date;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick?: (date: Date, staffId: string) => void;
  refreshAppointments?: () => void;
}


const AppointmentsGrid = React.memo(React.forwardRef<HTMLDivElement, AppointmentsGridProps>(
  function AppointmentsGrid({ staff, staffHours, appointments, selectedDate, onAppointmentClick, onTimeSlotClick, refreshAppointments }, ref) {
    const { user } = useAuth();
    const { getTimeSlotStyle } = useTimeSlots(staffHours, appointments);
    const [draggedTime, setDraggedTime] = useState<string | null>(null);
    const [draggedEndTime, setDraggedEndTime] = useState<string | null>(null);
    const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [dragType, setDragType] = useState<'move' | 'top' | 'bottom' | null>(null);
    const dragStartRef = useRef<{ y: number; startTime: Date | null; endTime: Date | null; gridTop: number }>({ y: 0, startTime: null, endTime: null, gridTop: 0 });
    const gridRef = useRef<HTMLDivElement>(null);
    const constraintsRef = useRef<HTMLDivElement>(null);
    const [isDraggingEnabled, setDraggingEnabled] = useState(false);

    // Detect if device is touch (mobile/tablet)
    const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
    const isMobile = typeof window !== 'undefined' && (
      /android|iphone|ipad|ipod|opera mini|iemobile|mobile/i.test(window.navigator.userAgent)
    );

    // מצב האם מוצג overlay שמונע אינטראקציה ברקע
    const [showMobileOverlay, setShowMobileOverlay] = useState(false);

    // במובייל: אפשר גרירה רק אחרי לחיצה ארוכה, הצג overlay
    useEffect(() => {
      if (!isMobile) {
        setDraggingEnabled(true);
      } else {
        setDraggingEnabled(false);
      }
    }, [isMobile]);

    // Always allow drag on all devices
    useEffect(() => {
      setDraggingEnabled(true);
    }, []);

    // ניהול appointments ל-local state
    const [localAppointments, setLocalAppointments] = useState<Appointment[]>(appointments);

    // סנכרון עם props
    useEffect(() => {
      setLocalAppointments(appointments);
    }, [appointments]);

    const appointmentsByStaff = useMemo(() => {
      const map = new Map<string, Appointment[]>();
      localAppointments.forEach(apt => {
        if (!map.has(apt.staff_id)) {
          map.set(apt.staff_id, []);
        }
        map.get(apt.staff_id)?.push(apt);
      });
      return map;
    }, [localAppointments]);

    useEffect(() => {
      if (isDraggingEnabled) {
        document.body.style.overflow = 'hidden';
        navigator.vibrate?.(50); // רטט קטן
      } else {
        document.body.style.overflow = '';
      }
    }, [isDraggingEnabled]);

    // Utility to get clientY from mouse or touch event
    function getClientY(e: any): number {
      if (e.touches && e.touches.length > 0) return e.touches[0].clientY;
      if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientY;
      return e.clientY;
    }

    // הודעה לגרירה לא נתמכת במובייל
    const [showMobileDragMsg, setShowMobileDragMsg] = useState(false);

    // לחיצה ארוכה במובייל: הצג הודעה בלבד ומנע ברירת מחדל של הדפדפן (מניעת zoom/magnifier)
    // התאמה ל-hook שלך: אם הוא תומך רק ב-delay (מספר), השתמש כך:
    const longPressHandlers = useLongPress(() => {
      if (isMobile) {
        setShowMobileDragMsg(true);
        setTimeout(() => setShowMobileDragMsg(false), 2000);
      }
    }, 400);

    // אם ה-hook שלך תומך באופציה { shouldPreventDefault: boolean }, נסה:
    // const longPressHandlers = useLongPress(..., { shouldPreventDefault: true });

    // בנוסף, מנע ברירת מחדל גם על onContextMenu של התור (מונע מגדלת/תפריט)
    // ...existing code...

    const calculateDynamicPosition = useCallback((startTime: string, endTime: string, draggedEnd?: string) => {
      const startDate = parseISO(startTime);
      let endDate = parseISO(endTime);
      if (draggedEnd) {
        const [hours, minutes] = draggedEnd.split(':').map(Number);
        endDate = new Date(endDate);
        endDate.setHours(hours, minutes, 0, 0);
      }
      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
      const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
      const heightInMinutes = endMinutes - startMinutes;
      const heightInHours = heightInMinutes / 60;
      const heightInPixels = Math.max(Math.round(heightInHours * CELL_HEIGHT), 24);
      const startInHours = startMinutes / 60;
      const topInPixels = Math.round(startInHours * CELL_HEIGHT);
      return {
        top: `${topInPixels}px`,
        height: `${heightInPixels}px`,
        left: '0.5rem',
        right: '0.5rem',
        position: 'absolute' as const,
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden' as const,
        willChange: 'transform, height, top',
        zIndex: 20,
        transition: isResizing ? 'height 0.1s ease-out' : 'none'
      };
    }, [isResizing]);

    const handleDragStart = (e: any, appointment: Appointment, type: 'move' | 'top' | 'bottom' = 'move') => {
      if (appointment.status === 'canceled' || appointment.status === 'completed') {
        e.preventDefault();
        return;
      }

      const gridRect = gridRef.current?.getBoundingClientRect();

      dragStartRef.current = {
        y: getClientY(e),
        startTime: parseISO(appointment.start_time),
        endTime: parseISO(appointment.end_time),
        gridTop: gridRect?.top || 0
      };

      setDraggedAppointment(appointment);
      setDraggedTime(format(parseISO(appointment.start_time), 'HH:mm', { locale: he }));
      setDraggedEndTime(format(parseISO(appointment.end_time), 'HH:mm', { locale: he }));
      setDragType(type);
      setIsResizing(type !== 'move');

      if (type !== 'move') {
        e.stopPropagation();
      }
    };

    // שיפור גרירה חלקה במובייל:
    // הבעיה: גרירה "קופצת" כי deltaY מחושב לפי clientY של האירוע, אבל framer-motion כבר מזיז את האלמנט.
    // הפתרון: אל תשתמש ב-hooks (useRef/useEffect) כאן!
    // const aptRef = useRef<HTMLDivElement>(null);
    // useEffect(() => { ... }, []);

    // עדכן handleDrag לקבל info ולחשב deltaY נכון:
    const handleDrag = (e: any, appointment: Appointment, info?: { point: { y: number } }) => {
      if (!dragStartRef.current.startTime || !dragStartRef.current.endTime || !dragType) return;

      // חשב את Y הנוכחי של הגרירה
      const currentY = info?.point?.y ?? getClientY(e);

      // חשב את Y של תחילת הגרירה (יחסית לגריד)
      const gridTop = dragStartRef.current.gridTop || 0;
      const relativeY = currentY - gridTop;

      // הגן על parseISO/Date אם startTime/endTime הם null
      if (!dragStartRef.current.startTime || !dragStartRef.current.endTime) return;

      // חשב את השעה החדשה לפי Y
      const minutesFromTop = Math.max(0, Math.round(relativeY / CELL_HEIGHT * 60));
      const newStartTime = new Date(dragStartRef.current.startTime);
      newStartTime.setHours(0, 0, 0, 0);
      newStartTime.setMinutes(minutesFromTop);

      // שמור על משך התור
      const duration = parseISO(apt.end_time).getTime() - parseISO(apt.start_time).getTime();
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // עיגול ל-5 דקות
      newStartTime.setMinutes(Math.round(newStartTime.getMinutes() / 5) * 5);
      newEndTime.setMinutes(Math.round(newEndTime.getMinutes() / 5) * 5);

      // עדכן draggedTime/draggedEndTime
      setDraggedTime(format(newStartTime, 'HH:mm', { locale: he }));
      setDraggedEndTime(format(newEndTime, 'HH:mm', { locale: he }));

      // עדכן draggedAppointment עם השעות החדשות (למיקום ויזואלי)
      setDraggedAppointment({
        ...appointment,
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      });
    };

    // בסיום גרירה: הסתר overlay
    const handleDragEnd = async (e: any, appointment: Appointment, staffId: string) => {
      if (!dragStartRef.current.startTime || !dragStartRef.current.endTime || !dragType) return;

      try {
        const deltaY = getClientY(e) - dragStartRef.current.y;
        const minutesPerPixel = 60 / CELL_HEIGHT;
        const deltaMinutes = Math.round(deltaY * minutesPerPixel / DRAG_SNAP) * DRAG_SNAP;

        let newStartDate = dragStartRef.current.startTime;
        let newEndDate = dragStartRef.current.endTime;

        if (dragType === 'top') {
          newStartDate = addMinutes(dragStartRef.current.startTime, deltaMinutes);
          if (newEndDate.getTime() - newStartDate.getTime() < 15 * 60 * 1000) {
            toast.error('משך התור חייב להיות לפחות 15 דקות');
            return;
          }
        } else if (dragType === 'bottom') {
          newEndDate = addMinutes(dragStartRef.current.endTime, deltaMinutes);
          if (newEndDate.getTime() - newStartDate.getTime() < 15 * 60 * 1000) {
            toast.error('משך התור חייב להיות לפחות 15 דקות');
            return;
          }
          if (newEndDate.getTime() - newStartDate.getTime() > 4 * 60 * 60 * 1000) {
            toast.error('משך התור לא יכול לעלות על 4 שעות');
            return;
          }
        } else {
          newStartDate = addMinutes(dragStartRef.current.startTime, deltaMinutes);
          const duration = dragStartRef.current.endTime.getTime() - dragStartRef.current.startTime.getTime();
          newEndDate = new Date(newStartDate.getTime() + duration);
        }

        const staffHour = staffHours[staffId];
        if (!staffHour?.is_active) {
          toast.error('איש הצוות לא זמין ביום זה');
          return;
        }

        const [startHour, startMinute] = staffHour.start_time.split(':').map(Number);
        const [endHour, endMinute] = staffHour.end_time.split(':').map(Number);

        const workStart = new Date(selectedDate);
        workStart.setHours(startHour, startMinute, 0, 0);

        const workEnd = new Date(selectedDate);
        workEnd.setHours(endHour, endMinute, 0, 0);

        if (newStartDate < workStart || newEndDate > workEnd) {
          toast.error('התור חייב להיות בתוך שעות העבודה');
          return;
        }

        const otherAppointments = appointments.filter(apt =>
          apt.staff_id === staffId && apt.id !== appointment.id
        );

        const hasOverlap = otherAppointments.some(apt => {
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return (
            (newStartDate >= aptStart && newStartDate < aptEnd) ||
            (newEndDate > aptStart && newEndDate <= aptEnd) ||
            (newStartDate <= aptStart && newEndDate >= aptEnd)
          );
        });

        if (hasOverlap) {
          toast.error('קיימת חפיפה עם תור אחר');
          return;
        }

        setLocalAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointment.id
              ? {
                  ...apt,
                  start_time: newStartDate.toISOString(),
                  end_time: newEndDate.toISOString(),
                  updated_at: new Date().toISOString(),
                }
              : apt
          )
        );

        const { error } = await supabase
          .from('appointments')
          .update({
            start_time: newStartDate.toISOString(),
            end_time: newEndDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id);

        if (error) throw error;

        const { error: logError } = await supabase
          .from('appointment_logs')
          .insert({
            appointment_id: appointment.id,
            user_id: user?.id,
            action: 'time_change',
            old_status: null,
            new_status: null,
            details: {
              timestamp: new Date().toISOString(),
              user_name: user?.user_metadata?.name || user?.email,
              old_time: format(dragStartRef.current.startTime, 'HH:mm', { locale: he }),
              new_time: format(newStartDate, 'HH:mm', { locale: he }),
              reason: dragType === 'move' ? 'שינוי זמן תור' : 'שינוי משך תור'
            }
          });

        if (logError) throw logError;

        toast.success('זמן התור עודכן בהצלחה');
        if (typeof refreshAppointments === 'function') {
          refreshAppointments();
        }
      } catch (error: any) {
        console.error('Error updating appointment:', error);
        toast.error(error.message || 'שגיאה בעדכון התור');
      } finally {
        setDraggedTime(null);
        setDraggedEndTime(null);
        setDraggedAppointment(null);
        setIsResizing(false);
        setDragType(null);
        dragStartRef.current = { y: 0, startTime: null, endTime: null, gridTop: 0 };
        setDraggingEnabled(false);
        setShowMobileOverlay(false);
      }
    };

    // פתרון UX מודרני: נסה לאפשר גרירה, ואם מתגלה כישלון (drag לא עובד/לא זז), הצג טוסט/הודעה קטנה למשתמש
    // (למשל, אם אחרי dragStart לא קיבלנו dragEnd תוך 2 שניות - כנראה יש בעיה במובייל)

    // ניהול state לזיהוי drag בעייתי
    const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);

    // טוסט/הודעה למשתמש
    const [showDragError, setShowDragError] = useState(false);

    // הימנע מהגדרה כפולה של handleDragStartWithTimeout/handleDragEndWithTimeout
    // מחק את ההגדרה הקודמת של handleDragStartWithTimeout ו-handleDragEndWithTimeout לפני השורה הזו אם קיימת

    // ניהול נקודת Y אחרונה לגרירה חלקה
    const lastYRef = useRef<number | null>(null);

    // עוטף את handleDragStart
    const handleDragStartWithTimeout = (e: any, appointment: Appointment, type: 'move' | 'top' | 'bottom' = 'move') => {
      lastYRef.current = null;
      handleDragStart(e, appointment, type);
      if (isMobile) {
        if (dragTimeout) clearTimeout(dragTimeout);
        const timeout = setTimeout(() => {
          setShowDragError(true);
        }, 2000);
        setDragTimeout(timeout);
      }
    };

    // עוטף את handleDragEnd
    const handleDragEndWithTimeout = async (e: any, appointment: Appointment, staffId: string) => {
      lastYRef.current = null;
      if (dragTimeout) clearTimeout(dragTimeout);
      setShowDragError(false);
      setDraggedTime(null);
      setDraggedEndTime(null);
      await handleDragEnd(e, appointment, staffId);
    };

    // Modern mobile experience: always show the calendar, allow drag, and show a tip if on mobile
    const showMobileTip = isMobile;

    // אזור ייעודי לגרירה (Drag Zone) - במובייל בלבד
    // המשתמש ילחץ על כפתור קטן בתור, ורק אז יוכל לגרור (drag) את התור
    const [dragZoneActiveId, setDragZoneActiveId] = useState<string | null>(null);

    // הוסף polling שמרענן את התורים כל כמה שניות (למשל, כל 5 שניות).
    useEffect(() => {
      if (!refreshAppointments) return;
      const interval = setInterval(() => {
        refreshAppointments();
      }, 5000); // כל 5 שניות
      return () => clearInterval(interval);
    }, [refreshAppointments]);

    // הגדר את firstAptRef בראש הקומפוננטה (כבר קיים אצלך):
    const firstAptRef = useRef<HTMLDivElement>(null);

    // גלילה אוטומטית לתור הראשון ביום (השתמש ב-useEffect)
    useEffect(() => {
      // Debug: הדפס את מצב התורים וה-ref
      // eslint-disable-next-line no-console
      console.log('AppointmentsGrid debug:', {
        appointments,
        staff,
        firstAptRef: firstAptRef.current,
        gridRef: gridRef.current,
        appointmentsByStaff: Array.from(appointmentsByStaff.entries()).map(([k, v]) => [k, v.length])
      });

      // אל תבצע גלילה אם אין תורים בכלל
      if (!appointments || appointments.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No appointments, skip scroll');
        return;
      }

      // מצא את התור הראשון בפועל (לא רק firstAptRef)
      if (firstAptRef.current) {
        // eslint-disable-next-line no-console
        console.log('Scrolling to firstAptRef');
        firstAptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // eslint-disable-next-line no-console
        console.log('firstAptRef.current is null');
      }
    }, [appointments, selectedDate, staff]);

    // בדוק אם יש תור שמתחיל ב-09:00 או כל קיבוע אחר
    useEffect(() => {
      if (appointments && appointments.length > 0) {
        const nineApt = appointments.find(
          apt => {
            const d = parseISO(apt.start_time);
            return d.getHours() === 9 && d.getMinutes() === 0;
          }
        );
        if (nineApt) {
          // eslint-disable-next-line no-console
          console.log('יש תור שמתחיל ב-09:00:', nineApt);
        }
      }
    }, [appointments]);

    // בדוק את TIME_SLOTS - האם הוא מגדיר רק שעות 09:00 עד 17:00?
    console.log('TIME_SLOTS:', TIME_SLOTS);

    // Debug: הדפס שעות פעילות לכל איש צוות
    useEffect(() => {
      staff.forEach((member) => {
        const hours = staffHours[member.id];
        if (hours) {
          // eslint-disable-next-line no-console
          console.log(
            `שעות פעילות של ${member.name}: ${hours.start_time} - ${hours.end_time} (is_active=${hours.is_active})`
          );
        }
      });
    }, [staff, staffHours]);

    return (
      <div
        ref={gridRef}
        className="flex-1 bg-white overflow-y-auto"
        style={{
          height: '100vh',
          minHeight: `${CELL_HEIGHT * 24 + 120}px`,
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          overflowY: 'scroll'
        }}
      >
        {/* הודעה על גרירה לא נתמכת במובייל */}
        {isMobile && showMobileDragMsg && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
            גרירת תורים אינה נתמכת במובייל
          </div>
        )}
        {/* הסר את פס ההודעה ואת ה-overlay במובייל */}
        {/* הסר את כותרת אנשי הצוות (StaffHeader) */}
        {/* <StaffHeader staff={staff} staffHours={staffHours} /> */}
        <div
          ref={constraintsRef}
          className="relative w-full"
          style={{
            minHeight: `${CELL_HEIGHT * 24 + 120}px`,
            height: `${CELL_HEIGHT * 24 + 120}px`,
            paddingRight: '1rem'
          }}
        >
          {/* הסר את הכותרת הישנה של אנשי הצוות כאן אם קיימת */}
          <div className="flex w-full h-full">
            {staff.map((member) => {
              const staffAppointments = appointmentsByStaff.get(member.id) || [];
              // שלב 1: שלוף שעות פעילות
              const hours = staffHours[member.id];
              let activeStart = 0, activeEnd = 24;
              if (hours && hours.is_active && hours.start_time && hours.end_time) {
                const [sh, sm] = hours.start_time.split(':').map(Number);
                const [eh, em] = hours.end_time.split(':').map(Number);
                activeStart = sh + (sm > 0 ? sm / 60 : 0);
                activeEnd = eh + (em > 0 ? em / 60 : 0);
              }
              return (
                <div key={member.id} className="w-full relative h-full">
                  <div
                    className="absolute inset-0"
                    style={{
                      height: `${CELL_HEIGHT * 24}px`,
                      minHeight: `${CELL_HEIGHT * 24}px`,
                      pointerEvents: 'auto'
                    }}
                  >
                    {/* שעות היומן */}
                    {TIME_SLOTS.map((hour) => {
                      const slotStyle = getTimeSlotStyle(hour, member.id);
                      // שלב 2: בדוק אם הסלוט בשעות פעילות
                      const isActive = hour >= activeStart && hour < activeEnd;
                      // Debug: הדפס האם הסלוט פעיל
                      if (!isActive) {
                        // eslint-disable-next-line no-console
                        console.log(
                          `סלוט לא פעיל: staff=${member.name} שעה=${hour}:00 (activeStart=${activeStart}, activeEnd=${activeEnd})`
                        );
                      }
                      return (
                        <div
                          key={hour}
                          style={{
                            height: `${CELL_HEIGHT}px`,
                            ...slotStyle.style,
                            background: !isActive
                              ? 'repeating-linear-gradient(135deg, #f3f4f6 0px, #f3f4f6 8px, #e5e7eb 8px, #e5e7eb 16px)'
                              : undefined,
                            opacity: !isActive ? 0.7 : 1,
                            filter: !isActive ? 'blur(0.5px) grayscale(0.2)' : undefined,
                            pointerEvents: isActive ? 'auto' : 'none'
                          }}
                          className={`border-b border-r border-gray-200 p-2 relative ${slotStyle.className} ${!isActive ? 'bg-gray-100' : ''}`}
                          data-debug-active={isActive ? 'active' : 'inactive'}
                          onClick={() => {
                            if (!isActive) return;
                            const date = new Date(selectedDate);
                            date.setHours(hour, 0, 0, 0);
                            onTimeSlotClick?.(date, member.id);
                          }}
                        />
                      );
                    })}
                    {/* תורים */}
                    {staffAppointments.map((apt, i) => {
                      // הגדר משתני עיצוב סטטוס לפני ה-return
                      let statusColor = '';
                      let borderColor = '';
                      let icon = null;
                      let badgeText = '';
                      let badgeColor = '';
                      switch (apt.status) {
                        case 'confirmed':
                          statusColor = 'bg-gradient-to-l from-blue-50 to-white';
                          borderColor = 'border-blue-400';
                          icon = <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                          badgeText = 'מאושר';
                          badgeColor = 'bg-blue-100 text-blue-700';
                          break;
                        case 'completed':
                          statusColor = 'bg-gradient-to-l from-green-50 to-white';
                          borderColor = 'border-green-400';
                          icon = <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M8 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                          badgeText = 'הושלם';
                          badgeColor = 'bg-green-100 text-green-700';
                          break;
                        case 'no_show':
                          statusColor = 'bg-gradient-to-l from-orange-50 to-white';
                          borderColor = 'border-orange-400';
                          icon = <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                          badgeText = 'לא הגיע';
                          badgeColor = 'bg-orange-100 text-orange-700';
                          break;
                        case 'canceled':
                          statusColor = 'bg-gradient-to-l from-red-50 to-white';
                          borderColor = 'border-red-400';
                          icon = <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
                          badgeText = 'בוטל';
                          badgeColor = 'bg-red-100 text-red-700';
                          break;
                        default:
                          statusColor = 'bg-gradient-to-l from-gray-50 to-white';
                          borderColor = 'border-gray-300';
                          icon = <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/></svg>;
                          badgeText = 'ממתין';
                          badgeColor = 'bg-gray-100 text-gray-600';
                      }

                      // הפעל drag תמיד בדסקטופ, ובמובייל רק אם dragZoneActiveId === apt.id
                      const dragEnabled = !isMobile || dragZoneActiveId === apt.id;
                      const isBeingDragged = draggedAppointment?.id === apt.id;

                      // הצג תמיד את השעה מתוך localAppointments (ולא apt מה props)
                      const localApt = localAppointments.find(a => a.id === apt.id) || apt;
                      const displayStart = localApt.start_time;
                      const displayEnd = localApt.end_time;

                      // הגדר position לפני ה-return
                      const position = isBeingDragged
                        ? calculateAppointmentPosition(draggedAppointment.start_time, draggedAppointment.end_time)
                        : calculateAppointmentPosition(apt.start_time, apt.end_time);

                      return (
                        <motion.div
                          key={apt.id}
                          ref={i === 0 ? firstAptRef : undefined}
                          {...(isMobile && !dragEnabled ? longPressHandlers : {})}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.01, translateZ: 0 }}
                          drag={dragEnabled ? "y" : false}
                          dragMomentum={false}
                          dragElastic={0}
                          dragTransition={{ power: 0.01, timeConstant: 600, restDelta: 0.001 }}
                          dragConstraints={constraintsRef}
                          style={{
                            ...position,
                            touchAction: 'none',
                            willChange: 'transform, height, top',
                            transform: 'translate3d(0, 0, 0)',
                            backfaceVisibility: 'hidden',
                            boxShadow: isBeingDragged
                              ? '0 8px 32px 0 #60a5fa55'
                              : '0 2px 12px 0 #e0e7ef33'
                          }}
                          onDragStart={(e) => {
                            if (dragEnabled) {
                              handleDragStart(e, apt, 'move');
                            }
                          }}
                          onDrag={(e, info) => {
                            if (dragEnabled) {
                              // השתמש תמיד ב-info.point.y (אם קיים) ואל תעדכן localAppointments כאן
                              const currentY = info?.point?.y ?? getClientY(e);
                              const gridTop = dragStartRef.current.gridTop || 0;
                              const relativeY = currentY - gridTop;
                              if (!dragStartRef.current.startTime || !dragStartRef.current.endTime) return;
                              const minutesFromTop = Math.max(0, Math.round(relativeY / CELL_HEIGHT * 60));
                              const newStartTime = new Date(dragStartRef.current.startTime);
                              newStartTime.setHours(0, 0, 0, 0);
                              newStartTime.setMinutes(minutesFromTop);
                              const duration = parseISO(apt.end_time).getTime() - parseISO(apt.start_time).getTime();
                              const newEndTime = new Date(newStartTime.getTime() + duration);
                              newStartTime.setMinutes(Math.round(newStartTime.getMinutes() / 5) * 5);
                              newEndTime.setMinutes(Math.round(newEndTime.getMinutes() / 5) * 5);
                              setDraggedAppointment({
                                ...apt,
                                start_time: newStartTime.toISOString(),
                                end_time: newEndTime.toISOString(),
                              });
                              setDraggedTime(format(newStartTime, 'HH:mm', { locale: he }));
                              setDraggedEndTime(format(newEndTime, 'HH:mm', { locale: he }));
                              // עדכן גם את localAppointments בזמן גרירה
                              setLocalAppointments((prev) =>
                                prev.map((item) =>
                                  item.id === apt.id
                                    ? {
                                        ...item,
                                        start_time: newStartTime.toISOString(),
                                        end_time: newEndTime.toISOString(),
                                        updated_at: new Date().toISOString(),
                                      }
                                    : item
                                )
                              );
                            }
                          }}
                          onDragEnd={async (e) => {
                            if (dragEnabled) {
                              // שמור לשרת את הזמן החדש
                              const dragged = draggedAppointment || apt;
                              try {
                                setDraggedAppointment(null);
                                setDraggedTime(null);
                                setDraggedEndTime(null);

                                // שמור בשרת
                                await supabase
                                  .from('appointments')
                                  .update({
                                    start_time: dragged.start_time,
                                    end_time: dragged.end_time,
                                    updated_at: new Date().toISOString(),
                                  })
                                  .eq('id', dragged.id);

                                toast.success('התור עודכן בהצלחה');
                              } catch (error: any) {
                                toast.error('שגיאה בעדכון התור');
                              }
                              setDragZoneActiveId(null);
                            }
                          }}
                          onContextMenu={isMobile ? (e) => e.preventDefault() : undefined}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                          className={`absolute inset-x-1 p-3 rounded-2xl shadow-lg transition-all duration-150 border-l-4
        ${statusColor} ${borderColor}
        ${isResizing ? 'cursor-ns-resize' : dragEnabled ? 'cursor-grabbing' : 'cursor-pointer'}
        ${getStatusColor(apt.status, Boolean(apt.metadata?.paid), Boolean(apt.metadata?.invoice_id))}
        ${isBeingDragged && dragEnabled ? 'ring-2 ring-blue-500 bg-blue-50 shadow-xl' : ''}`}
                        >
                          <div className="flex flex-col h-full relative">
                            {/* zone button במובייל */}
                            {isMobile && (
                              <button
                                type="button"
                                className={`absolute left-1/2 top-1/2 z-30 bg-gray-200 text-gray-600 rounded-full w-8 h-8 flex items-center justify-center shadow border transition
                                  ${dragZoneActiveId === apt.id ? 'bg-gray-400 scale-110 text-white' : 'bg-gray-200 opacity-80'}
                                `}
                                style={{
                                  transform: 'translate(-50%, -50%)',
                                  touchAction: 'none',
                                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDragZoneActiveId(dragZoneActiveId === apt.id ? null : apt.id);
                                }}
                                tabIndex={-1}
                                aria-label="הפעל גרירה"
                              >
                                {/* אייקון drag-handle פשוט */}
                                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                                  <rect x="6" y="8" width="12" height="2" rx="1" fill="currentColor" />
                                  <rect x="6" y="14" width="12" height="2" rx="1" fill="currentColor" />
                                </svg>
                              </button>
                            )}
                            {/* תוכן התור */}
                            <div className="flex items-center gap-2 mb-1">
                              {icon}
                              <span className="font-medium truncate text-base md:text-sm">{apt.customers?.name}</span>
                              <span className="text-xs ml-auto font-mono">
                                {format(parseISO(displayStart), 'HH:mm', { locale: he })}
                                {' - '}
                                {format(parseISO(displayEnd), 'HH:mm', { locale: he })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs truncate opacity-90">{apt.services?.name_he}</span>
                              <span className="text-xs truncate opacity-75 mr-1 rtl:ml-1">{apt.customers?.phone}</span>
                              {apt.metadata?.price && (
                                <span className="text-xs bg-green-100 text-green-700 rounded px-2 py-0.5 ml-1">₪{apt.metadata.price}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${badgeColor}`}>{badgeText}</span>
                              {apt.metadata?.paid && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-1">שולם</span>
                              )}
                            </div>
                            {/* ...existing code for drag handles... */}
                            {!isMobile && (
                              <motion.div
                                className="absolute -top-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-10"
                                drag="y"
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={constraintsRef}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, apt, 'top');
                                }}
                                onDrag={(e) => handleDrag(e, apt)}
                                onDragEnd={(e) => handleDragEnd(e, apt, member.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                            {!isMobile && (
                              <motion.div
                                className="absolute -bottom-1 left-0 right-0 h-2 cursor-ns-resize hover:bg-black/10 z-10"
                                drag="y"
                                dragMomentum={false}
                                dragElastic={0}
                                dragConstraints={constraintsRef}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  handleDragStart(e, apt, 'bottom');
                                }}
                                onDrag={(e) => handleDrag(e, apt)}
                                onDragEnd={(e) => handleDragEnd(e, apt, member.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                    {/* פתרון מודרני: תמיד אפשר לגלול ולהוסיף תור גם אם אין תורים */}
                    {staffAppointments.length === 0 && (
                      <div
                        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-center text-gray-300 text-sm select-none pointer-events-none"
                      >
                        אין תורים ליום זה
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
));

AppointmentsGrid.displayName = 'AppointmentsGrid';

export { AppointmentsGrid };
