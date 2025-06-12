# Charge Customer Edge Function

פונקציית Edge לביצוע חיוב לקוח בכרטיס אשראי והפקת חשבוניות דרך Pelecard.

## רקע

לא ניתן לבצע קריאות ישירות ל-Pelecard מהקליינט (CORS Blocked), לכן פונקציית Edge זו מאפשרת לבצע את כל הקריאות הנדרשות.

## הוראות התקנה

1. יש לפרסם את ה-Edge Function דרך הפקודה הבאה:
   ```
   supabase functions deploy charge-customer
   ```

2. הגדר משתני סביבה הנדרשים:
   ```
   supabase secrets set ENCRYPTION_KEY=your-encryption-key-here
   ```

## שימוש בפונקציה מהקליינט

```typescript
// דוגמה לקריאה לפונקציה
async function chargeCustomerViaEdgeFunction(params) {
  try {
    const response = await fetch('/api/charge-customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseClient.auth.session()?.access_token}`
      },
      body: JSON.stringify({
        businessId: "...",        // מזהה העסק
        customerId: "...",        // מזהה הלקוח
        appointmentId: "...",     // מזהה התור (אופציונלי)
        amount: 10000,            // סכום בשקלים
        tipAmount: 1000,          // סכום הטיפ (אופציונלי)
        paymentMethod: "credit_card", // אמצעי תשלום (credit_card, bit, cash, bank_transfer)
        payments: 1,              // מספר תשלומים (חובה רק לאשראי)
        serviceDescription: "ייעוץ עסקי", // תיאור השירות לחשבונית
        customerName: "אופק כהן",  // שם הלקוח
        customerEmail: "customer@example.com", // אימייל הלקוח
        customerPhone: "0501234567", // טלפון הלקוח (אופציונלי)
        customerAddress: "תל אביב"   // כתובת הלקוח (אופציונלי)
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // טיפול בתשובה חיובית
      console.log("Transaction successful:", result);
      if (result.invoiceLink) {
        console.log("Invoice URL:", result.invoiceLink);
      }
    } else {
      // טיפול בשגיאה
      console.error("Transaction failed:", result.error);
    }
    
    return result;
  } catch (error) {
    console.error("Edge function error:", error);
    throw error;
  }
}
```

## פורמט תשובה

### תשובה חיובית (עסקת אשראי)

```json
{
  "success": true,
  "transactionId": "1234567890",
  "approvalCode": "1234",
  "invoiceLink": "https://payper-cache.pelecard.biz/PDF/...",
  "message": "Success message from Pelecard"
}
```

### תשובה חיובית (חשבונית בלבד - מזומן/ביט/העברה בנקאית)

```json
{
  "success": true,
  "invoiceLink": "https://payper-cache.pelecard.biz/PDF/..."
}
```

### תשובה שלילית

```json
{
  "success": false,
  "error": "פירוט השגיאה"
}
``` 