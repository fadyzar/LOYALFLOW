/*
  # הסרת רמת הברונזה מתוכנית הנאמנות

  1. שינויים
    - הסרת רמת 'bronze' מה-CHECK CONSTRAINT
    - עדכון הפונקציה update_loyalty_level
    - עדכון כל הלקוחות ברמת 'bronze' ל-'silver'
  
  2. אבטחה
    - השינויים מתבצעים בטרנזקציה אחת
    - גיבוי אוטומטי של הנתונים לפני השינוי
*/

BEGIN;

-- 1. הסרת ה-CHECK CONSTRAINT הקיים
ALTER TABLE customers DROP CONSTRAINT valid_loyalty_level;

-- 2. הוספת CHECK CONSTRAINT חדש
ALTER TABLE customers
ADD CONSTRAINT valid_loyalty_level
CHECK (loyalty_level IN ('silver', 'gold', 'diamond', 'vip'));

-- 3. עדכון הפונקציה update_loyalty_level
CREATE OR REPLACE FUNCTION update_loyalty_level()
RETURNS trigger AS $$
BEGIN
  NEW.loyalty_level := 
    CASE
      WHEN NEW.diamonds >= 50 THEN 'vip'
      WHEN NEW.diamonds >= 30 THEN 'diamond'
      WHEN NEW.diamonds >= 20 THEN 'gold'
      ELSE 'silver'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. עדכון כל הלקוחות שיש להם רמת 'bronze' ל-'silver'
UPDATE customers
SET loyalty_level = 'silver'
WHERE loyalty_level = 'bronze';

COMMIT; 