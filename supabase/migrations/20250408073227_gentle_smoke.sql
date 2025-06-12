-- Create token_usage table
CREATE TABLE IF NOT EXISTS token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  customer_id uuid REFERENCES customers(id),
  tokens_used integer NOT NULL,
  usage_type text NOT NULL,
  model_name text,
  prompt_tokens integer,
  completion_tokens integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_token_usage_business ON token_usage(business_id);
CREATE INDEX idx_token_usage_user ON token_usage(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_token_usage_customer ON token_usage(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_token_usage_created_at ON token_usage(created_at);
CREATE INDEX idx_token_usage_type ON token_usage(usage_type);

-- Enable RLS
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their business token usage"
  ON token_usage
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert token usage"
  ON token_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to log token usage
-- Fixed: Ensuring all parameters after ones with defaults also have defaults
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
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_id uuid;
BEGIN
  -- Validate inputs
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'Business ID is required';
  END IF;

  IF p_tokens_used <= 0 THEN
    RAISE EXCEPTION 'Tokens used must be greater than 0';
  END IF;

  IF p_usage_type IS NULL THEN
    RAISE EXCEPTION 'Usage type is required';
  END IF;

  -- Insert token usage record
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

  RETURN v_usage_id;
END;
$$;

-- Create function to get token usage summary
CREATE OR REPLACE FUNCTION get_token_usage_summary(
  p_business_id uuid,
  p_start_date timestamptz DEFAULT (now() - interval '30 days'),
  p_end_date timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tokens integer;
  v_user_tokens integer;
  v_customer_tokens integer;
  v_by_type jsonb;
  v_by_day jsonb;
BEGIN
  -- Get total tokens used
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_total_tokens
  FROM token_usage
  WHERE business_id = p_business_id
  AND created_at BETWEEN p_start_date AND p_end_date;

  -- Get tokens used by users
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_user_tokens
  FROM token_usage
  WHERE business_id = p_business_id
  AND user_id IS NOT NULL
  AND created_at BETWEEN p_start_date AND p_end_date;

  -- Get tokens used by customers
  SELECT COALESCE(SUM(tokens_used), 0)
  INTO v_customer_tokens
  FROM token_usage
  WHERE business_id = p_business_id
  AND customer_id IS NOT NULL
  AND created_at BETWEEN p_start_date AND p_end_date;

  -- Get usage by type
  SELECT jsonb_object_agg(usage_type, tokens)
  INTO v_by_type
  FROM (
    SELECT 
      usage_type, 
      SUM(tokens_used) as tokens
    FROM token_usage
    WHERE business_id = p_business_id
    AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY usage_type
  ) as usage_by_type;

  -- Get usage by day
  SELECT jsonb_object_agg(day, tokens)
  INTO v_by_day
  FROM (
    SELECT 
      to_char(created_at, 'YYYY-MM-DD') as day, 
      SUM(tokens_used) as tokens
    FROM token_usage
    WHERE business_id = p_business_id
    AND created_at BETWEEN p_start_date AND p_end_date
    GROUP BY day
    ORDER BY day
  ) as usage_by_day;

  -- Return summary
  RETURN jsonb_build_object(
    'total_tokens', v_total_tokens,
    'user_tokens', v_user_tokens,
    'customer_tokens', v_customer_tokens,
    'by_type', COALESCE(v_by_type, '{}'::jsonb),
    'by_day', COALESCE(v_by_day, '{}'::jsonb),
    'start_date', p_start_date,
    'end_date', p_end_date
  );
END;
$$;

-- Grant permissions
GRANT ALL ON token_usage TO authenticated;
GRANT EXECUTE ON FUNCTION log_token_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_usage_summary TO authenticated;