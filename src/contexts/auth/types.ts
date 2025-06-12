import { Session, User } from '@supabase/supabase-js';
import { Database } from '../../lib/database.types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  business: Database['public']['Tables']['businesses']['Row'] | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
  isCreatingAccount: boolean;
  isDashboardPage: boolean;
  signUp: (data: {
    email: string;
    password: string;
    role: 'admin' | 'staff';
    businessId?: string;
    phone?: string;
  }) => Promise<User | undefined>;
  updateUserProfile: (data: { phone?: string }) => Promise<void>;
  updateBusiness: (data: { 
    name?: string; 
    booking_link?: string; 
    settings?: any;
    logo_url?: string | null;
    contact_info?: any;
  }) => Promise<void>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}