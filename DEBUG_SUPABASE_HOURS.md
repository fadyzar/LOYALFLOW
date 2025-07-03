# המלצות לאיתור ופתרון בעיות קליטת והצגת שעות פעילות מ-Supabase

## 1. בדוק את הנתונים ב-Supabase
- ודא שטבלת `business_hours` קיימת, ושדה `regular_hours` הוא מסוג JSON.
- ודא שהמבנה של ה-JSON תואם למה שהקוד שלך מצפה (מפתחות באנגלית, ערכים תקינים, is_active, start_time, end_time).

## 2. הדפס את כל הנתונים שמתקבלים מהשרת
- בכל שליפה (`select`) הדפס ל-console את כל האובייקט שמתקבל (`console.log('business_hours data:', data)`).
- הדפס גם את הערכים שאתה שולף מתוך ה-JSON (`console.log('regularHours:', regularHours)`).

## 3. טפל בכל מקרה של ערך ריק או לא תקין
- אם `regular_hours` הוא מחרוזת, המר אותו ל-JSON (`JSON.parse`).
- אם חסר מפתח ליום מסוים, הצג הודעה מתאימה או חסום את כל היומן.
- אם שעות הפתיחה/סגירה לא תקינות (ריקות, שוות, או open >= close), חסום הכל.

## 4. אל תשתמש בערכי ברירת מחדל בקוד
- אל תעביר ערך ברירת מחדל ל-DayView (למשל '12:00'), אלא רק את מה שמגיע מה-DB.
- אם אין שעות פעילות, העבר מחרוזת ריקה או undefined.

## 5. ודא שהקוד לא מציג את היומן עד שה-business נטען מה-context
- אל תציג את היומן עד שה-business נטען.
- אם אין שעות פעילות, הצג הודעה ברורה למשתמש (ולא רק חסימה ויזואלית).

## 6. דוגמה ללוגיקה מומלצת לשליפת שעות פעילות
```typescript
const { data, error } = await supabase
  .from('business_hours')
  .select('regular_hours, special_dates')
  .eq('business_id', businessId)
  .single();

if (error || !data) {
  setBusinessHours(null);
  return;
}

const regularHours = typeof data.regular_hours === 'string'
  ? JSON.parse(data.regular_hours)
  : data.regular_hours;

const todayHours = regularHours && regularHours[currentDayName];
if (todayHours && todayHours.is_active && todayHours.start_time && todayHours.end_time) {
  setBusinessHours({ start_time: todayHours.start_time, end_time: todayHours.end_time });
} else {
  setBusinessHours(null);
}
```

## 7. דוגמה ללוגיקה ב-DayView
```typescript
const getTimeInMinutes = (timeStr: string | undefined) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const totalHeight = 24 * 80;
let openMinutes = getTimeInMinutes(businessOpenTime);
let closeMinutes = getTimeInMinutes(businessCloseTime);

const noBusinessHours =
  !businessOpenTime ||
  !businessCloseTime ||
  businessOpenTime === businessCloseTime ||
  openMinutes >= closeMinutes;

const earlyHeight = noBusinessHours ? 0 : (openMinutes / 60) * 80;
const lateHeight = noBusinessHours ? totalHeight : totalHeight - (closeMinutes / 60) * 80;
```

## 8. אם עדיין לא מסתדר:
- הדפס את כל מה שמתקבל מה-DB ושלח את הפלט.
- בדוק שאין הבדל בין מה שמוצג ב-Supabase לבין מה שמתקבל בקוד.
- נסה לשלוף את הנתונים ישירות ב-console של Supabase ולוודא שהם תקינים.

---

**סיכום:**  
הבעיה לרוב נובעת ממבנה נתונים לא עקבי, טיפוס לא נכון (JSON/טקסט), או שימוש בערכי ברירת מחדל בקוד.  
הדפסה מסיבית של כל שלב תעזור לאתר את מקור הבעיה.  
הקפד להפריד בין שליפת נתונים לבין הצגה, ולטפל בכל מקרה של ערך חסר או לא תקין.
