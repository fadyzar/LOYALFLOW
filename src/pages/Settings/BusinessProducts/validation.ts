import { ProductPromotion } from './types';

export function validateProductForm(data: { 
  name_he: string; 
  sku: string;
  barcode: string;
  price: string; 
  stock_quantity: string;
  min_stock_quantity: string;
  image?: File | null;
  description?: string;
  promotion?: ProductPromotion;
}): string | null {
  if (!data.name_he.trim()) {
    return 'שם המוצר הוא שדה חובה';
  }

  const price = parseFloat(data.price);
  if (isNaN(price) || price <= 0) {
    return 'יש להזין מחיר חוקי';
  }

  const stockQuantity = parseInt(data.stock_quantity);
  if (isNaN(stockQuantity) || stockQuantity < 0) {
    return 'כמות במלאי חייבת להיות מספר חיובי';
  }

  const minStockQuantity = parseInt(data.min_stock_quantity);
  if (isNaN(minStockQuantity) || minStockQuantity < 0) {
    return 'כמות מינימום במלאי חייבת להיות מספר חיובי';
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