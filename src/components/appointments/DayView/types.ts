export interface DayViewProps {
  selectedDate: Date;
  appointments: any[];
  staff: any[];
  onAppointmentClick: (appointment: any) => void;
  onTimeSlotClick: (date: Date, staffId: string) => void;
  showCurrentTime: boolean;
  currentTime: Date;
  refreshAppointments?: () => void; // הוסף את השדה הזה
}

export interface TimeSlotStyle {
  className: string;
  style: React.CSSProperties;
}

export interface StaffHours {
  is_active: boolean;
  start_time: string;
  end_time: string;
  breaks: Array<{
    start_time: string;
    end_time: string;
  }>;
}

export interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  staff_id: string;
  status: string;
  metadata?: {
    paid?: boolean;
    invoice_id?: string;
    price?: number;
    duration?: number;
  };
  customers?: {
    name: string;
    phone: string;
  };
  services?: {
    name: string;
    name_he: string;
    duration: number;
  };
  users?: {
    name: string;
  };
}

export interface Staff {
  id: string;
  name: string;
  title?: string;
  profile_image_url?: string;
  settings: {
    rest_time: number;
    use_business_hours?: boolean;
  };
}