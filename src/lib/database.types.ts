export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          booking_link: string;
          settings: {
            theme: 'light' | 'dark';
            notifications: boolean;
          };
          logo_url: string | null;
          contact_info: {
            phone: string;
            email: string;
            address: string;
            city: string;
            country: string;
            location?: {
              lat: number;
              lng: number;
            };
          };
          external_page_settings: {
            show_phone: boolean;
            show_email: boolean;
            show_address: boolean;
            show_social: boolean;
            social_links: {
              facebook?: string;
              instagram?: string;
              twitter?: string;
              website?: string;
            };
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          booking_link: string;
          settings?: {
            theme: 'light' | 'dark';
            notifications: boolean;
          };
          logo_url?: string | null;
          contact_info: {
            phone: string;
            email: string;
            address: string;
            city: string;
            country: string;
            location?: {
              lat: number;
              lng: number;
            };
          };
          external_page_settings?: {
            show_phone: boolean;
            show_email: boolean;
            show_address: boolean;
            show_social: boolean;
            social_links: {
              facebook?: string;
              instagram?: string;
              twitter?: string;
              website?: string;
            };
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          booking_link?: string;
          settings?: {
            theme: 'light' | 'dark';
            notifications: boolean;
          };
          logo_url?: string | null;
          contact_info?: {
            phone: string;
            email: string;
            address: string;
            city: string;
            country: string;
            location?: {
              lat: number;
              lng: number;
            };
          };
          external_page_settings?: {
            show_phone: boolean;
            show_email: boolean;
            show_address: boolean;
            show_social: boolean;
            social_links: {
              facebook?: string;
              instagram?: string;
              twitter?: string;
              website?: string;
            };
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string;
          email: string | null;
          points: number;
          diamonds: number;
          loyalty_level: 'silver' | 'gold' | 'diamond' | 'vip';
          loyalty_stats: {
            total_visits: number;
            total_spent: number;
            last_visit: string;
            achievements: string[];
            consecutive_visits: number;
          };
          metadata: {
            address?: string;
            birth_date?: string;
            city?: string;
            tags?: string[];
            blocked?: boolean;
          } | null;
          last_login?: string;
          last_visit?: string;
          total_purchases: number;
          total_spent: number;
          average_purchase: number;
          visit_frequency: 'high' | 'medium' | 'low';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone: string;
          email?: string | null;
          points?: number;
          diamonds?: number;
          loyalty_level?: 'silver' | 'gold' | 'diamond' | 'vip';
          loyalty_stats?: {
            total_visits: number;
            total_spent: number;
            last_visit: string;
            achievements: string[];
            consecutive_visits: number;
          };
          metadata?: {
            address?: string;
            birth_date?: string;
            city?: string;
            tags?: string[];
            blocked?: boolean;
          } | null;
          last_login?: string;
          last_visit?: string;
          total_purchases?: number;
          total_spent?: number;
          average_purchase?: number;
          visit_frequency?: 'high' | 'medium' | 'low';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          points?: number;
          diamonds?: number;
          loyalty_level?: 'silver' | 'gold' | 'diamond' | 'vip';
          loyalty_stats?: {
            total_visits: number;
            total_spent: number;
            last_visit: string;
            achievements: string[];
            consecutive_visits: number;
          };
          metadata?: {
            address?: string;
            birth_date?: string;
            city?: string;
            tags?: string[];
            blocked?: boolean;
          } | null;
          last_login?: string;
          last_visit?: string;
          total_purchases?: number;
          total_spent?: number;
          average_purchase?: number;
          visit_frequency?: 'high' | 'medium' | 'low';
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string;
          email: string | null;
          is_active: boolean;
          metadata: {
            notes?: string;
            image_url?: string;
            specialties?: string[];
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone: string;
          email?: string | null;
          is_active?: boolean;
          metadata?: {
            notes?: string;
            image_url?: string;
            specialties?: string[];
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string;
          email?: string | null;
          is_active?: boolean;
          metadata?: {
            notes?: string;
            image_url?: string;
            specialties?: string[];
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      services: {
        Row: {
          id: string;
          business_id: string;
          template_id: string | null;
          name: string;
          name_he: string;
          price: number;
          duration: string;
          created_at: string | null;
          image_url: string | null;
          description: string | null;
          promotion: Json | null;
        };
        Insert: {
          id?: string;
          business_id: string;
          template_id?: string | null;
          name: string;
          name_he: string;
          price: number;
          duration: string;
          created_at?: string | null;
          image_url?: string | null;
          description?: string | null;
          promotion?: Json | null;
        };
        Update: {
          id?: string;
          business_id?: string;
          template_id?: string | null;
          name?: string;
          name_he?: string;
          price?: number;
          duration?: string;
          created_at?: string | null;
          image_url?: string | null;
          description?: string | null;
          promotion?: Json | null;
        };
      };
      staff_services: {
        Row: {
          id: string;
          staff_id: string | null;
          service_id: string | null;
          price: number | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          duration: string | null;
        };
        Insert: {
          id?: string;
          staff_id?: string | null;
          service_id?: string | null;
          price?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          duration?: string | null;
        };
        Update: {
          id?: string;
          staff_id?: string | null;
          service_id?: string | null;
          price?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
          duration?: string | null;
        };
      };
      regular_appointments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          staff_id: string;
          service_id: string;
          start_date: string;
          time: string;
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
          duration: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          staff_id: string;
          service_id: string;
          start_date: string;
          time: string;
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
          duration: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          staff_id?: string;
          service_id?: string;
          start_date?: string;
          time?: string;
          frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
          duration?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          phone: string | null;
          role: string;
          business_id: string | null;
          created_at: string | null;
          last_login: string | null;
          metadata: Json | null;
          profile_image_url: string | null;
          title: string | null;
          description: string | null;
          specialties: Json | null;
          settings: {
            rest_time: number;
            max_daily_appointments: number | null;
            visible_in_public: boolean;
          } | null;
          name: string;
        };
        Insert: {
          id?: string;
          email: string;
          phone?: string | null;
          role: string;
          business_id?: string | null;
          created_at?: string | null;
          last_login?: string | null;
          metadata?: Json | null;
          profile_image_url?: string | null;
          title?: string | null;
          description?: string | null;
          specialties?: Json | null;
          settings?: {
            rest_time: number;
            max_daily_appointments: number | null;
            visible_in_public: boolean;
          } | null;
          name?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string | null;
          role?: string;
          business_id?: string | null;
          created_at?: string | null;
          last_login?: string | null;
          metadata?: Json | null;
          profile_image_url?: string | null;
          title?: string | null;
          description?: string | null;
          specialties?: Json | null;
          settings?: {
            rest_time: number;
            max_daily_appointments: number | null;
            visible_in_public: boolean;
          } | null;
          name?: string;
        };
      };
      payment_terminals: {
        Row: {
          id: string;
          business_id: string;
          terminal_name: string;
          is_active: boolean;
          enable_invoice: boolean;
          pelecard_terminal_number: string | null;
          pelecard_user: string | null;
          pelecard_password: string | null;
          pelecard_shop_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          terminal_name: string;
          is_active?: boolean;
          enable_invoice?: boolean;
          pelecard_terminal_number?: string | null;
          pelecard_user?: string | null;
          pelecard_password?: string | null;
          pelecard_shop_number?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          terminal_name?: string;
          is_active?: boolean;
          enable_invoice?: boolean;
          pelecard_terminal_number?: string | null;
          pelecard_user?: string | null;
          pelecard_password?: string | null;
          pelecard_shop_number?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}