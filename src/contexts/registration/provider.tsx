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
    if (step < 1 || step > 4) {
      console.error('Invalid step number:', step);
      return;
    }

    setLoadingStates(prev => ({ ...prev, updatingStep: true }));

    try {
      // שמירת הנתונים בסטייט
      setState(prev => ({
        ...prev,
        currentStep: step + 1,
        completedSteps: [...prev.completedSteps, step],
        stepsData: {
          ...prev.stepsData,
          [`step${step}`]: data
        }
      }));

      // שמירת טיוטה
      saveDraft(step, data);

      // אם זה שלב 1, צריך להקים משתמש
      if (step === 1) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              phone: data.phone,
              role: 'admin'
            }
          }
        });

        if (authError) throw authError;

        // נחכה קצת כדי לתת לטריגר בדטאבייס לסיים את הפעולות שלו
        await new Promise(resolve => setTimeout(resolve, 2000));

        // נוודא שהמשתמש נוצר בהצלחה
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('המשתמש לא נוצר בהצלחה');

        // נוודא שיש לנו business_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('לא נמצא עסק מקושר');

        // נמשיך לשלב הבא
        return;
      }

      // אם זה שלב 2, נעדכן את שם העסק
      else if (step === 2) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) throw new Error('No user found');

        // קבלת ה-business_id מה-metadata של המשתמש
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('No business found');

        const { error: updateError } = await supabase
          .from('businesses')
          .update({
            name: data.name,
            settings: {
              theme: 'light',
              notifications: true,
              type: data.type
            }
          })
          .eq('id', userData.business_id);

        if (updateError) throw updateError;
      }
      // אם זה שלב 3, נעדכן את שעות הפעילות
      else if (step === 3) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) throw new Error('No user found');

        // קבלת ה-business_id מה-metadata של המשתמש
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('No business found');

        const { error: hoursError } = await supabase
          .from('business_hours')
          .update({
            regular_hours: data.hours,
            special_dates: []
          })
          .eq('business_id', userData.business_id);

        if (hoursError) throw hoursError;
      }
      // אם זה שלב 4, נעדכן את השירותים
      else if (step === 4) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) throw new Error('No user found');

        // קבלת ה-business_id מה-metadata של המשתמש
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('business_id')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData?.business_id) throw new Error('No business found');

        // מחיקת השירות הדיפולטיבי
        const { error: deleteError } = await supabase
          .from('services')
          .delete()
          .eq('business_id', userData.business_id);

        if (deleteError) throw deleteError;

        // הוספת השירותים החדשים
        const services = data.services.map(service => ({
          business_id: userData.business_id,
          name: service.name,
          name_he: service.name_he,
          price: parseFloat(service.price),
          duration: `${service.duration} minutes`
        }));

        const { error: servicesError } = await supabase
          .from('services')
          .insert(services);

        if (servicesError) throw servicesError;

        // אם זה השלב האחרון, נעבור לדשבורד
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Error updating step:', error);
      toast.error(error.message || 'שגיאה בשמירת השלב');
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, updatingStep: false }));
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
          case 1: {
            const stepData = data as BusinessRegistrationData['step1'];
            return !!(stepData?.email && stepData?.password);
          }
          case 2: {
            const stepData = data as BusinessRegistrationData['step2'];
            return !!(stepData?.name && stepData?.type);
          }
          case 3: {
            const stepData = data as BusinessRegistrationData['step3'];
            return !!stepData?.hours;
          }
          case 4: {
            const stepData = data as BusinessRegistrationData['step4'];
            return !!(stepData?.services?.length);
          }
          default:
            return false;
        }
      case 'staff':
        switch (step) {
          case 1: {
            const stepData = data as StaffRegistrationData['step1'];
            return !!(stepData?.email && stepData?.password);
          }
          case 2: {
            const stepData = data as StaffRegistrationData['step2'];
            return !!(stepData?.name && stepData?.phone);
          }
          default:
            return false;
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
      goToStep,
      isStepValid,
      getStepData,
      cleanup
    }}>
      {children}
    </RegistrationContext.Provider>
  );
}