/*
  # יצירת פונקציות המרת טוקנים

  1. פונקציות חדשות
    - convert_tokens_to_display: המרת טוקנים אמיתיים (מיליונים) לערך מוצג (אלפים)
    - convert_display_to_tokens: המרת ערך מוצג (אלפים) לטוקנים אמיתיים (מיליונים)
    - get_remaining_tokens: קבלת יתרת הטוקנים הנותרת לעסק
    - check_tokens_for_action: בדיקה אם יש מספיק טוקנים לפעולה
*/

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

-- פונקציה לקבלת יתרת הטוקנים הנותרת לעסק
CREATE OR REPLACE FUNCTION get_remaining_tokens(
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_plan subscription_plans;
  v_tokens_limit bigint;
  v_tokens_used bigint := 0;
  v_tokens_remaining bigint;
  v_usage_record subscription_usage;
  v_display_limit integer;
  v_display_used integer;
  v_display_remaining integer;
  v_current_month text;
  v_is_available boolean;
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
      'tokens_limit', 0,
      'tokens_used', 0,
      'tokens_remaining', 0,
      'display_limit', 0,
      'display_used', 0,
      'display_remaining', 0
    );
  END IF;

  -- קבלת החבילה
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- בדיקה אם תכונת AI זמינה בחבילה
  v_is_available := v_plan.features->>'ai_assistant' = 'true';

  -- אם התכונה לא זמינה, החזר שגיאה
  IF NOT v_is_available THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'AI feature not available in current plan',
      'tokens_limit', 0,
      'tokens_used', 0,
      'tokens_remaining', 0,
      'display_limit', 0,
      'display_used', 0,
      'display_remaining', 0
    );
  END IF;

  -- קבלת מגבלת הטוקנים
  v_tokens_limit := (v_plan.limits->>'ai_tokens')::bigint;

  -- קבלת השימוש הנוכחי
  SELECT * INTO v_usage_record
  FROM subscription_usage
  WHERE business_id = p_business_id
  AND feature_code = 'ai_tokens';

  IF FOUND THEN
    v_tokens_used := v_usage_record.usage_count;
  END IF;

  -- חישוב יתרת הטוקנים
  IF v_tokens_limit IS NULL THEN
    v_tokens_remaining := NULL;
  ELSE
    v_tokens_remaining := GREATEST(0, v_tokens_limit - v_tokens_used);
  END IF;

  -- המרה לערכים מוצגים
  v_display_limit := convert_tokens_to_display(v_tokens_limit);
  v_display_used := convert_tokens_to_display(v_tokens_used);
  
  IF v_tokens_remaining IS NULL THEN
    v_display_remaining := NULL;
  ELSE
    v_display_remaining := convert_tokens_to_display(v_tokens_remaining);
  END IF;

  -- החזרת יתרת הטוקנים
  RETURN jsonb_build_object(
    'available', v_is_available,
    'tokens_limit', v_tokens_limit,
    'tokens_used', v_tokens_used,
    'tokens_remaining', v_tokens_remaining,
    'display_limit', v_display_limit,
    'display_used', v_display_used,
    'display_remaining', v_display_remaining
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