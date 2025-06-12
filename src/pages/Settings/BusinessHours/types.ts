export interface DayHours {
  is_active: boolean;
  start_time: string;
  end_time: string;
  breaks: Break[];
}

export interface Break {
  id: string;
  start_time: string;
  end_time: string;
}

export interface SpecialDate {
  id: string;
  date: string;
  is_closed: boolean;
  start_time?: string;
  end_time?: string;
  note?: string;
}

export interface BusinessHoursData {
  id?: string;
  business_id: string;
  regular_hours: {
    sunday: DayHours;
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
  };
  special_dates: SpecialDate[];
}