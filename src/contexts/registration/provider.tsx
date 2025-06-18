// ✅ קובץ: src/contexts/registration/provider.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { RegistrationContext } from './context';
import {
  RegistrationState,
  BusinessRegistrationData,
  StaffRegistrationData,
  LoadingStates
} from '../../types/registration';

interface RegistrationProviderProps {
  children: React.ReactNode;
}

const initialState: RegistrationState = {
  type: 'business',
  currentStep: 1,
  completedSteps: [],
  stepsData: {},
  isCompleted: false
};

const initialLoadingStates: LoadingStates = {
  checkingRegistration: false,
  updatingStep: false,
  completing: false
};

export function RegistrationProvider({ children }: RegistrationProviderProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<RegistrationState>(initialState);
  const [loadingStates, setLoadingStates] = useState<LoadingStates>(initialLoadingStates);
  const [draftData, setDraftData] = useState<Partial<RegistrationState['stepsData']>>({});

  const saveDraft = (step: number, data: any) => {
    const newDraft = { ...draftData, [`step${step}`]: data };
    setDraftData(newDraft);
    localStorage.setItem('registration_draft', JSON.stringify(newDraft));
  };

  const updateStep = async (step: number, data: any) => {
    if (step < 1 || step > 4) return;

    setLoadingStates(prev => ({ ...prev, updatingStep: true }));

    try {
      setState(prev => ({
        ...prev,
        currentStep: step >= 4 ? 4 : step + 1,
        completedSteps: [...new Set([...prev.completedSteps, step])],
        stepsData: {
          ...prev.stepsData,
          [`step${step}`]: data
        }
      }));

      saveDraft(step, data);
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בשמירת השלב');
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, updatingStep: false }));
    }
  };

const submitFullRegistration = async () => {
  setLoadingStates(prev => ({ ...prev, completing: true }));

  try {
    const step1 = state.stepsData.step1 as BusinessRegistrationData['step1'];
    const step2 = state.stepsData.step2 as BusinessRegistrationData['step2'];
    const step3 = state.stepsData.step3 as BusinessRegistrationData['step3'];
    const step4 = state.stepsData.step4 as BusinessRegistrationData['step4'] | undefined;

    if (!step1?.email || !step1?.password || !step1?.name || !step1?.phone) {
      throw new Error('פרטי התחברות חסרים');
    }

    if (!step2?.name || !step2?.type) {
      throw new Error('פרטי עסק חסרים');
    }

    if (!step3?.hours) {
      throw new Error('שעות פעילות חסרות');
    }

    // הרשמה
    const { error: signUpError } = await supabase.auth.signUp({
      email: step1.email,
      password: step1.password,
      options: {
        data: {
          name: step1.name,
          phone: step1.phone,
          role: 'admin'
        }
      }
    });

    if (signUpError) throw signUpError;

    // התחברות מידית
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: step1.email,
      password: step1.password
    });

    if (loginError) throw loginError;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('המשתמש לא נוצר בהצלחה');

    // 🔧 יצירת booking_link תקני
    const { data: bookingLinkData, error: bookingError } = await supabase.rpc('generate_booking_link', {
      name: step2.name
    });

    if (bookingError || !bookingLinkData) {
      console.error('⚠️ שגיאה ביצירת קישור:', bookingError);
      throw new Error('שגיאה ביצירת קישור הזמנה');
    }

    const bookingLink = bookingLinkData;

    // יצירת עסק
    const { data: bizData, error: bizError } = await supabase
      .from('businesses')
      .insert({
        name: step2.name,
        description: step2.description || '',
        address: step2.address || '',
        settings: JSON.parse(JSON.stringify({
          theme: 'light',
          notifications: true
        })),
        type: step2.type,
        booking_link: bookingLink
      })
      .select()
      .single();

    if (bizError || !bizData?.id) {
      console.error('⚠️ bizError:', bizError);
      throw new Error('שגיאה ביצירת העסק');
    }

    const businessId = bizData.id;
    console.log('✅ נוצר עסק עם מזהה:', businessId);

    // עדכון משתמש עם business_id
    const { error: updateUserError } = await supabase
      .from('users')
      .update({ business_id: businessId })
      .eq('id', user.id);

    if (updateUserError) throw updateUserError;

    // שעות פעילות
    const { error: hoursError } = await supabase
      .from('business_hours')
      .insert({
        business_id: businessId,
        regular_hours: step3.hours,
        special_dates: []
      });

    if (hoursError) throw hoursError;

    // שירותים
    if (step4?.services?.length) {
      const services = step4.services.map(service => ({
        business_id: businessId,
        name: service.name_he,
        name_he: service.name_he,
        price: parseFloat(service.price),
        duration: `${service.duration} minutes`
      }));

      const { error: servicesError } = await supabase
        .from('services')
        .insert(services);

      if (servicesError) throw servicesError;
    }

    toast.success('ההרשמה הושלמה בהצלחה!');
    cleanup();
    navigate('/dashboard');
  } catch (err: any) {
    console.error('❌ שגיאה בהרשמה:', err);
    toast.error(err.message || 'שגיאה בהרשמה');
  } finally {
    setLoadingStates(prev => ({ ...prev, completing: false }));
  }
};



  const goToStep = (step: number) => {
    if (step < 1 || step > 4) return;
    if (!state.completedSteps.includes(step - 1) && step !== 1) return;
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const isStepValid = (step: number): boolean => {
    const data = state.stepsData[`step${step}`] || draftData[`step${step}`];
    if (!data) return false;

    switch (state.type) {
      case 'business':
        switch (step) {
          case 1: return !!(data.email && data.password && data.name && data.phone);
          case 2: return !!(data.name && data.type);
          case 3: return !!data.hours;
          case 4: return true; // ⬅️ step4 הפך ללא חובה
          default: return false;
        }
      case 'staff':
        switch (step) {
          case 1: return !!(data.email && data.password);
          case 2: return !!(data.name && data.phone);
          default: return false;
        }
    }
  };

  const getStepData = (step: number) => {
    return state.stepsData[`step${step}`] || draftData[`step${step}`] || null;
  };

  const cleanup = () => {
    setState(initialState);
    setDraftData({});
    localStorage.removeItem('registration_draft');
  };

  return (
    <RegistrationContext.Provider value={{
      state,
      loadingStates,
      draftData,
      updateStep,
      submitFullRegistration,
      completeRegistration: submitFullRegistration,
      goToStep,
      isStepValid,
      getStepData,
      cleanup
    }}>
      {children}
    </RegistrationContext.Provider>
  );
}
