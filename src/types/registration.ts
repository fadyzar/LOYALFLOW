export type RegistrationType = 'business' | 'staff';

export interface LoadingStates {
  checkingRegistration: boolean;
  updatingStep: boolean;
  completing: boolean;
}

export interface RegistrationStep {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

export interface BusinessRegistrationData {
  step1?: {
    email: string;
    password: string;
    name: string;       
    phone: string;
  };
  step2?: {
    name: string;
    type: string;
    description?: string;
    address?: string;
    logo?: File | null;
  };
  step3?: {
    hours: {
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
    };
  };
  step4?: {
    services: Array<{
      name: string;
      name_he: string;
      price: string;
      duration: string;
      description?: string;
    }>;
  };
}

export interface StaffRegistrationData {
  step1?: {
    email: string;
    password: string;
  };
  step2?: {
    name: string;
    phone: string;
    title?: string;
    specialties?: string[];
  };
}

export interface RegistrationState {
  type: RegistrationType;
  currentStep: number;
  completedSteps: number[];
  stepsData: BusinessRegistrationData | StaffRegistrationData;
  user?: User;
  isCompleted: boolean;
}

export interface RegistrationContextType {
  state: RegistrationState;
  loadingStates: LoadingStates;
  draftData: Partial<RegistrationState['stepsData']>;
  updateStep: (step: number, data: any) => Promise<void>;
  goToStep: (step: number) => void;
  isStepValid: (step: number) => boolean;
  getStepData: (step: number) => any;
  completeRegistration: () => Promise<void>;
  cleanup: () => void;
    submitFullRegistration: () => Promise<void>;
}