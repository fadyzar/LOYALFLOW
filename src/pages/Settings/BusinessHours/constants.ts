export const DAYS = [
  { id: 0, name: 'ראשון', key: 'sunday' },
  { id: 1, name: 'שני', key: 'monday' },
  { id: 2, name: 'שלישי', key: 'tuesday' },
  { id: 3, name: 'רביעי', key: 'wednesday' },
  { id: 4, name: 'חמישי', key: 'thursday' },
  { id: 5, name: 'שישי', key: 'friday' },
  { id: 6, name: 'שבת', key: 'saturday' }
] as const;

export const DEFAULT_BREAK = {
  start_time: '12:00',
  end_time: '13:00'
} as const;

export const DEFAULT_SPECIAL_DATE = {
  date: new Date().toISOString().split('T')[0],
  is_closed: false,
  start_time: '09:00',
  end_time: '17:00',
  note: ''
} as const;