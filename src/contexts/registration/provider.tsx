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

      // Debug logs
      console.log("📦 step1:", step1);
      console.log("📦 step2:", step2);
      console.log("📦 step3:", step3);
      console.log("📦 step4:", step4);

      if (!step1?.email || !step1?.password || !step1?.name || !step1?.phone) {
        throw new Error('פרטי התחברות חסרים');
      }

      if (!step2?.name || !step2?.type) {
        throw new Error('פרטי עסק חסרים');
      }

      if (!step3?.hours) {
        throw new Error('שעות פעילות חסרות');
      }
      console.log("🔐 Sending to Supabase:", {
  email: step1.email,
  password: step1.password,
  name: step1.name,
  phone: step1.phone,
  role: 'admin'
});
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

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('business_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.business_id) {
        throw new Error('לא נמצא business_id');
      }

      const businessId = userData.business_id;

      // עדכון פרטי עסק
      const { error: updateBizError } = await supabase
        .from('businesses')
        .update({
          name: step2.name,
          description: step2.description || '',
          address: step2.address || '',
          settings: {
            theme: 'light',
            notifications: true,
            type: step2.type
          }
        })
        .eq('id', businessId);

      if (updateBizError) throw updateBizError;

      // עדכון שעות פעילות
      const { error: hoursError } = await supabase
        .from('business_hours')
        .update({
          regular_hours: step3.hours,
          special_dates: []
        })
        .eq('business_id', businessId);

      if (hoursError) throw hoursError;

      // עדכון שירותים – רק אם קיימים
      if (step4?.services?.length) {
        await supabase.from('services').delete().eq('business_id', businessId);

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
