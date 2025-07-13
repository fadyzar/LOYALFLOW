// @ts-expect-error Supabase Edge Functions provide "std" imports at runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  try {
    const { phone } = await req.json();

    // המרה לפורמט בינ"ל אם צריך
    let formattedPhone = phone;
    if (/^05\d{8}$/.test(phone)) {
      formattedPhone = '+972' + phone.slice(1);
    }

    // קבלת סודות מהסביבה
    // @ts-expect-error Edge Functions runtime provides Deno global
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    // @ts-expect-error Edge Functions runtime provides Deno global
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    // @ts-expect-error Edge Functions runtime provides Deno global
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    // לוגים לאבחון - יופיעו תמיד בלוגים של Supabase
    console.log("=== send_otp invoked ===");
    console.log("env.TWILIO_ACCOUNT_SID:", TWILIO_ACCOUNT_SID);
    console.log("env.TWILIO_AUTH_TOKEN:", TWILIO_AUTH_TOKEN ? "exists" : "missing");
    console.log("env.TWILIO_PHONE_NUMBER:", TWILIO_PHONE_NUMBER);
    console.log("formattedPhone:", formattedPhone);

    // בדוק שכל הסודות קיימים
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Missing Twilio environment variables", {
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER
      });
      // הוסף הודעה מפורשת גם בתגובה
      return new Response(JSON.stringify({
        success: false,
        error: "Missing Twilio environment variables",
        details: {
          TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: !!TWILIO_AUTH_TOKEN,
          TWILIO_PHONE_NUMBER
        },
        message: "You must set all Twilio secrets in your Supabase project: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
          "Content-Type": "application/json",
        },
      });
    }

    // ודא שהמספר תקין
    if (!/^\+9725\d{8}$/.test(formattedPhone)) {
      console.error("Invalid phone format:", formattedPhone);
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid phone format",
        details: { formattedPhone }
      }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
          "Content-Type": "application/json",
        },
      });
    }

    // יצירת קוד אקראי
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // שליחת SMS דרך Twilio
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: TWILIO_PHONE_NUMBER,
        Body: `קוד האימות שלך הוא: ${otpCode}`,
      }),
    });

    const result = await twilioResponse.json();

    // לוג תשובת Twilio
    // (לאחר fetch)
    console.log("Twilio response status:", twilioResponse.status);
    console.log("Twilio response body:", result);

    if (!twilioResponse.ok) {
      console.error("Twilio error:", result);
      return new Response(JSON.stringify({
        success: false,
        error: "Twilio error",
        details: result
      }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      });
    }

    console.log("OTP sent to:", formattedPhone, "Code:", otpCode);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("send_otp error:", err && (err.stack || err.message || err));
    return new Response(JSON.stringify({
      success: false,
      error: String(err),
      stack: err && err.stack
    }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
        "Content-Type": "application/json",
      },
    });
  }
});

// הערה: 
// אם אתה רואה שגיאת 500 בלבד ב-Client ואין שום הודעה אחרת,
// פתח את ה-Network tab בדפדפן, לחץ על הבקשה ל-send_otp,
// ובדוק את ה-Response Body. שם תראה את הודעת השגיאה המפורטת שהוספנו.
// אם ה-Response ריק לחלוטין:
// 1. ודא שפרסמת מחדש (deploy) את הפונקציה אחרי כל שינוי.
// 2. ודא שכל הסודות (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) מוגדרים ב-Supabase Dashboard > Project Settings > Secrets.
// 3. נסה להפעיל את הפונקציה ידנית מ-Supabase Dashboard עם payload לדוגמה ובדוק את ה-logs.
// 4. אם עדיין אין שגיאה ברורה, נסה להוסיף return פשוט בתחילת הפונקציה כדי לוודא שהפונקציה בכלל רצה:
//
// serve(async (req) => {
//   return new Response("Function is alive", { status: 200 });
// });
//
// אם זה עובד, הבעיה היא בקוד הפנימי או בסודות.
// אם גם זה לא עובד, יש בעיה בפריסה או בשם הפונקציה.
//
// רק כאשר תראה error/message ב-Response תוכל לדעת מה הבעיה ולתקן.
