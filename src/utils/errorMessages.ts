export function getFriendlyErrorMessage(errorMessage: string): string {
  if (!errorMessage) return 'אירעה שגיאה לא ידועה';

  if (errorMessage.includes('duplicate key') && errorMessage.includes('customers_business_phone_unique')) {
    return 'מספר הטלפון הזה כבר קיים במערכת';
  }

  if (errorMessage.includes('connection')) {
    return 'בעיה בחיבור לשרת. נסה שוב';
  }

  if (errorMessage.includes('not null constraint')) {
    return 'חסרים שדות חובה בטופס';
  }

  return 'אירעה שגיאה בלתי צפויה. נסה שוב';
}
