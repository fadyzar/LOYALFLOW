import { supabase } from './supabase';
import CryptoJS from 'crypto-js';
const ENCRYPTION_KEY = 'change-this-key-in-production';

interface CreateInvoiceOnlyParams {
  businessId: string;
  customerId: string;
  appointmentId?: string;
  amount: number; // includes tip
  serviceDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
}

// Utility: fetch Pelecard terminal credentials from DB
async function getPelecardCredentialsFromDatabase(businessId: string) {
  const { data, error } = await supabase
    .from('payment_terminals')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .eq('enable_invoice', true)
    .limit(1)
    .single();
    
  if (error) {
    console.error('Error fetching terminal:', error);
    throw new Error('לא נמצאו פרטי מסוף פעיל לעסק');
  }
  
  if (!data) {
    throw new Error('לא נמצא מסוף מוגדר לחשבוניות בעסק זה');
  }
  
  // Decrypt password if present
  let decryptedPassword = data.pelecard_password;
  if (data.pelecard_password) {
    try {
      const bytes = CryptoJS.AES.decrypt(data.pelecard_password, ENCRYPTION_KEY);
      decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error('Password decryption error:', e);
      throw new Error('שגיאה בפענוח סיסמת פלאכארד');
    }
  }
  
  return {
    terminalNumber: data.pelecard_terminal_number,
    user: data.pelecard_user,
    password: decryptedPassword,
    shopNumber: data.pelecard_shop_number || '001',
  };
}

export async function createInvoiceOnly(params: CreateInvoiceOnlyParams) {
  // Step 1: Get terminal credentials
  const credentials = await getPelecardCredentialsFromDatabase(params.businessId);

  // Step 2: Build request payload
  const payload = {
    terminalNumber: credentials.terminalNumber,
    user: credentials.user,
    password: credentials.password, // Already decrypted
    shopNumber: credentials.shopNumber || '001',
    PayperParameters: {
      typeDocument: 'Invoice-Receipt',
      DataPayper: {
        customer_name: params.customerName,
        customer_mail: params.customerEmail,
        customer_phone: params.customerPhone,
        customer_address: params.customerAddress,
        invoice_lines: [
          {
            description: params.serviceDescription,
            quantity: '1',
            price_per_unit: params.amount.toString(),
          },
        ],
        comments: 'תודה שבחרתם בנו!',
      },
    },
  };

  // Step 3: Call API (sandbox by default)
  try {
    const endpoint = 'https://gateway21.pelecard.biz/services/DebitRegularType';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();

    if (result.StatusCode === '000') {
      return {
        success: true,
        invoiceLink: result.InvoiceLink,
        raw: result,
      };
    } else {
      throw new Error(result.ErrorMessage || 'הפקת החשבונית נכשלה');
    }
  } catch (error: any) {
    console.error('Error creating invoice:', error);
    throw new Error(`שגיאה בהפקת חשבונית: ${error.message || 'שגיאה לא ידועה'}`);
  }
} 