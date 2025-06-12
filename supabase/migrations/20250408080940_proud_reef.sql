/*
  # עדכון מגבלות הטוקנים בתוכניות המנויים

  1. שינויים
    - עדכון מגבלות הטוקנים בחבילות השונות
    - חבילה בינונית: 6,000,000 טוקנים (מוצג כ-6,000)
    - חבילת VIP: 24,000,000 טוקנים (מוצג כ-24,000)
*/

-- עדכון מגבלות הטוקנים בחבילות
UPDATE subscription_plans
SET 
  limits = jsonb_build_object(
    'customers', 100,
    'ai_tokens', 0,
    'whatsapp_messages', 0
  )
WHERE code = 'basic';

UPDATE subscription_plans
SET 
  limits = jsonb_build_object(
    'customers', null,
    'ai_tokens', 6000000, -- 6 מיליון טוקנים
    'whatsapp_messages', 1000
  )
WHERE code = 'medium';

UPDATE subscription_plans
SET 
  limits = jsonb_build_object(
    'customers', null,
    'ai_tokens', 24000000, -- 24 מיליון טוקנים
    'whatsapp_messages', null
  )
WHERE code = 'vip';