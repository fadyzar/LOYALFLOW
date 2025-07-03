
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, isSameDay } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/auth/hooks';
import { TimeHeader } from './components/TimeHeader';
import { StaffHeader } from './components/StaffHeader';
import { TimeColumn } from './components/TimeColumn';
import { AppointmentsGrid } from './components/AppointmentsGrid';
import { CurrentTimeIndicator } from './components/CurrentTimeIndicator';
import { DayViewProps } from './types';
import { CELL_HEIGHT } from './constants';
import { useStaffHours } from './hooks/useStaffHours';
import { motion, AnimatePresence } from 'framer-motion';
import { Suspense } from 'react';

export const DayView = React.memo(function DayView({ 
  selectedDate, 
  appointments, 
  staff, 
  onAppointmentClick, 
  onTimeSlotClick, 
  showCurrentTime, 
  currentTime
}: DayViewProps) {
  const { business, user } = useAuth();
  const gridRef = useRef<HTMLDivElement>(null);
  const timeColumnRef = useRef<HTMLDivElement>(null);
  const staffHeaderRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const rafId = useRef<number | null>(null);
  const lastScrollTime = useRef<number>(0);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff[0]?.id || '');
  const { staffHours, loadStaffHours } = useStaffHours(selectedDate, staff);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    if (business?.id) {
      loadStaffHours(business.id);
      return;
    }

    const loadBusinessId = async () => {
      try {
        if (!user?.id) return;

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

        loadStaffHours(userData.business_id);
      } catch (error) {
        console.error('Error loading business ID:', error);
      }
    };

    loadBusinessId();
  }, [user?.id, business?.id, loadStaffHours]);

  const syncScroll = useCallback((source: HTMLDivElement, target: HTMLDivElement) => {
    if (Date.now() - lastScrollTime.current < 16) return; // Throttle to ~60fps
    lastScrollTime.current = Date.now();

    target.scrollTop = source.scrollTop;
  }, []);

  const handleScroll = useCallback((e: Event) => {
    if (scrollLocked) return;
    
    const source = e.target as HTMLDivElement;
    const grid = gridRef.current;
    const timeColumn = timeColumnRef.current;

    if (!grid || !timeColumn) return;

    setIsScrolling(true);

    if (source === grid) {
      syncScroll(grid, timeColumn);
    } else if (source === timeColumn) {
      syncScroll(timeColumn, grid);
    }

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      setIsScrolling(false);
    });
  }, [scrollLocked, syncScroll]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return;
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const deltaX = touchX - touchStartX.current;
    const deltaY = touchY - touchStartY.current;

    if (Math.abs(deltaX) > Math.abs(deltaY) * 2 && Math.abs(deltaX) > 100) {
      const currentIndex = staff.findIndex(s => s.id === selectedStaffId);
      let newIndex = currentIndex;

      if (deltaX > 0) {
        newIndex = currentIndex > 0 ? currentIndex - 1 : staff.length - 1; // עובר לאחרון אם בראשון
      } else if (deltaX < 0) {
        newIndex = currentIndex < staff.length - 1 ? currentIndex + 1 : 0; // עובר לראשון אם באחרון
      }

      if (newIndex !== currentIndex) {
        setIsTransitioning(true);
        setSelectedStaffId(staff[newIndex].id);
        setTimeout(() => setIsTransitioning(false), 300);
      }

      touchStartX.current = null;
      touchStartY.current = null;
    }
  }, [staff, selectedStaffId]);

  const handleTouchEnd = useCallback(() => {
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  useEffect(() => {
    const grid = gridRef.current;
    const timeColumn = timeColumnRef.current;

    if (!grid || !timeColumn) return;

    grid.addEventListener('scroll', handleScroll, { passive: true });
    timeColumn.addEventListener('scroll', handleScroll, { passive: true });

    const container = containerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (container && scrollContainer) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('touchend', handleTouchEnd, { passive: true });
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      grid.removeEventListener('scroll', handleScroll);
      timeColumn.removeEventListener('scroll', handleScroll);

      if (container && scrollContainer) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        scrollContainer.removeEventListener('scroll', handleScroll);
      }

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleStaffSelect = useCallback((staffId: string) => {
    setSelectedStaffId(staffId);
  }, []);

  const selectedStaff = staff.find(s => s.id === selectedStaffId);
  const selectedStaffAppointments = appointments.filter(apt => apt.staff_id === selectedStaffId);
  const selectedStaffHours = staffHours[selectedStaffId];

  const calculateCurrentTimePosition = (currentTime: Date) => {
    const timeColumnHeight = CELL_HEIGHT * 24;
    const currentTimeInMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const timeColumnTop = 0;
    const timeColumnBottom = timeColumnHeight;
    const currentTimePosition = ((currentTimeInMinutes - 0) / (24 * 60)) * (timeColumnBottom - timeColumnTop) + timeColumnTop;
    return currentTimePosition;
  };

  // Save scroll position before updates
  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      setScrollPosition(scrollContainerRef.current.scrollTop);
    }
  };

  // Restore scroll position after updates
  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  };

  // במקום זאת, תשתמש רק ב-appointments שמגיע מהפרופס (מהקומפוננטה הראשית)
  // שיפור: רקע מודרני ליומן
  const calendarBg = 'linear-gradient(180deg, #fff 0%, #f3f6fa 100%)';

  // טאב אנשי צוות צבעוני ודביק (sticky) - שיפור עיצוב
  const StaffTabs = (
    <div
      className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm"
      style={{
        minHeight: 56,
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="flex overflow-x-auto scrollbar-none px-2 py-1 gap-2">
        {staff.map((member) => (
          <motion.button
            key={member.id}
            onClick={() => setSelectedStaffId(member.id)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.97 }}
            className={`px-4 py-2 text-sm font-semibold rounded-full transition-all duration-150
              ${selectedStaffId === member.id
                ? 'bg-gradient-to-r from-indigo-500 to-blue-400 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-blue-50'
              }`}
            style={{
              boxShadow: selectedStaffId === member.id ? '0 2px 12px 0 #6366f140' : undefined,
              letterSpacing: '0.02em'
            }}
          >
            {member.name}
          </motion.button>
        ))}
      </div>
    </div>
  );

  // רקע דקורטיבי ליומן (פסים דקים)
  const DecorativeBg = (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: calendarBg,
      }}
    >
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${i * CELL_HEIGHT}px`,
            left: 0,
            right: 0,
            height: 1,
            borderBottom: i % 2 === 0 ? '1px solid #e5e7eb' : '1px dashed #e5e7eb',
            opacity: i % 2 === 0 ? 0.5 : 0.18,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: 24,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #e5e7eb 0%, #fff 80%)',
          opacity: 0.13,
          zIndex: 0,
        }}
      />
    </div>
  );

  // שיפור: highlight לשעה הנוכחית ביומן
  const now = new Date();
  const currentHour = now.getHours();

  // שיפור: אנימציה עדינה ל-highlight של השעה הנוכחית (מתעדכן כל דקה)
  const [highlightHour, setHighlightHour] = useState(currentHour);
  useEffect(() => {
    const interval = setInterval(() => {
      setHighlightHour(new Date().getHours());
    }, 60 * 1000); // כל דקה
    return () => clearInterval(interval);
  }, []);

  // שיפור: הצג פס אדום דק (current time line) בתוך היומן
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTimeLineTop = (nowMinutes / 60) * CELL_HEIGHT;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '100vh', background: calendarBg, position: 'relative' }}>
      {/* Staff Tabs */}
      {StaffTabs}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform',
          minHeight: `${CELL_HEIGHT * 24 + 120}px`,
          background: 'transparent',
          position: 'relative'
        }}
      >
        {/* רקע דקורטיבי */}
        {DecorativeBg}
        <div
          className="flex w-full"
          style={{
            paddingRight: '3rem',
            minHeight: `${CELL_HEIGHT * 24 + 120}px`,
            zIndex: 1,
          }}
        >
          <div className="flex-1" style={{ position: 'relative', minHeight: `${CELL_HEIGHT * 24 + 120}px` }}>
            <div
              style={{
                height: `${CELL_HEIGHT * 24 + 120}px`,
                minHeight: `${CELL_HEIGHT * 24 + 120}px`,
                overflowY: 'auto',
                background: 'transparent',
                borderRadius: 18,
                boxShadow: '0 2px 16px 0 #e0e7ef30',
                border: `1px solid #e0e7ef`,
                position: 'relative'
              }}
              className="transition-all duration-300"
            >
              {/* Highlight לשעה הנוכחית */}
              <motion.div
                animate={{ top: `${highlightHour * CELL_HEIGHT}px` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  height: `${CELL_HEIGHT}px`,
                  background: 'linear-gradient(90deg, #e0e7ff33 0%, #f0f7ff00 100%)',
                  zIndex: 2,
                  pointerEvents: 'none',
                  borderRadius: 12,
                }}
              />
              {/* פס אדום דק לשעה הנוכחית */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${currentTimeLineTop}px`,
                  height: 2,
                  background: 'linear-gradient(90deg, #ef4444 0%, #fff0 100%)',
                  zIndex: 3,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  boxShadow: '0 0 4px 0 #ef4444aa'
                }}
              />
              <AppointmentsGrid
                ref={gridRef}
                staff={[selectedStaff!]}
                staffHours={{ [selectedStaffId]: selectedStaffHours }}
                appointments={selectedStaffAppointments}
                selectedDate={selectedDate}
                onAppointmentClick={onAppointmentClick}
                onTimeSlotClick={onTimeSlotClick}
                // refreshAppointments={refreshAppointments}
              />
            </div>
            {selectedStaffAppointments.length === 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${CELL_HEIGHT * 24 + 120}px`,
                  minHeight: `${CELL_HEIGHT * 24 + 120}px`,
                  pointerEvents: 'none',
                  opacity: 0,
                  zIndex: 0,
                }}
              />
            )}
          </div>
        </div>
        <div 
          ref={timeColumnRef}
          className="absolute top-0 right-0 w-12 bg-white z-20 h-full shadow-lg border-r border-gray-200"
          style={{ 
            willChange: 'transform',
            minHeight: `${CELL_HEIGHT * 24 + 120}px`
          }}
        >
          <TimeColumn 
            showCurrentTime={showCurrentTime}
            currentTime={currentTime}
          />
        </div>
      </div>
    </div>
  );
});
