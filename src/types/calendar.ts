export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  color: string;
  description?: string;
  isAllDay?: boolean;
}

export interface DragState {
  isDragging: boolean;
  draggedEvent: CalendarEvent | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
  originalTime: Date;
}

export type CalendarView = 'day' | 'week' | 'month';

export interface TouchGesture {
  type: 'swipe' | 'tap' | 'doubletap' | 'longpress';
  direction?: 'left' | 'right' | 'up' | 'down';
  position: { x: number; y: number };
}