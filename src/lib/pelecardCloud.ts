import { supabase } from './supabase';
import CryptoJS from 'crypto-js';

// Pelecard endpoints
const PELECARD_BASE = {
  production: 'https://gateway21.pelecard.biz/services',
  sandbox: 'https://gateway21.pelecard.biz/SandboxServices',
};

const ENCRYPTION_KEY = 'change-this-key-in-production';

// Utility: Save transaction result to DB
export async function saveTransactionResult(params: {
  businessId: string;
  customerId: string;
  appointmentId?: string;
  pelecardTransactionId?: string;
  approvalCode?: string;
  amount: number;
  currency: number;
  invoiceLink?: string;
  status: 'success' | 'error';
  errorMessage?: string;
}) {
  await supabase.from('payment_transactions').insert([
    {
      business_id: params.businessId,
      customer_id: params.customerId,
      appointment_id: params.appointmentId || null,
      pelecard_transaction_id: params.pelecardTransactionId,
      approval_code: params.approvalCode,
      amount: params.amount,
      currency: params.currency,
      payment_method: 'credit_card',
      invoice_link: params.invoiceLink,
      status: params.status,
      error_message: params.errorMessage,
    },
  ]);
}

// Utility: fetch Pelecard terminal credentials from DB
async function getPelecardCredentialsFromDatabase(businessId: string) {
  const { data, error } = await supabase
    .from('payment_terminals')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error) {
    console.error('Error fetching terminal:', error);
    throw new Error('לא נמצאו פרטי מסוף פעיל לעסק');
  }
  
  if (!data) {
    throw new Error('לא נמצא מסוף פעיל לעסק זה');
  }
  
  return {
    terminalNumber: data.pelecard_terminal_number,
    user: data.pelecard_user,
    password: data.pelecard_password,
    shopNumber: data.pelecard_shop_number || '001',
  };
}

/**
 * מבצע חיוב לקוח דרך מסוף פיזי בענן פלאכארד (כולל שמירה ל-DB)
 * @param params כל הפרטים הנדרשים לעסקה
 * @returns תוצאת החיוב (כולל הצלחה/שגיאה)
 */
export async function chargeCustomerWithCloudTerminal(params: {
  terminalNumber?: string;
  user?: string;
  password?: string;
  shopNumber?: string;
  amount: number; // באגורות
  currency?: number; // ברירת מחדל 1
  payments?: number; // ברירת מחדל 1
  reference: string; // מזהה ייחודי להזמנה
  businessId: string;
  customerId: string;
  appointmentId?: string;
  payperParams?: any; // פרטי חשבונית (אם צריך)
  sandbox?: boolean;
}) {
  // מידע בסיסי על העסקה
  const {
    amount,
    currency = 1,
    payments = 1,
    reference,
    businessId,
    customerId,
    appointmentId,
    payperParams,
    // ברירת מחדל: סנדבוקס (לשנות לפרודקשן כשנרצה)
    sandbox = true,
  } = params;

  try {
    // הכנת מבנה הנתונים לשליחה לEdge Function
    const requestBody = {
      businessId,
      customerId,
      appointmentId,
      amount,
      paymentMethod: 'credit_card',
      payments,
      serviceDescription: payperParams?.DataPayper?.invoice_lines?.[0]?.description || 'חיוב באשראי',
      customerName: payperParams?.DataPayper?.customer_name || '',
      customerEmail: payperParams?.DataPayper?.customer_mail || '',
      customerPhone: payperParams?.DataPayper?.customer_phone || '',
      customerAddress: payperParams?.DataPayper?.customer_address || ''
    };

    // קריאה לEdge Function
    const response = await fetch('https://nkuqcyelxgyihrxyvitb.supabase.co/functions/v1/charge-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // מעבירים את הטוקן של המשתמש אם קיים
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
      },
      body: JSON.stringify(requestBody)
    });

    // בדיקה אם התרחשה שגיאת רשת
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function error:', response.status, errorText);
      throw new Error(`שגיאה בקריאה ל-Edge Function: ${response.status} ${errorText}`);
    }

    // פענוח התשובה
    const responseData = await response.json();
    
    if (responseData.success) {
      // אין צורך לשמור את העסקה כי ה-Edge Function כבר עושה זאת
      return {
        success: true,
        transactionId: responseData.transactionId,
        approvalCode: responseData.approvalCode,
        invoiceLink: responseData.invoiceLink,
        message: responseData.message,
        raw: responseData.raw
      };
    } else {
      // טיפול בשגיאה מה-Edge Function
      return { 
        success: false, 
        error: responseData.error || 'העסקה נכשלה. נסה שוב.', 
        raw: responseData 
      };
    }
  } catch (error: any) {
    console.error('Error in chargeCustomerWithCloudTerminal:', error);
    // במקרה של שגיאה כללית
    return { 
      success: false, 
      error: error.message || 'אירעה שגיאה לא צפויה בביצוע החיוב'
    };
  }
} 