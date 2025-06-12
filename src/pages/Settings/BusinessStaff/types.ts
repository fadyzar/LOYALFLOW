export interface StaffService {
  id: string;
  price: string;
  duration: string;
  is_active: boolean;
}

export interface StaffFormData {
  email: string;
  name: string;
  password?: string;
  phone: string;
  title: string;
  description: string;
  specialties: string[];
  settings: {
    rest_time: number;
    max_daily_appointments: number | null;
    visible_in_public: boolean;
  };
  profile_image?: File | null;
  services: StaffService[];
  hours: {
    use_business_hours: boolean;
    regular_hours?: StaffHours['regular_hours'];
    special_dates: StaffHours['special_dates'];
  };
}

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'staff';
  profile_image_url: string | null;
  title: string | null;
  description: string | null;
  specialties: string[];
  settings: {
    rest_time: number;
    max_daily_appointments: number | null;
    visible_in_public: boolean;
  };
  created_at: string;
}

export interface StaffHours {
  id: string;
  staff_id: string;
  regular_hours: {
    [key: string]: {
      is_active: boolean;
      start_time: string;
      end_time: string;
      breaks: Array<{
        id: string;
        start_time: string;
        end_time: string;
      }>;
    };
  } | null;
  special_dates: Array<{
    id: string;
    date: string;
    is_closed: boolean;
    start_time?: string;
    end_time?: string;
    note?: string;
  }>;
}

export interface StaffSpecialty {
  id: string;
  name: string;
  name_he: string;
}