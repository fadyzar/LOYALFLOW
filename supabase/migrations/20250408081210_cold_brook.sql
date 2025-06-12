-- Drop existing function first
DROP FUNCTION IF EXISTS log_token_usage(uuid, integer, text, uuid, uuid, text, integer, integer, jsonb);

-- Create updated function with jsonb return type
CREATE OR REPLACE FUNCTION log_token_usage(
  p_business_id uuid,
  p_tokens_used integer,
  p_usage_type text,
  p_user_id uuid DEFAULT NULL,
  p_customer_id uuid DEFAULT NULL,
  p_model_name text DEFAULT NULL,
  p_prompt_tokens integer DEFAULT NULL,
  p_completion_tokens integer DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_id uuid;
  v_tokens_check jsonb;
BEGIN
  -- בדיקה אם יש מספיק טוקנים
  v_tokens_check := check_tokens_for_action(p_business_id, p_tokens_used);
  
  IF NOT (v_tokens_check->>'has_enough_tokens')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', v_tokens_check->>'reason',
      'tokens_check', v_tokens_check
    );
  END IF;

  -- הוספת רשומת ניצול טוקנים
  INSERT INTO token_usage (
    business_id,
    user_id,
    customer_id,
    tokens_used,
    usage_type,
    model_name,
    prompt_tokens,
    completion_tokens,
    metadata
  ) VALUES (
    p_business_id,
    p_user_id,
    p_customer_id,
    p_tokens_used,
    p_usage_type,
    p_model_name,
    p_prompt_tokens,
    p_completion_tokens,
    p_metadata
  )
  RETURNING id INTO v_usage_id;

  -- עדכון ניצול הטוקנים במנוי
  PERFORM increment_feature_usage(
    p_business_id,
    'ai_tokens',
    p_tokens_used
  );

  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'tokens_used', p_tokens_used,
    'tokens_info', v_tokens_check->>'tokens_info'
  );
END;
$$;

-- הענקת הרשאות
GRANT EXECUTE ON FUNCTION log_token_usage TO authenticated;