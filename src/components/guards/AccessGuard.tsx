// src/components/guards/AccessGuard.tsx
import React from 'react';
import { useAccessGuard } from '../appointments/DayView/hooks/useAccessGuard'; //   החלפה לדף נחיתה תחליף למודאל או עמוד שאתה רוצה להציג
import ChoosePlanModal from '../modals/ChoosePlanModal'; //   החלפה לדף נחיתה תחליף למודאל או עמוד שאתה רוצה להציג

export const AccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isBlocked, loading } = useAccessGuard();

  if (loading) return null; // או spinner

  if (isBlocked) {
    return <ChoosePlanModal />;
  }

  return <>{children}</>;
};
