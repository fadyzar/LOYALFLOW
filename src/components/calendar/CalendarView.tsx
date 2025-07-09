import React, { useState, useRef } from 'react';
import { format, addDays, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;
  staffId: string;
}

interface Props {
  appointments: Appointment[];
  staffId?: string;
  onSelectAppointment: (apt: Appointment) => void;
  onDragEnd?: (aptId: string, newStartTime: string) => void;
}

const hours = Array.from({ length: 14 }, (_, i) => 7 + i); // 07:00 - 21:00

export const CalendarView: React.FC<Props> = ({
  appointments,
  staffId,
  onSelectAppointment,
  onDragEnd,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // DEBUG: בדוק אם dragConstraints מקבל ref תקין
  React.useEffect(() => {
    if (!containerRef.current) {
      console.warn('containerRef is null');
    }
  }, [containerRef.current]);

  const filteredAppointments = appointments.filter((a) => {
    const dateOnly = a.start.split('T')[0];
    return (
      format(selectedDate, 'yyyy-MM-dd') === dateOnly &&
      (!staffId || a.staffId === staffId)
    );
  });

  const handleDragEnd = (apt: Appointment, deltaY: number) => {
    const minutesMoved = Math.round((deltaY / 70) * 60);
    const start = new Date(apt.start);
    start.setMinutes(start.getMinutes() + minutesMoved);
    const newStartTime = start.toISOString();
    onDragEnd?.(apt.id, newStartTime);
  };

  const renderNowLine = () => {
    if (!isToday(selectedDate)) return null;

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const top = ((hour + minute / 60) - 7) * 70;

    return (
      <div
        className="absolute left-0 right-0 h-[2px] bg-red-500 z-10"
        style={{ top }}
      />
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-between items-center px-4 py-2">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
          <ArrowLeft />
        </button>
        <span className="font-bold text-lg">{format(selectedDate, 'dd/MM/yyyy')}</span>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
          <ArrowRight />
        </button>
      </div>

      {/* גלילה חלקה: הגדר minHeight בלבד, בלי height/fixed/maxHeight */}
      <div
        ref={containerRef}
        className="relative border rounded-lg bg-gray-50"
        style={{
          position: 'relative',
          touchAction: 'none',
          minHeight: `${hours.length * 70}px`, // 14*70=980
        }}
      >
        {renderNowLine()}

        {hours.map((h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t text-xs text-gray-400"
            style={{ top: `${(h - 7) * 70}px`, pointerEvents: 'none', zIndex: 1 }}
          >
            <div className="pl-2">{h.toString().padStart(2, '0')}:00</div>
          </div>
        ))}

        {filteredAppointments.map((apt) => {
          const [hour, minute] = apt.start.split('T')[1].split(':').map(Number);
          const [endHour, endMinute] = apt.end.split('T')[1].split(':').map(Number);

          const top = ((hour + minute / 60) - 7) * 70;
          const height = ((endHour + endMinute / 60) - (hour + minute / 60)) * 70;

          return (
            <motion.div
              key={apt.id}
              className="absolute left-12 right-4 rounded-md shadow-md bg-indigo-600 text-white p-2 text-sm cursor-pointer"
              style={{ top, height, pointerEvents: 'auto', zIndex: 2 }}
              drag="y"
              dragConstraints={containerRef}
              dragElastic={0.1}
              whileTap={{ scale: 0.98 }}
              tabIndex={0} // מאפשר פוקוס ו־drag במקלדת
              onDragStart={() => { console.log('drag start', apt.id); }}
              onDragEnd={(_, info) => {
                console.log('drag end', apt.id, info);
                handleDragEnd(apt, info.delta.y);
              }}
              onClick={() => onSelectAppointment(apt)}
            >
              {apt.title}
              <div className="text-xs mt-1 text-white/80">
                {apt.start.split('T')[1].slice(0, 5)} - {apt.end.split('T')[1].slice(0, 5)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
