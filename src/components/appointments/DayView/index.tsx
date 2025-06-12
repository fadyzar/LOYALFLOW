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
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
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
    
    // Only trigger horizontal swipe if the horizontal movement is significantly larger than vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) * 2 && Math.abs(deltaX) > 100) {
      const currentIndex = staff.findIndex(s => s.id === selectedStaffId);
      let newIndex = currentIndex;
      
      if (deltaX > 0 && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (deltaX < 0 && currentIndex < staff.length - 1) {
        newIndex = currentIndex + 1;
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
    if (isTransitioning) return;
    setSelectedStaffId(staffId);
  }, [isTransitioning]);

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

  // Use React Query for data fetching with caching
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', selectedDate, business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('business_id', business.id)
        .gte('start_time', `${selectedDate}T00:00:00`)
        .lte('start_time', `${selectedDate}T23:59:59`)
        .order('start_time');

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!business?.id // Only run the query when we have a business ID
  });

  // Restore scroll position after data updates
  useEffect(() => {
    if (!isLoading && appointmentsData) {
      const currentHour = new Date().getHours();
      const scrollToPosition = currentHour * CELL_HEIGHT;
      scrollContainerRef.current?.scrollTo({
        top: scrollToPosition,
        behavior: 'smooth'
      });
    }
  }, [isLoading, appointmentsData]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none">
        {/* Staff Tabs */}
        <div className="flex-none border-b border-gray-200 bg-white z-10">
          <div className="flex overflow-x-auto scrollbar-none">
            {staff.map((member) => (
              <button
                key={member.id}
                onClick={() => handleStaffSelect(member.id)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                  selectedStaffId === member.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ 
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform'
        }}
      >
        <div className="flex w-full" style={{ paddingRight: '3rem' }}>
          <div className="flex-1">
            <AppointmentsGrid
              ref={gridRef}
              staff={[selectedStaff!]}
              staffHours={{ [selectedStaffId]: selectedStaffHours }}
              appointments={selectedStaffAppointments}
              selectedDate={selectedDate}
              onAppointmentClick={onAppointmentClick}
              onTimeSlotClick={onTimeSlotClick}
            />
          </div>
        </div>
        <div 
          ref={timeColumnRef}
          className="absolute top-0 right-0 w-12 bg-white z-20 h-full shadow-lg border-r border-gray-200"
          style={{ 
            willChange: 'transform'
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