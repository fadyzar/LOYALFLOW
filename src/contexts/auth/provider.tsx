import React, { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { AuthContext } from './context';
import { AuthProviderProps } from './types';
import LoadingScreen from '../../components/LoadingScreen';
import { Database } from '../../lib/database.types';
import { AuthContextType } from './types';
import { createContext, useContext } from 'react';

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Database['public']['Tables']['businesses']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // בדיקה אם אנחנו בדף חיצוני או בדשבורד
  const isExternalPage = location.pathname.startsWith('/book/');
  const isDashboardPage = location.pathname === '/dashboard';

  const refreshBusiness = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // קבלת ה-business_id מטבלת users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        setLoading(false);
        return;
      }
      
      if (userData?.business_id) {
        // קבלת פרטי העסק
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', userData.business_id)
          .single();

        if (businessError) {
          console.error('Error fetching business data:', businessError);
          setLoading(false);
          return;
        }

        setBusiness(businessData);
      }
    } catch (error) {
      console.error('Error in refreshBusiness:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // אם אנחנו בדף חיצוני, לא צריך לבדוק סשן
        if (isExternalPage) {
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('Session found, user:', session.user.email);
          setSession(session);
          setUser(session.user);
          await refreshBusiness();
        } else {
          console.log('No session found');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // אם אנחנו בדף חיצוני, לא צריך לעקוב אחרי שינויי אימות
      if (isExternalPage) {
        return;
      }

      if (session?.user) {
        console.log('Auth state changed, user:', session.user.email);
        setSession(session);
        setUser(session.user);
        await refreshBusiness();
      } else {
        setSession(null);
        setUser(null);
        setBusiness(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isExternalPage]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        setSession(data.session);
        setUser(data.user);
        await refreshBusiness();
        navigate('/dashboard');
        toast.success('התחברת בהצלחה!');
      }
    } catch (error: any) {
      console.error('Error signing in:', error);
      toast.error(error.message || 'שגיאה בהתחברות');
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setBusiness(null);
      localStorage.clear();
      navigate('/login');
      toast.success('התנתקת בהצלחה');
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('שגיאה בהתנתקות');
    }
  };

  const updateBusiness = async (data: { 
    name?: string; 
    booking_link?: string; 
    settings?: any;
    logo_url?: string | null;
    contact_info?: any;
  }) => {
    if (!user) {
      toast.error('לא נמצא משתמש מחובר');
      return;
    }

    try {
      const businessId = business?.id;
      
      if (!businessId) {
        toast.error('לא נמצא עסק מקושר');
        return;
      }

      const { error: dbError } = await supabase
        .from('businesses')
        .update(data)
        .eq('id', businessId);

      if (dbError) throw dbError;

      // רענון נתוני העסק
      await refreshBusiness();
      
      toast.success('העסק עודכן בהצלחה');
    } catch (error: any) {
      console.error('Error updating business:', error);
      toast.error(error.message || 'שגיאה בעדכון העסק');
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    business,
    signOut,
    signIn,
    loading,
    refreshBusiness,
    isCreatingAccount,
    updateBusiness,
    isDashboardPage
  };

  return (
    <AuthContext.Provider value={value}>
      {isCreatingAccount ? <LoadingScreen /> : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};