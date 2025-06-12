import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0'
import * as CryptoJS from 'https://cdn.jsdelivr.net/npm/crypto-js@4.1.1/+esm'

// Pelecard endpoints
const PELECARD_BASE = {
  production: 'https://gateway21.pelecard.biz/services',
  sandbox: 'https://gateway21.pelecard.biz/SandboxServices',
}

const ENCRYPTION_KEY = 'change-this-key-in-production'

// קריאת Service Role Key מה-env שמוגדר בפונקציית Edge
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

// הפונקציה הראשית שמשרתת את הבקשות
serve(async (req) => {
  try {
    // בדיקת שיטת HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'יש להשתמש בבקשת POST בלבד' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // פירוק גוף הבקשה
    const body = await req.json()
    const {
      businessId,
      customerId,
      appointmentId,
      amount,
      tipAmount = 0,
      paymentMethod,
      payments = 1,
      serviceDescription,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress
    } = body

    // וולידציה בסיסית
    if (!businessId || !customerId || !amount || !paymentMethod || !serviceDescription || !customerName) {
      return new Response(
        JSON.stringify({ error: 'חסרים פרמטרים הכרחיים' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 1. שליפת הגדרות מסוף תשלום פעיל של העסק
    const { data: terminal, error: terminalError } = await supabase
      .from('payment_terminals')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (terminalError || !terminal) {
      return new Response(
        JSON.stringify({ error: 'לא נמצא מסוף פעיל לעסק זה' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. בדיקה האם ניתן להפיק חשבוניות
    if (!terminal.enable_invoice) {
      return new Response(
        JSON.stringify({ error: 'אין אפשרות להפיק חשבונית במסוף זה. אנא הפעל את האפשרות בהגדרות.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. אשראי: חייב מסוף פעיל
    if (paymentMethod === 'credit_card' && !terminal.is_active) {
      return new Response(
        JSON.stringify({ error: 'אין אפשרות לחייב כרטיס אשראי בעסק זה.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // פענוח סיסמה
    let decryptedPassword = terminal.pelecard_password
    if (terminal.pelecard_password) {
      try {
        const bytes = CryptoJS.AES.decrypt(terminal.pelecard_password, ENCRYPTION_KEY)
        decryptedPassword = bytes.toString(CryptoJS.enc.Utf8)
      } catch (e) {
        console.error('Password decryption error:', e)
        return new Response(
          JSON.stringify({ error: 'שגיאה בפענוח סיסמת פלאכארד' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // 4. חישוב סכום כולל
    const totalAmount = amount + (tipAmount || 0)

    // 5. טיפול לפי סוג תשלום
    if (paymentMethod === 'credit_card') {
      // חיוב בכרטיס אשראי + הפקת חשבונית
      
      // 5.1 StartTransaction
      const startUrl = `${PELECARD_BASE.sandbox}/StartTransaction`
      const startBody = {
        terminalNumber: terminal.pelecard_terminal_number,
        user: terminal.pelecard_user,
        password: decryptedPassword,
        shopNumber: terminal.pelecard_shop_number || '001',
        amount: totalAmount.toString(),
        currency: '1',
        payments: payments.toString(),
        reference: appointmentId || Date.now().toString(),
      }
      
      let startRes, startJson
      try {
        startRes = await fetch(startUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(startBody),
        })
        startJson = await startRes.json()
      } catch (err) {
        await saveTransactionResult({
          businessId,
          customerId,
          appointmentId,
          amount: totalAmount,
          currency: 1,
          status: 'error',
          errorMessage: 'שגיאת תקשורת לשרת פלאכארד (StartTransaction)',
        })
        
        return new Response(
          JSON.stringify({ success: false, error: 'שגיאת תקשורת לשרת פלאכארד (StartTransaction)' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (startJson.StatusCode !== '000' || !startJson.intIn) {
        await saveTransactionResult({
          businessId,
          customerId,
          appointmentId,
          amount: totalAmount,
          currency: 1,
          status: 'error',
          errorMessage: startJson.ErrorMessage || 'התחלת עסקה נכשלה',
        })
        
        return new Response(
          JSON.stringify({ success: false, error: startJson.ErrorMessage || 'התחלת עסקה נכשלה' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // 5.2 DebitByIntIn
      const debitUrl = `${PELECARD_BASE.sandbox}/DebitByIntIn`
      const debitBody = {
        terminalNumber: terminal.pelecard_terminal_number,
        user: terminal.pelecard_user,
        password: decryptedPassword,
        shopNumber: terminal.pelecard_shop_number || '001',
        intIn: startJson.intIn,
        PayperParameters: {
          typeDocument: 'Invoice-Receipt',
          DataPayper: {
            customer_name: customerName,
            customer_mail: customerEmail,
            customer_phone: customerPhone,
            customer_address: customerAddress,
            invoice_lines: [
              {
                description: serviceDescription,
                quantity: '1',
                price_per_unit: totalAmount.toString(),
              },
            ],
          },
        },
      }
      
      let debitRes, debitJson
      try {
        debitRes = await fetch(debitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debitBody),
        })
        debitJson = await debitRes.json()
      } catch (err) {
        await saveTransactionResult({
          businessId,
          customerId,
          appointmentId,
          amount: totalAmount,
          currency: 1,
          status: 'error',
          errorMessage: 'שגיאת תקשורת לשרת פלאכארד (DebitByIntIn)',
        })
        
        return new Response(
          JSON.stringify({ success: false, error: 'שגיאת תקשורת לשרת פלאכארד (DebitByIntIn)' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // טיפול בתשובה של פלאכארד
      if (debitJson.StatusCode === '000' || debitJson.StatusCode === '001') {
        await saveTransactionResult({
          businessId,
          customerId,
          appointmentId,
          pelecardTransactionId: debitJson.PelecardTransactionId,
          approvalCode: debitJson.DebitApproveNumber,
          amount: totalAmount,
          currency: 1,
          invoiceLink: debitJson.InvoiceLink,
          status: 'success',
          errorMessage: debitJson.ErrorMessage,
        })
        
        return new Response(
          JSON.stringify({
            success: true,
            transactionId: debitJson.PelecardTransactionId,
            approvalCode: debitJson.DebitApproveNumber,
            invoiceLink: debitJson.InvoiceLink,
            message: debitJson.ErrorMessage,
            raw: debitJson,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        // טיפול בשגיאות נפוצות
        let userMessage = 'העסקה נכשלה. נסה שוב.'
        switch (debitJson.StatusCode) {
          case '102': userMessage = 'הכרטיס נדחה. נסה כרטיס אחר.'; break
          case '103': userMessage = 'כרטיס שפג תוקפו. נסה אחר.'; break
          case '104': userMessage = 'אין מספיק מסגרת בכרטיס.'; break
          case '106': userMessage = 'הכרטיס חסום. נסה אחר.'; break
          case '110': userMessage = 'שגיאת תקשורת. נסה שוב.'; break
          case '200':
          case '900':
          case '999': userMessage = 'תקלה זמנית. נסה שוב בעוד רגע.'; break
          default: userMessage = debitJson.ErrorMessage || userMessage
        }
        
        await saveTransactionResult({
          businessId,
          customerId,
          appointmentId,
          amount: totalAmount,
          currency: 1,
          status: 'error',
          errorMessage: debitJson.ErrorMessage || userMessage,
        })
        
        return new Response(
          JSON.stringify({ success: false, error: userMessage, raw: debitJson }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // עבור ביט, מזומן, העברה בנקאית - הפקת חשבונית בלבד
      try {
        const payload = {
          terminalNumber: terminal.pelecard_terminal_number,
          user: terminal.pelecard_user,
          password: decryptedPassword,
          shopNumber: terminal.pelecard_shop_number || '001',
          PayperParameters: {
            typeDocument: 'Invoice-Receipt',
            DataPayper: {
              customer_name: customerName,
              customer_mail: customerEmail,
              customer_phone: customerPhone,
              customer_address: customerAddress,
              invoice_lines: [
                {
                  description: serviceDescription,
                  quantity: '1',
                  price_per_unit: totalAmount.toString(),
                },
              ],
              comments: 'תודה שבחרתם בנו!',
            },
          },
        }

        const endpoint = `${PELECARD_BASE.sandbox}/DocumentCreate`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
        }
        
        const result = await response.json()

        if (result.StatusCode === '000') {
          // שמירת העסקה ב-DB
          await supabase.from('payment_transactions').insert([
            {
              business_id: businessId,
              customer_id: customerId,
              appointment_id: appointmentId || null,
              amount: totalAmount,
              currency: 1,
              payment_method: paymentMethod,
              invoice_link: result.InvoiceLink,
              status: 'success',
            },
          ])
          
          return new Response(
            JSON.stringify({
              success: true,
              invoiceLink: result.InvoiceLink,
              raw: result,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        } else {
          throw new Error(result.ErrorMessage || 'הפקת החשבונית נכשלה')
        }
      } catch (error) {
        console.error('Error creating invoice:', error)
        
        await supabase.from('payment_transactions').insert([
          {
            business_id: businessId,
            customer_id: customerId,
            appointment_id: appointmentId || null,
            amount: totalAmount,
            currency: 1,
            payment_method: paymentMethod,
            status: 'error',
            error_message: error.message || 'שגיאה לא ידועה',
          },
        ])
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `שגיאה בהפקת חשבונית: ${error.message || 'שגיאה לא ידועה'}` 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
  } catch (err) {
    // טיפול בשגיאות כלליות
    console.error('General error:', err)
    return new Response(
      JSON.stringify({ error: `שגיאה כללית: ${err.message || 'שגיאה לא ידועה'}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// פונקציית עזר לשמירת תוצאת עסקה
async function saveTransactionResult(params: {
  businessId: string
  customerId: string
  appointmentId?: string
  pelecardTransactionId?: string
  approvalCode?: string
  amount: number
  currency: number
  invoiceLink?: string
  status: 'success' | 'error'
  errorMessage?: string
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
  ])
} 