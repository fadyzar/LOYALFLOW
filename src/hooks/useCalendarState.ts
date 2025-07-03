import { useState, useCallback } from 'react';
import { CalendarEvent, CalendarView, DragState } from '../types/calendar';

export const useCalendarState = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('day');
  const [events, setEvents] = useState<CalendarEvent[]>([
    // Sample events for testing - using today's date
    {
      id: '1',
      title: 'פגישת עבודה',
      startTime: (() => {
        const today = new Date();
        today.setHours(13, 0, 0, 0);
        return today;
      })(),
      endTime: (() => {
        const today = new Date();
        today.setHours(13, 30, 0, 0);
        return today;
      })(),
      color: '#3B82F6',
      description: 'פגישה חשובה עם הלקוח'
    },
    {
      id: '2',
      title: 'ארוחת צהריים',
      startTime: (() => {
        const today = new Date();
        today.setHours(12, 30, 0, 0);
        return today;
      })(),
      endTime: (() => {
        const today = new Date();
        today.setHours(13, 30, 0, 0);
        return today;
      })(),
      color: '#10B981',
      description: 'ארוחה עם חברים'
    },
    {
      id: '3',
      title: 'אימון ספורט',
      startTime: (() => {
        const today = new Date();
        today.setHours(18, 0, 0, 0);
        return today;
      })(),
      endTime: (() => {
        const today = new Date();
        today.setHours(19, 30, 0, 0);
        return today;
      })(),
      color: '#EF4444',
      description: 'אימון כושר'
    }
  ]);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedEvent: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    originalTime: new Date()
  });
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null);

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    const newEvent: CalendarEvent = {
      ...event,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setEvents(prev => [...prev, newEvent]);
  }, []);

  const updateEvent = useCallback((eventId: string, updates: Partial<CalendarEvent>) => {
    setEvents(prev => prev.map(event => 
      event.id === eventId ? { ...event, ...updates } : event
    ));
  }, []);

  const deleteEvent = useCallback((eventId: string) => {
    setEvents(prev => prev.filter(event => event.id !== eventId));
  }, []);

  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'day':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
          break;
      }
      return newDate;
    });
  }, [view]);

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    events,
     setEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    dragState,
    setDragState,
    showEventModal,
    setShowEventModal,
    selectedTimeSlot,
    setSelectedTimeSlot,
    navigateDate
  };
};