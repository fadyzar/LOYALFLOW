import { supabase } from './supabase';

// פונקציית עזר לחיוב לקוח דרך Edge Function
export async function chargeCustomerViaEdgeFunction(params: {
  businessId: string;
  customerId: string;
  appointmentId?: string;
  amount: number;
  tipAmount?: number;
  paymentMethod: 'credit_card' | 'bank_transfer' | 'bit' | 'cash';
  payments?: number;
  serviceDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
}) {
  try {
    // השג אסימון גישה
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch('https://nkuqcyelxgyihrxyvitb.supabase.co/functions/v1/charge-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(params)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`השרת החזיר שגיאה: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'שגיאה לא ידועה');
    }
    
    return result;
  } catch (error: any) {
    console.error('שגיאה בחיוב לקוח:', error);
    throw error;
  }
} 