-- Create function to calculate token usage within subscription period
CREATE OR REPLACE FUNCTION calculate_subscription_token_usage(
  p_business_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription subscriptions;
  v_total_usage bigint := 0;
BEGIN
  -- Get the active subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id
  AND status = 'active';

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Calculate total token usage within the current subscription period
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_total_usage
  FROM token_usage
  WHERE business_id = p_business_id
  AND created_at >= v_subscription.current_period_start
  AND created_at <= COALESCE(v_subscription.current_period_end, now());

  RETURN v_total_usage;
END;
$$;

-- Update get_remaining_tokens function to use the subscription period calculation
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
  v_display_limit integer;
  v_display_used integer;
  v_display_remaining integer;
  v_is_available boolean;
BEGIN
  -- Get the subscription
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

  -- Get the plan
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Check if AI feature is available in the plan
  v_is_available := v_plan.features->>'ai_assistant' = 'true';

  -- If feature is not available, return error
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

  -- Get token limit
  v_tokens_limit := (v_plan.limits->>'ai_tokens')::bigint;

  -- Calculate token usage within the current subscription period
  v_tokens_used := calculate_subscription_token_usage(p_business_id);

  -- Calculate remaining tokens
  IF v_tokens_limit IS NULL THEN
    v_tokens_remaining := NULL;
  ELSE
    v_tokens_remaining := GREATEST(0, v_tokens_limit - v_tokens_used);
  END IF;

  -- Convert to display values
  v_display_limit := convert_tokens_to_display(v_tokens_limit);
  v_display_used := convert_tokens_to_display(v_tokens_used);
  
  IF v_tokens_remaining IS NULL THEN
    v_display_remaining := NULL;
  ELSE
    v_display_remaining := convert_tokens_to_display(v_tokens_remaining);
  END IF;

  -- Return token information
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

-- Update check_tokens_for_action to use the updated get_remaining_tokens function
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
  -- Get token information
  v_tokens_info := get_remaining_tokens(p_business_id);
  
  -- Check if feature is available
  IF NOT (v_tokens_info->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'has_enough_tokens', false,
      'reason', 'AI feature not available in current plan',
      'tokens_info', v_tokens_info
    );
  END IF;
  
  -- Check if there are enough tokens
  IF (v_tokens_info->>'tokens_limit')::bigint IS NULL THEN
    -- If no limit, always enough
    RETURN jsonb_build_object(
      'has_enough_tokens', true,
      'reason', 'Unlimited tokens',
      'tokens_info', v_tokens_info
    );
  ELSIF (v_tokens_info->>'tokens_remaining')::bigint < p_tokens_needed THEN
    -- Not enough tokens
    RETURN jsonb_build_object(
      'has_enough_tokens', false,
      'reason', 'Not enough tokens remaining',
      'tokens_needed', p_tokens_needed,
      'tokens_info', v_tokens_info
    );
  ELSE
    -- Enough tokens
    RETURN jsonb_build_object(
      'has_enough_tokens', true,
      'reason', 'Sufficient tokens available',
      'tokens_needed', p_tokens_needed,
      'tokens_info', v_tokens_info
    );
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_subscription_token_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_remaining_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION check_tokens_for_action TO authenticated;