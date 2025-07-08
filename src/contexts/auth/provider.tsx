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
      setBusiness(null); // Always clear business if user is missing
      setLoading(false);
      return;
    }

    try {
      // DEBUG: הדפס את ה-user.id לפני שליפת ה-business_id
      console.log('[refreshBusiness] user.id:', user.id);

      // Fetch business_id from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      console.log('[refreshBusiness] userData:', userData, 'userError:', userError);

      if (userError) {
        console.error('Error fetching user data:', userError);
        setBusiness(null);
        setLoading(false);
        return;
      }
      
      if (userData?.business_id) {
        // DEBUG: הדפס את ה-business_id לפני שליפת העסק
        console.log('[refreshBusiness] business_id:', userData.business_id);

        // Fetch business details
        const { data: businessData, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', userData.business_id)
          .single();

        console.log('[refreshBusiness] businessData:', businessData, 'businessError:', businessError);

        if (businessError) {
          console.error('Error fetching business data:', businessError);
          setBusiness(null);
          setLoading(false);
          return;
        }

        setBusiness(businessData);
      } else {
        console.warn('[refreshBusiness] userData.business_id is missing or null');
        setBusiness(null); // Clear business if user has no business_id
      }
    } catch (error) {
      console.error('Error in refreshBusiness:', error);
      setBusiness(null);
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

  const { data: existingUser, error: userLookupError } = await supabase
    .from('users')
    .select('business_id')
    .eq('id', session.user.id)
    .single();

  if (userLookupError) {
    console.error('שגיאה בשליפת משתמש מטבלת users:', userLookupError);
    setLoading(false);
    return;
  }

  if (!existingUser) {
    console.log('🔴 משתמש התחבר עם גוגל אך לא קיים בטבלת users');
    navigate('/complete-registration');
    setLoading(false);
    return;
  }

  if (!existingUser.business_id) {
    console.warn('⚠️ למשתמש אין business_id');
    navigate('/complete-registration'); // או מסך אחר שמתאים
    setLoading(false);
    return;
  }

  await refreshBusiness();
}


   
     else {
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

  const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://delightful-truffle-340095.netlify.app/dashboard'
      }
    });

    if (error) throw error;

    // לא חייב להמשיך כאן — Supabase יעשה redirect אוטומטי ל־/dashboard
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    toast.error(error.message || 'שגיאה בהתחברות עם Google');
  }
};


  // הוסף הדפסות debug כדי לוודא מתי business נטען
  useEffect(() => {
    if (user) {
      console.log('🔵 [AuthProvider] user loaded:', user.email, user.id);
    }
  }, [user]);

  useEffect(() => {
    if (business) {
      console.log('🟢 [AuthProvider] business loaded:', business);
    } else {
      console.log('🟡 [AuthProvider] business is null');
    }
  }, [business]);

  useEffect(() => {
    // ניווט אוטומטי לדשבורד רק אם המשתמש נמצא בדף אורח (למשל '/', '/login', '/register')
    const guestPages = ['/', '/login', '/register'];
    if (
      !loading &&
      !isCreatingAccount &&
      user &&
      business &&
      !isExternalPage &&
      guestPages.includes(location.pathname)
    ) {
      navigate('/dashboard');
    }
  }, [loading, isCreatingAccount, user, business, isExternalPage, location.pathname, navigate]);

  const value: AuthContextType = {
    session,
    user,
    business,
    signOut,
    signIn,
    loading,
    refreshBusiness,
    isCreatingAccount,
    // הפוך את הפונקציה ל-promisified כדי להתאים לטיפוס
    updateUserProfile: async (_data) => {},
    signInWithGoogle,
    updateBusiness,
    isDashboardPage
  };

  return (
    <AuthContext.Provider value={value}>
      {/* הוסף בדיקה: אם loading עדיין true, תציג LoadingScreen */}
      {loading ? <LoadingScreen /> : (isCreatingAccount ? <LoadingScreen /> : children)}
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

// כל ההדפסות שלך מראות שה-business נטען בהצלחה מה-context:
// [refreshBusiness] userData: {business_id: ...}
// [refreshBusiness] businessData: {id: ..., name: ...}
// 🟢 [AuthProvider] business loaded: {id: ..., name: ...}
// CalendarPage.tsx:40 🏢 business: {id: ..., name: ...}

// זה תקין לחלוטין! הבעיה של business=null נפתרה.
// כל ההודעות של Chrome לגבי cookies, CORB, label וכו' אינן קשורות לטעינת ה-business או לבעיה שלך.
// הן אזהרות דפדפן סטנדרטיות ואינן משפיעות על טעינת הנתונים מה-Supabase או על ה-AuthContext.