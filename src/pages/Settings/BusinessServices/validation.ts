import { ServicePromotion } from './types';

export function validateServiceForm(data: { 
  name_he: string; 
  price: string; 
  duration: string;
  image?: File | null;
  description?: string;
  promotion?: ServicePromotion;
}): string | null {
  if (!data.name_he.trim()) {
    return 'שם השירות הוא שדה חובה';
  }

  const price = parseFloat(data.price);
  if (isNaN(price) || price <= 0) {
    return 'יש להזין מחיר חוקי';
  }

  const duration = parseInt(data.duration);
  if (isNaN(duration) || duration <= 0 || duration % 5 !== 0) {
    return 'משך הזמן חייב להיות מספר חיובי ומתחלק ב-5';
  }

  if (data.promotion) {
    if (data.promotion.discount_value <= 0) {
      return 'ערך ההנחה חייב להיות גדול מ-0';
    }

    if (data.promotion.discount_type === 'percentage' && data.promotion.discount_value > 100) {
      return 'אחוז ההנחה לא יכול להיות גדול מ-100';
    }

    if (data.promotion.start_date && data.promotion.end_date) {
      const start = new Date(data.promotion.start_date);
      const end = new Date(data.promotion.end_date);
      if (start >= end) {
        return 'תאריך התחלת המבצע חייב להיות לפני תאריך הסיום';
      }
    }
  }

  return null;
}