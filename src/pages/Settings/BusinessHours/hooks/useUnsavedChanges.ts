import { useEffect, useState } from 'react';
import { useBeforeUnload } from 'react-router-dom';

export function useUnsavedChanges() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useBeforeUnload(
    (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        return 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
      }
    },
    { capture: true }
  );

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges
  };
}