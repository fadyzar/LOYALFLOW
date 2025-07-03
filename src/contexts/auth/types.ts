import { Session, User } from '@supabase/supabase-js';
import { Database } from '../../lib/database.types';

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  business: Database['public']['Tables']['businesses']['Row'] | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;  
  loading: boolean;
  refreshBusiness: () => Promise<void>;
  isCreatingAccount: boolean;
  isDashboardPage: boolean;
  
  updateUserProfile: (data: { phone?: string }) => Promise<void>;
  updateBusiness: (data: { 
    name?: string; 
    booking_link?: string; 
    settings?: any;
    logo_url?: string | null;
    contact_info?: any;
  }) => Promise<void>;
}


// קובץ זה מגדיר את הטיפוס של AuthContextType בלבד.
// הוא לא משפיע על טעינת ה-business בפועל, אלא רק על סוגי המשתנים והפונקציות ב-context.
// אם יש לך business: null ב-CalendarPage, הבעיה היא בלוגיקת ה-fetch/context, לא בטיפוס כאן.
// ודא שכל הפונקציות שמוגדרות כאן ממומשות בפועל ב-provider.

export interface AuthProviderProps {
  children: React.ReactNode;
}