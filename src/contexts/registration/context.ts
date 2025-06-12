import { createContext } from 'react';
import { RegistrationContextType } from '../../types/registration';

export const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);