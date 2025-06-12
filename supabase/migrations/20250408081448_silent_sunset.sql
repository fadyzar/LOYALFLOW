-- הוספת מנוי חבילה בינונית לכל העסקים הקיימים

-- קבלת מזהה החבילה הבינונית
DO $$
DECLARE
  v_medium_plan_id uuid;
  v_business_record RECORD;
  v_current_date timestamptz := now();
  v_end_date timestamptz := v_current_date + interval '1 month';
BEGIN
  -- קבלת מזהה החבילה הבינונית
  SELECT id INTO v_medium_plan_id
  FROM subscription_plans
  WHERE code = 'medium';

  -- וידוא שהחבילה קיימת
  IF v_medium_plan_id IS NULL THEN
    RAISE EXCEPTION 'חבילה בינונית לא נמצאה';
  END IF;

  -- עבור על כל העסקים
  FOR v_business_record IN 
    SELECT id FROM businesses
    WHERE subscription_id IS NULL
  LOOP
    -- יצירת מנוי חדש
    WITH new_subscription AS (
      INSERT INTO subscriptions (
        business_id,
        plan_id,
        status,
        current_period_start,
        current_period_end,
        billing_cycle,
        metadata
      ) VALUES (
        v_business_record.id,
        v_medium_plan_id,
        'active',
        v_current_date,
        v_end_date,
        'monthly',
        jsonb_build_object(
          'created_by', 'system',
          'created_at', v_current_date,
          'notes', 'מנוי ראשוני אוטומטי - חבילה בינונית'
        )
      ) RETURNING id
    )
    -- עדכון העסק עם מזהה המנוי
    UPDATE businesses
    SET subscription_id = (SELECT id FROM new_subscription)
    WHERE id = v_business_record.id;

    -- יצירת רשומות שימוש ראשוניות עם אפס שימוש
    INSERT INTO subscription_usage (
      business_id,
      subscription_id,
      feature_code,
      usage_count,
      reset_at
    ) VALUES
    (
      v_business_record.id,
      (SELECT subscription_id FROM businesses WHERE id = v_business_record.id),
      'ai_tokens',
      0,
      v_end_date
    ),
    (
      v_business_record.id,
      (SELECT subscription_id FROM businesses WHERE id = v_business_record.id),
      'whatsapp_messages',
      0,
      v_end_date
    );
  END LOOP;
END $$;