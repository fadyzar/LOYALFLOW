import { supabase } from './supabase';

interface LoyaltyBenefits {
  services_discount: number;
  products_discount: number;
  birthday_appointment: boolean;
  free_appointment_every: number | null;
}

/**
 * בדיקת זכאות לתור חינם לפי מספר הביקורים
 */
export async function checkFreeAppointmentEligibility(
  customerId: string,
  businessId: string
): Promise<boolean> {
  try {
    // קבלת נתוני הלקוח
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('loyalty_level, loyalty_stats')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // קבלת הגדרות העסק
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .single();

    if (businessError) throw businessError;

    // קבלת הגדרות הנאמנות
    const loyaltySettings = business.settings.loyalty;
    const levelSettings = loyaltySettings.levels[customer.loyalty_level];
    const freeAppointmentEvery = levelSettings.benefits.free_appointment_every;

    // אם אין הגדרה לתור חינם, החזר false
    if (!freeAppointmentEvery) {
      return false;
    }

    // בדיקת מספר הביקורים
    const totalVisits = customer.loyalty_stats.total_visits;

    // בדיקה אם הלקוח זכאי לתור חינם
    return (totalVisits % freeAppointmentEvery) === 0;
  } catch (error) {
    console.error('Error checking free appointment eligibility:', error);
    return false;
  }
}

/**
 * בדיקת זכאות לתור חינם ביום הולדת
 */
export async function checkBirthdayAppointmentEligibility(
  customerId: string,
  businessId: string
): Promise<boolean> {
  try {
    // קבלת נתוני הלקוח
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('loyalty_level, metadata')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // אם אין תאריך לידה, החזר false
    if (!customer.metadata?.birth_date) {
      return false;
    }

    // קבלת הגדרות העסק
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .single();

    if (businessError) throw businessError;

    // קבלת הגדרות הנאמנות
    const loyaltySettings = business.settings.loyalty;
    const levelSettings = loyaltySettings.levels[customer.loyalty_level];
    const birthdayAppointment = levelSettings.benefits.birthday_appointment;

    // אם אין הטבת יום הולדת, החזר false
    if (!birthdayAppointment) {
      return false;
    }

    // בדיקת תאריך הלידה
    const birthDate = new Date(customer.metadata.birth_date);
    const today = new Date();

    // בדיקה אם היום הוא יום ההולדת
    return birthDate.getMonth() === today.getMonth() && 
           birthDate.getDate() === today.getDate();
  } catch (error) {
    console.error('Error checking birthday appointment eligibility:', error);
    return false;
  }
}

/**
 * חישוב הנחות נאמנות
 */
export async function calculateLoyaltyDiscounts(
  customerId: string,
  businessId: string,
  amount: number,
  isService: boolean
): Promise<number> {
  try {
    // קבלת נתוני הלקוח
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('loyalty_level')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // קבלת הגדרות העסק
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('settings')
      .eq('id', businessId)
      .single();

    if (businessError) throw businessError;

    // קבלת הגדרות הנאמנות
    const loyaltySettings = business.settings.loyalty;
    const levelSettings = loyaltySettings.levels[customer.loyalty_level];
    const discountPercent = isService ? 
      levelSettings.benefits.services_discount : 
      levelSettings.benefits.products_discount;

    // חישוב ההנחה
    return amount * (discountPercent / 100);
  } catch (error) {
    console.error('Error calculating loyalty discounts:', error);
    return 0;
  }
} 