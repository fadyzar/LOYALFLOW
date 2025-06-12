# מדריך להטמעת מערכת צ'אט AI ב-LoyalFlow

## סקירה כללית
LoyalFlow היא מערכת לניהול תורים ולקוחות הכוללת צ'אט AI חכם המסייע לבעלי עסקים בניהול היומיומי. הצ'אט מתממשק ישירות ל-Supabase ויכול לבצע פעולות CRUD מלאות על בסיס הנתונים.

## ארכיטקטורה
- **Frontend**: React + TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI Integration**: n8n עם AI Agent
- **Real-time Updates**: Supabase Realtime

## מבנה בסיס הנתונים

### טבלאות מרכזיות:

#### 1. businesses
```sql
- id (uuid, PK)
- name (text)
- booking_link (text)
- settings (jsonb)
- contact_info (jsonb)
- created_at (timestamp)
```

#### 2. customers
```sql
- id (uuid, PK)
- business_id (uuid, FK)
- name (text)
- phone (text)
- email (text)
- points (integer)
- diamonds (integer)
- loyalty_level (text)
- loyalty_stats (jsonb)
```

#### 3. appointments
```sql
- id (uuid, PK)
- business_id (uuid, FK)
- customer_id (uuid, FK)
- staff_id (uuid, FK)
- service_id (uuid, FK)
- start_time (timestamp)
- end_time (timestamp)
- status (text)
- notes (text)
```

#### 4. services
```sql
- id (uuid, PK)
- business_id (uuid, FK)
- name (text)
- name_he (text)
- price (numeric)
- duration (interval)
```

#### 5. staff_services
```sql
- id (uuid, PK)
- staff_id (uuid, FK)
- service_id (uuid, FK)
- price (numeric)
- duration (interval)
```

#### 6. business_hours
```sql
- id (uuid, PK)
- business_id (uuid, FK)
- regular_hours (jsonb)
- special_dates (jsonb)
```

## פעולות נפוצות שה-AI צריך לבצע

### 1. ניהול תורים
- בדיקת תורים להיום/מחר
- חיפוש תורים לפי לקוח
- ביטול/שינוי תורים
- בדיקת זמינות
- קביעת תורים חדשים

### 2. ניהול לקוחות
- חיפוש לקוחות
- בדיקת היסטוריית לקוח
- עדכון פרטי לקוח
- בדיקת נקודות ויהלומים

### 3. ניתוח נתונים
- סיכום הכנסות
- דוחות תפוסה
- סטטיסטיקות ביטולים
- ניתוח מגמות

## הגדרת n8n Workflow

### 1. טריגרים
- קבלת הודעה מהצ'אט
- שינויים בטבלאות מרכזיות
- התראות מערכת

### 2. פעולות
- ניתוח טקסט עם AI Agent
- שליפת נתונים מ-Supabase
- עדכון נתונים ב-Supabase
- שליחת תשובה לצ'אט

### 3. תנאים לוגיים
- בדיקת הרשאות
- וולידציה של נתונים
- טיפול בשגיאות

## דוגמאות לשאילתות

### 1. בדיקת תורים להיום
```sql
SELECT 
  a.*,
  c.name as customer_name,
  s.name_he as service_name,
  u.name as staff_name
FROM appointments a
JOIN customers c ON a.customer_id = c.id
JOIN services s ON a.service_id = s.id
JOIN users u ON a.staff_id = u.id
WHERE 
  a.business_id = :business_id
  AND DATE(a.start_time) = CURRENT_DATE
  AND a.status NOT IN ('cancelled', 'completed')
ORDER BY a.start_time;
```

### 2. חיפוש זמנים פנויים
```sql
WITH staff_availability AS (
  SELECT 
    generate_series(
      date_trunc('hour', :start_date::timestamp),
      date_trunc('hour', :end_date::timestamp),
      '30 minutes'::interval
    ) AS slot_time
)
SELECT 
  sa.slot_time
FROM staff_availability sa
LEFT JOIN appointments a ON 
  a.staff_id = :staff_id
  AND sa.slot_time BETWEEN a.start_time AND a.end_time
WHERE a.id IS NULL;
```

### 3. עדכון נקודות נאמנות
```sql
UPDATE customers
SET 
  points = points + :points_to_add,
  diamonds = CASE 
    WHEN loyalty_stats->>'consecutive_visits' >= :visits_for_diamond 
    THEN diamonds + 1 
    ELSE diamonds 
  END,
  loyalty_stats = jsonb_set(
    loyalty_stats,
    '{consecutive_visits}',
    (COALESCE((loyalty_stats->>'consecutive_visits')::int, 0) + 1)::text::jsonb
  )
WHERE id = :customer_id;
```

## טיפים להטמעה

1. **הרשאות**
   - הגדר RLS policies מתאימות
   - וודא שה-AI פועל תחת הרשאות נכונות
   - הגבל פעולות לפי סוג משתמש

2. **ביצועים**
   - השתמש ב-indexes מתאימים
   - אופטימיזציה של שאילתות
   - שימוש ב-caching כשאפשר

3. **אבטחה**
   - סניטציה של קלט
   - וולידציה של נתונים
   - לוגים של כל הפעולות

4. **חוויית משתמש**
   - תשובות ברורות ומובנות
   - טיפול במקרי קצה
   - משוב על פעולות

## דוגמאות לתרחישים

### תרחיש 1: בדיקת תורים
```
משתמש: "מה התורים שלי להיום?"
AI: מבצע:
1. בדיקת business_id של המשתמש
2. שליפת תורים להיום
3. פורמט התוצאות בצורה קריאה
4. החזרת תשובה מפורטת
```

### תרחיש 2: קביעת תור
```
משתמש: "קבע תור לדני כהן למחר בבוקר"
AI: מבצע:
1. חיפוש הלקוח במערכת
2. בדיקת זמינות
3. הצעת מועדים אפשריים
4. קביעת התור
5. שליחת אישור
```

### תרחיש 3: ניתוח נתונים
```
משתמש: "כמה הכנסתי החודש?"
AI: מבצע:
1. חישוב הכנסות מתורים
2. חישוב הכנסות ממוצרים
3. השוואה לחודש קודם
4. הצגת סיכום מפורט
```

## הערות נוספות

1. **שפה**
   - תמיכה מלאה בעברית
   - זיהוי שמות ומספרי טלפון
   - פורמט תאריכים ושעות מותאם

2. **התאמה אישית**
   - למידה מהעדפות המשתמש
   - זכירת הקשר שיחה
   - התאמת תשובות לסוג העסק

3. **שילוב עם המערכת**
   - עדכון בזמן אמת
   - סנכרון עם לוח השנה
   - התראות אוטומטיות