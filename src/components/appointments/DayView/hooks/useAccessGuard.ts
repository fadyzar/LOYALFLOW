// src/hooks/useAccessGuard.ts
import { useSubscription } from "../../../../hooks/useSubscription";
import { useAuth } from "../../../../contexts/auth/hooks";
export function useAccessGuard() {
  const { user } = useAuth(); // הוסף את זה
  const { subscription, trialAvailable, isTrialStillValid, loading } = useSubscription();

  const isBlocked = !loading && user && !subscription && !trialAvailable && !isTrialStillValid();

  return {
    isBlocked,
    loading
  };
}
