import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { format, parseISO, addMinutes, setHours, setMinutes } from 'date-fns';
import { he } from 'date-fns/locale';
import { Staff, Appointment, StaffHours } from '../types';
import { CELL_HEIGHT, TIME_SLOTS, DRAG_SNAP } from '../constants';
import { calculateAppointmentPosition, getStatusColor } from '../utils';
import { useTimeSlots } from '../hooks/useTimeSlots';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/auth/hooks';
import toast from 'react-hot-toast';
import { useLongPress } from '../../../../hooks/useLongPress';


interface AppointmentsGridProps {
  staff: Staff[];
  staffHours: Record<string, StaffHours>;
  appointments: Appointment[];
  selectedDate: Date;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick?: (date: Date, staffId: string) => void;
}


const AppointmentsGrid = React.memo(React.forwardRef<HTMLDivElement, AppointmentsGridProps>(
  function AppointmentsGrid({ staff, staffHours, appointments, selectedDate, onAppointmentClick, onTimeSlotClick }, ref) {
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

    useEffect(() => {
      // Enable drag by default on desktop, require long-press on touch devices
      if (!isTouchDevice) {
        setDraggingEnabled(true);
      }
    }, [isTouchDevice]);

    const appointmentsByStaff = useMemo(() => {
      const map = new Map<string, Appointment[]>();
      appointments.forEach(apt => {
        if (!map.has(apt.staff_id)) {
          map.set(apt.staff_id, []);
        }
        map.get(apt.staff_id)?.push(apt);
      });
      return map;
    }, [appointments]);

    useEffect(() => {
      if (isDraggingEnabled) {
        document.body.style.overflow = 'hidden';
        navigator.vibrate?.(50); // רטט קטן
      } else {
        document.body.style.overflow = '';
      }
    }, [isDraggingEnabled]);

    const longPressHandlers = useLongPress(() => {
      console.log('⏱ לחיצה ארוכה הופעלה');
      setDraggingEnabled(true);
    }, 400);


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
        y: e.clientY,
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

    const handleDrag = (e: any, appointment: Appointment) => {
      if (!dragStartRef.current.startTime || !dragStartRef.current.endTime || !dragType) return;

      const deltaY = e.clientY - dragStartRef.current.y;
      const minutesPerPixel = 60 / CELL_HEIGHT;
      const deltaMinutes = Math.round(deltaY * minutesPerPixel / DRAG_SNAP) * DRAG_SNAP;

      if (dragType === 'top') {
        // שינוי זמן התחלה
        const newStartTime = addMinutes(dragStartRef.current.startTime, deltaMinutes);
        const endTime = dragStartRef.current.endTime;

        // מינימום 15 דקות לתור
        if (endTime.getTime() - newStartTime.getTime() < 15 * 60 * 1000) {
          return;
        }

        // עיגול לקפיצות של 5 דקות
        const roundedMinutes = Math.round(newStartTime.getMinutes() / 5) * 5;
        newStartTime.setMinutes(roundedMinutes);

        setDraggedTime(format(newStartTime, 'HH:mm', { locale: he }));
      } else if (dragType === 'bottom') {
        // שינוי זמן סיום
        const newEndTime = addMinutes(dragStartRef.current.endTime, deltaMinutes);
        const startTime = dragStartRef.current.startTime;

        // מינימום 15 דקות לתור
        if (newEndTime.getTime() - startTime.getTime() < 15 * 60 * 1000) {
          return;
        }

        // מקסימום 4 שעות לתור
        if (newEndTime.getTime() - startTime.getTime() > 4 * 60 * 60 * 1000) {
          return;
        }

        // עיגול לקפיצות של 5 דקות
        const roundedMinutes = Math.round(newEndTime.getMinutes() / 5) * 5;
        newEndTime.setMinutes(roundedMinutes);

        setDraggedEndTime(format(newEndTime, 'HH:mm', { locale: he }));
      } else {
        // הזזת כל התור
        const newStartTime = addMinutes(dragStartRef.current.startTime, deltaMinutes);
        const duration = dragStartRef.current.endTime.getTime() - dragStartRef.current.startTime.getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);

        // עיגול לקפיצות של 5 דקות
        const roundedStartMinutes = Math.round(newStartTime.getMinutes() / 5) * 5;
        newStartTime.setMinutes(roundedStartMinutes);

        const roundedEndMinutes = Math.round(newEndTime.getMinutes() / 5) * 5;
        newEndTime.setMinutes(roundedEndMinutes);

        setDraggedTime(format(newStartTime, 'HH:mm', { locale: he }));
        setDraggedEndTime(format(newEndTime, 'HH:mm', { locale: he }));
      }
    };

    const handleDragEnd = async (e: any, appointment: Appointment, staffId: string) => {
  if (!dragStartRef.current.startTime || !dragStartRef.current.endTime || !dragType) return;

  try {
    const deltaY = e.clientY - dragStartRef.current.y;
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
  }
};

    return (
      <div
        // ref={ref}
        ref={gridRef}
        className="flex-1 overflow-y-auto scrollbar-none overscroll-none h-full"

        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'none',
          height: '100%'
        }}
      >
        <div
          ref={constraintsRef}
          className="relative w-full"
          style={{
            height: `${CELL_HEIGHT * 24 + 120}px`,
            minHeight: '100%',
            paddingRight: '1rem'
          }}
        >
          <div className="flex w-full h-full">
            {staff.map((member) => {
              const staffAppointments = appointmentsByStaff.get(member.id) || [];

              return (
                <div key={member.id} className="w-full relative h-full">
                  <div className="absolute inset-0">
                    {TIME_SLOTS.map((hour) => {
                      const slotStyle = getTimeSlotStyle(hour, member.id);
                      return (
                        <div
                          key={hour}
                          style={{
                            height: `${CELL_HEIGHT}px`,
                            ...slotStyle.style
                          }}
                          className={`border-b border-r border-gray-200 p-2 relative ${slotStyle.className}`}
                          onClick={() => {
                            const date = new Date(selectedDate);
                            date.setHours(hour, 0, 0, 0);
                            onTimeSlotClick?.(date, member.id);
                          }}
                        />
                      );
                    })}

                    {staffAppointments.map((apt, i) => {
                      const isBeingDragged = draggedAppointment?.id === apt.id;
                      const position = isBeingDragged
                        ? calculateDynamicPosition(apt.start_time, apt.end_time, draggedEndTime || undefined)
                        : calculateAppointmentPosition(apt.start_time, apt.end_time);

                      const aptRef = useRef<HTMLDivElement>(null);

                      useEffect(() => {
                        if (i === 0 && aptRef.current) {
                          aptRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, []);

                      return (
                        <motion.div
                         
                          key={apt.id}
                          ref={i === 0 ? aptRef : null}
                          {...longPressHandlers}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.02, translateZ: 0 }}
                          drag={isDraggingEnabled ? "y" : false}
                          dragMomentum={false}
                          dragElastic={0}
                          dragConstraints={constraintsRef}
                          onDragStart={(e) => handleDragStart(e, apt, 'move')}
                          onDrag={(e) => handleDrag(e, apt)}
                          onDragEnd={(e) => handleDragEnd(e, apt, member.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                          className={`absolute inset-x-1 p-2 rounded-lg
        ${isResizing ? 'cursor-ns-resize' : 'cursor-move'}
        ${getStatusColor(apt.status, Boolean(apt.metadata?.paid), Boolean(apt.metadata?.invoice_id))}
        ${isBeingDragged && isDraggingEnabled ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' : ''}`}
                          style={{
                            ...position,
                            // touchAction: 'none',
                            willChange: 'transform, height, top',
                            transform: 'translate3d(0, 0, 0)',
                            backfaceVisibility: 'hidden'
                          }}
                        >
                          <div className="flex flex-col h-full relative">
                            {/* Top Resize Handle */}
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

                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">{apt.customers?.name}</span>
                              <span className="text-xs">
                                {isBeingDragged ? draggedTime : format(parseISO(apt.start_time), 'HH:mm', { locale: he })}
                                {' - '}
                                {isBeingDragged ? draggedEndTime : format(parseISO(apt.end_time), 'HH:mm', { locale: he })}
                              </span>
                            </div>
                            <div className="text-xs mt-0.5 flex items-center justify-between">
                              <span className="truncate opacity-90">{apt.services?.name_he}</span>
                              <span className="truncate opacity-75 mr-1 rtl:ml-1">{apt.customers?.phone}</span>
                            </div>

                            {/* Bottom Resize Handle */}
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
                          </div>
                        </motion.div>
                      );
                    })}

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

export { AppointmentsGrid };