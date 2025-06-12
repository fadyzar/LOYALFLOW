export const CELL_HEIGHT = 120; // הגדלנו את גובה התא ל-120 פיקסלים
export const MINUTES_IN_HOUR = 60;
export const MINUTES_IN_DAY = MINUTES_IN_HOUR * 24;
export const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);
export const DRAG_SNAP = 15; // דקות
export const GRID_HEIGHT = CELL_HEIGHT * 24; // הגובה הכולל של הלוח
export const MIN_APPOINTMENT_DURATION = 15; // דקות
export const MAX_APPOINTMENT_DURATION = 240; // דקות
export const APPOINTMENT_COLORS = {
  pending: 'bg-yellow-100 hover:bg-yellow-200',
  confirmed: 'bg-green-100 hover:bg-green-200',
  completed: 'bg-blue-100 hover:bg-blue-200',
  canceled: 'bg-red-100 hover:bg-red-200',
  paid: 'bg-purple-100 hover:bg-purple-200'
};