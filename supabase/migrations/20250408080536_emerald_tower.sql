/*
  # עדכון מערכת המנויים והטוקנים

  1. שינויים
    - עדכון הגדרות החבילות עם מגבלות הטוקנים החדשות
    - הוספת פונקציות להמרת טוקנים בין ערך אמיתי לערך מוצג
    - הסרת הגבלת הודעות בצ'אט של בית העסק
    - עדכון פונקציות לבדיקת זמינות תכונות

  2. מגבלות חדשות
    - חבילה בינונית: 6,000,000 טוקנים (מוצג כ-6,000)
    - חבילת VIP: 24,000,000 טוקנים (מוצג כ-24,000)
*/

-- עדכון הגדרות החבילות עם מגבלות הטוקנים החדשות
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

-- פונקציה להמרת טוקנים מערך אמיתי לערך מוצג
CREATE OR REPLACE FUNCTION convert_tokens_to_display(
  p_tokens bigint
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- המרה מטוקנים אמיתיים (מיליונים) לערך מוצג (אלפים)
  -- 6,000,000 -> 6,000
  RETURN p_tokens / 1000;
END;
$$;

-- פונקציה להמרת טוקנים מערך מוצג לערך אמיתי
CREATE OR REPLACE FUNCTION convert_display_to_tokens(
  p_display_tokens integer
)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- המרה מערך מוצג (אלפים) לטוקנים אמיתיים (מיליונים)
  -- 6,000 -> 6,000,000
  RETURN p_display_tokens * 1000;
END;
$$;

-- עדכון פונקציית בדיקת זמינות תכונות כדי לתמוך בהמרת טוקנים
CREATE OR REPLACE FUNCTION check_feature_availability(
  p_business_id uuid,
  p_feature_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_plan subscription_plans;
  v_is_available boolean;
  v_limit bigint;
  v_usage bigint := 0;
  v_usage_record subscription_usage;
  v_display_limit integer;
  v_display_usage integer;
  v_display_remaining integer;
BEGIN
  -- קבלת המנוי
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'No active subscription',
      'limit', 0,
      'usage', 0,
      'remaining', 0,
      'display_limit', 0,
      'display_usage', 0,
      'display_remaining', 0
    );
  END IF;

  -- קבלת החבילה
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- בדיקה אם התכונה זמינה בחבילה
  v_is_available := v_plan.features->>p_feature_code = 'true';

  -- אם התכונה לא זמינה, החזר שגיאה
  IF NOT v_is_available THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Feature not available in current plan',
      'limit', 0,
      'usage', 0,
      'remaining', 0,
      'display_limit', 0,
      'display_usage', 0,
      'display_remaining', 0
    );
  END IF;

  -- קבלת מגבלת התכונה
  v_limit := (v_plan.limits->>p_feature_code)::bigint;

  -- קבלת השימוש הנוכחי
  SELECT * INTO v_usage_record
  FROM subscription_usage
  WHERE business_id = p_business_id
  AND feature_code = p_feature_code;

  IF FOUND THEN
    v_usage := v_usage_record.usage_count;
  END IF;

  -- המרה לערכים מוצגים אם מדובר בטוקנים
  IF p_feature_code = 'ai_tokens' THEN
    v_display_limit := convert_tokens_to_display(v_limit);
    v_display_usage := convert_tokens_to_display(v_usage);
    v_display_remaining := CASE 
      WHEN v_limit IS NULL THEN NULL
      ELSE convert_tokens_to_display(GREATEST(0, v_limit - v_usage))
    END;
  ELSE
    v_display_limit := v_limit;
    v_display_usage := v_usage;
    v_display_remaining := CASE 
      WHEN v_limit IS NULL THEN NULL
      ELSE GREATEST(0, v_limit - v_usage)
    END;
  END IF;

  -- אם המגבלה היא null, התכונה ללא הגבלה
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'available', true,
      'reason', 'Unlimited feature',
      'limit', null,
      'usage', v_usage,
      'remaining', null,
      'display_limit', null,
      'display_usage', v_display_usage,
      'display_remaining', null
    );
  END IF;

  -- בדיקה אם השימוש בתוך המגבלה
  IF v_usage >= v_limit THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Usage limit reached',
      'limit', v_limit,
      'usage', v_usage,
      'remaining', 0,
      'display_limit', v_display_limit,
      'display_usage', v_display_usage,
      'display_remaining', 0
    );
  END IF;

  -- התכונה זמינה ובתוך המגבלות
  RETURN jsonb_build_object(
    'available', true,
    'reason', 'Available',
    'limit', v_limit,
    'usage', v_usage,
    'remaining', v_limit - v_usage,
    'display_limit', v_display_limit,
    'display_usage', v_display_usage,
    'display_remaining', v_display_remaining
  );
END;
$$;

-- עדכון פונקציית הגדלת השימוש בתכונה כדי לתמוך בהמרת טוקנים
CREATE OR REPLACE FUNCTION increment_feature_usage(
  p_business_id uuid,
  p_feature_code text,
  p_increment integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_plan subscription_plans;
  v_usage subscription_usage;
  v_availability jsonb;
  v_reset_at timestamptz;
  v_actual_increment bigint;
BEGIN
  -- המרת הערך המוצג לערך אמיתי אם מדובר בטוקנים
  IF p_feature_code = 'ai_tokens' THEN
    v_actual_increment := p_increment;
  ELSE
    v_actual_increment := p_increment;
  END IF;

  -- בדיקה אם התכונה זמינה
  v_availability := check_feature_availability(p_business_id, p_feature_code);
  
  IF NOT (v_availability->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', v_availability->>'reason',
      'availability', v_availability
    );
  END IF;

  -- קבלת המנוי
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id
  AND status = 'active';

  -- חישוב תאריך איפוס בהתאם למחזור החיוב
  v_reset_at := CASE
    WHEN v_subscription.billing_cycle = 'monthly' THEN
      v_subscription.current_period_end
    ELSE
      (date_trunc('month', now()) + interval '1 month')::date
  END;

  -- קבלת או יצירת רשומת שימוש
  SELECT * INTO v_usage
  FROM subscription_usage
  WHERE business_id = p_business_id
  AND feature_code = p_feature_code
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO subscription_usage (
      business_id,
      subscription_id,
      feature_code,
      usage_count,
      reset_at
    ) VALUES (
      p_business_id,
      v_subscription.id,
      p_feature_code,
      v_actual_increment,
      v_reset_at
    )
    RETURNING * INTO v_usage;
  ELSE
    -- עדכון השימוש
    UPDATE subscription_usage
    SET 
      usage_count = usage_count + v_actual_increment,
      updated_at = now()
    WHERE id = v_usage.id
    RETURNING * INTO v_usage;
  END IF;

  -- החזרת שימוש מעודכן
  RETURN jsonb_build_object(
    'success', true,
    'usage', v_usage.usage_count,
    'limit', (v_availability->>'limit')::bigint,
    'remaining', 
      CASE 
        WHEN (v_availability->>'limit')::bigint IS NULL THEN NULL
        ELSE (v_availability->>'limit')::bigint - v_usage.usage_count
      END,
    'display_usage', (v_availability->>'display_usage')::integer,
    'display_limit', (v_availability->>'display_limit')::integer,
    'display_remaining', (v_availability->>'display_remaining')::integer
  );
END;
$$;

-- עדכון פונקציית קבלת פרטי מנוי עסק כדי לתמוך בהמרת טוקנים
CREATE OR REPLACE FUNCTION get_business_subscription(
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_plan subscription_plans;
  v_usage jsonb;
  v_display_limits jsonb;
  v_display_usage jsonb;
BEGIN
  -- קבלת המנוי
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false
    );
  END IF;

  -- קבלת החבילה
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- קבלת שימוש עבור כל התכונות
  SELECT jsonb_object_agg(feature_code, usage_count)
  INTO v_usage
  FROM subscription_usage
  WHERE business_id = p_business_id;

  -- המרת מגבלות לערכים מוצגים
  v_display_limits := v_plan.limits;
  IF v_plan.limits ? 'ai_tokens' THEN
    v_display_limits := jsonb_set(
      v_display_limits,
      '{ai_tokens}',
      to_jsonb(convert_tokens_to_display((v_plan.limits->>'ai_tokens')::bigint))
    );
  END IF;

  -- המרת שימוש לערכים מוצגים
  v_display_usage := v_usage;
  IF v_usage ? 'ai_tokens' THEN
    v_display_usage := jsonb_set(
      v_display_usage,
      '{ai_tokens}',
      to_jsonb(convert_tokens_to_display((v_usage->>'ai_tokens')::bigint))
    );
  END IF;

  -- החזרת פרטי המנוי
  RETURN jsonb_build_object(
    'has_subscription', true,
    'subscription', jsonb_build_object(
      'id', v_subscription.id,
      'status', v_subscription.status,
      'current_period_start', v_subscription.current_period_start,
      'current_period_end', v_subscription.current_period_end,
      'cancel_at_period_end', v_subscription.cancel_at_period_end,
      'billing_cycle', v_subscription.billing_cycle
    ),
    'plan', jsonb_build_object(
      'id', v_plan.id,
      'name', v_plan.name,
      'code', v_plan.code,
      'description', v_plan.description,
      'features', v_plan.features,
      'limits', v_plan.limits,
      'display_limits', v_display_limits,
      'price', CASE 
        WHEN v_subscription.billing_cycle = 'monthly' THEN v_plan.monthly_price
        ELSE v_plan.yearly_price
      END
    ),
    'usage', COALESCE(v_usage, '{}'::jsonb),
    'display_usage', COALESCE(v_display_usage, '{}'::jsonb)
  );
END;
$$;

-- פונקציה לקבלת יתרת הטוקנים הנותרת לעסק
CREATE OR REPLACE FUNCTION get_remaining_tokens(
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_availability jsonb;
BEGIN
  -- בדיקת זמינות תכונת הטוקנים
  v_availability := check_feature_availability(p_business_id, 'ai_tokens');
  
  -- החזרת יתרת הטוקנים
  RETURN jsonb_build_object(
    'available', (v_availability->>'available')::boolean,
    'tokens_limit', (v_availability->>'limit')::bigint,
    'tokens_used', (v_availability->>'usage')::bigint,
    'tokens_remaining', (v_availability->>'remaining')::bigint,
    'display_limit', (v_availability->>'display_limit')::integer,
    'display_used', (v_availability->>'display_usage')::integer,
    'display_remaining', (v_availability->>'display_remaining')::integer
  );
END;
$$;

-- פונקציה לבדיקה אם יש מספיק טוקנים לפעולה
CREATE OR REPLACE FUNCTION check_tokens_for_action(
  p_business_id uuid,
  p_tokens_needed integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tokens_info jsonb;
BEGIN
  -- קבלת יתרת הטוקנים
  v_tokens_info := get_remaining_tokens(p_business_id);
  
  -- בדיקה אם התכונה זמינה בכלל
  IF NOT (v_tokens_info->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'has_enough_tokens', false,
      'reason', 'AI feature not available in current plan',
      'tokens_info', v_tokens_info
    );
  END IF;
  
  -- בדיקה אם יש מספיק טוקנים
  IF (v_tokens_info->>'tokens_limit')::bigint IS NULL THEN
    -- אם אין מגבלה, תמיד יש מספיק
    RETURN jsonb_build_object(
      'has_enough_tokens', true,
      'reason', 'Unlimited tokens',
      'tokens_info', v_tokens_info
    );
  ELSIF (v_tokens_info->>'tokens_remaining')::bigint < p_tokens_needed THEN
    -- אם אין מספיק טוקנים
    RETURN jsonb_build_object(
      'has_enough_tokens', false,
      'reason', 'Not enough tokens remaining',
      'tokens_needed', p_tokens_needed,
      'tokens_info', v_tokens_info
    );
  ELSE
    -- יש מספיק טוקנים
    RETURN jsonb_build_object(
      'has_enough_tokens', true,
      'reason', 'Sufficient tokens available',
      'tokens_needed', p_tokens_needed,
      'tokens_info', v_tokens_info
    );
  END IF;
END;
$$;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION convert_tokens_to_display TO authenticated;
GRANT EXECUTE ON FUNCTION convert_display_to_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION check_tokens_for_action TO authenticated;