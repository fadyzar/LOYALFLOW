import { chargeCustomerWithCloudTerminal } from './pelecardCloud';
import { createInvoiceOnly } from './pelecardInvoiceOnly';
import { supabase } from './supabase';

type PaymentMethod = 'credit_card' | 'bank_transfer' | 'bit' | 'cash';

interface ChargeCustomerParams {
  businessId: string;
  customerId: string;
  appointmentId?: string;
  amount: number;
  tipAmount?: number;
  paymentMethod: PaymentMethod;
  serviceDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
}

export async function chargeCustomer(params: ChargeCustomerParams) {
  // 1. שליפת הגדרות מסוף תשלום פעיל של העסק
  const { data: terminal, error: terminalError } = await supabase
    .from('payment_terminals')
    .select('*')
    .eq('business_id', params.businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (terminalError) {
    console.error('Error fetching payment terminal:', terminalError);
    throw new Error('לא נמצא מסוף פעיל לעסק זה');
  }

  if (!terminal) {
    throw new Error('לא נמצאו הגדרות מסוף תשלום פעיל לעסק זה');
  }

  // 2. בדיקה האם ניתן להפיק חשבוניות
  if (!terminal.enable_invoice) {
    throw new Error('אין אפשרות להפיק חשבונית במסוף זה. אנא הפעל את האפשרות בהגדרות.');
  }

  // 3. אשראי: חייב מסוף פעיל
  if (
    params.paymentMethod === 'credit_card' &&
    !terminal.is_active
  ) {
    throw new Error('אין אפשרות לחייב כרטיס אשראי בעסק זה.');
  }

  // 4. חישוב סכום כולל
  const totalAmount = params.amount + (params.tipAmount || 0);

  // 5. תהליך לפי סוג תשלום
  if (params.paymentMethod === 'credit_card') {
    // חיוב במסוף + הפקת חשבונית
    const result = await chargeCustomerWithCloudTerminal({
      businessId: params.businessId,
      customerId: params.customerId,
      appointmentId: params.appointmentId,
      amount: totalAmount,
      currency: 1,
      payments: 1,
      reference: params.appointmentId || Date.now().toString(),
      payperParams: {
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
              price_per_unit: totalAmount.toString(),
            },
          ],
        },
      },
      sandbox: true, // או false לפרודקשן
    });

    if (!result.success) throw new Error(result.error || 'החיוב נכשל, נסה שוב.');

    // שמירת העסקה ב-DB (כבר מתבצע בפונקציה)
    return result;
  } else {
    // ביט/מזומן/העברה בנקאית: הפקת חשבונית בלבד
    const invoice = await createInvoiceOnly({
      businessId: params.businessId,
      customerId: params.customerId,
      appointmentId: params.appointmentId,
      amount: totalAmount,
      serviceDescription: params.serviceDescription,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      customerAddress: params.customerAddress,
    });

    // שמירת העסקה ב-DB
    await supabase.from('payment_transactions').insert([
      {
        business_id: params.businessId,
        customer_id: params.customerId,
        appointment_id: params.appointmentId || null,
        amount: totalAmount,
        currency: 1,
        payment_method: params.paymentMethod,
        invoice_link: invoice.invoiceLink,
        status: 'success',
      },
    ]);

    return invoice;
  }
} 