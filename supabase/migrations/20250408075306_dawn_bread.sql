/*
  # Add Subscription System

  1. New Tables
    - `subscription_plans` - Defines available subscription plans and their features
    - `subscriptions` - Tracks business subscriptions
    - `subscription_usage` - Tracks usage against plan limits

  2. Schema Updates
    - Add subscription_id to businesses table
    - Add plan-related fields to track limits and usage

  3. Security
    - Enable RLS
    - Add policies for access control
*/

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  description text,
  features jsonb NOT NULL,
  limits jsonb NOT NULL,
  monthly_price numeric(10,2) NOT NULL,
  yearly_price numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL UNIQUE,
  plan_id uuid REFERENCES subscription_plans(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  payment_method text,
  payment_provider text,
  payment_provider_id text,
  billing_cycle text NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_usage table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES businesses(id) NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) NOT NULL,
  feature_code text NOT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(business_id, feature_code)
);

-- Add subscription_id to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_subscriptions_business ON subscriptions(business_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscription_usage_business ON subscription_usage(business_id);
CREATE INDEX idx_subscription_usage_subscription ON subscription_usage(subscription_id);
CREATE INDEX idx_subscription_usage_feature ON subscription_usage(feature_code);

-- Create policies
CREATE POLICY "Allow public access to subscription plans"
  ON subscription_plans
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can view their business subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business subscription usage"
  ON subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_subscription_plans_timestamp
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

CREATE TRIGGER update_subscriptions_timestamp
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

CREATE TRIGGER update_subscription_usage_timestamp
  BEFORE UPDATE ON subscription_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- Insert default subscription plans
INSERT INTO subscription_plans (
  name,
  code,
  description,
  features,
  limits,
  monthly_price,
  yearly_price
) VALUES 
(
  'חבילה בסיסית',
  'basic',
  'חבילה בסיסית לעסקים קטנים',
  jsonb_build_object(
    'unlimited_appointments', true,
    'statistics', true,
    'ai_assistant', false,
    'invoices', false,
    'customer_service_bot', false,
    'loyalty_program', false
  ),
  jsonb_build_object(
    'customers', 100,
    'ai_actions', 0,
    'whatsapp_messages', 0
  ),
  89.00,
  75.00
),
(
  'חבילה בינונית',
  'medium',
  'חבילה בינונית לעסקים בצמיחה',
  jsonb_build_object(
    'unlimited_appointments', true,
    'statistics', true,
    'ai_assistant', true,
    'invoices', true,
    'customer_service_bot', true,
    'loyalty_program', true
  ),
  jsonb_build_object(
    'customers', null,
    'ai_actions', 200,
    'whatsapp_messages', 1000
  ),
  209.00,
  152.00
),
(
  'חבילת VIP',
  'vip',
  'חבילה מתקדמת לעסקים גדולים',
  jsonb_build_object(
    'unlimited_appointments', true,
    'statistics', true,
    'ai_assistant', true,
    'invoices', true,
    'customer_service_bot', true,
    'loyalty_program', true
  ),
  jsonb_build_object(
    'customers', null,
    'ai_actions', 800,
    'whatsapp_messages', null
  ),
  279.00,
  249.00
);

-- Create function to check feature availability
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
  v_limit integer;
  v_usage integer := 0;
  v_usage_record subscription_usage;
BEGIN
  -- Get subscription
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
      'remaining', 0
    );
  END IF;

  -- Get plan
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Check if feature is available in plan
  v_is_available := v_plan.features->>p_feature_code = 'true';

  -- If feature is not available, return false
  IF NOT v_is_available THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Feature not available in current plan',
      'limit', 0,
      'usage', 0,
      'remaining', 0
    );
  END IF;

  -- Get feature limit
  v_limit := (v_plan.limits->>p_feature_code)::integer;

  -- Get current usage
  SELECT * INTO v_usage_record
  FROM subscription_usage
  WHERE business_id = p_business_id
  AND feature_code = p_feature_code;

  IF FOUND THEN
    v_usage := v_usage_record.usage_count;
  END IF;

  -- If limit is null, feature is unlimited
  IF v_limit IS NULL THEN
    RETURN jsonb_build_object(
      'available', true,
      'reason', 'Unlimited feature',
      'limit', null,
      'usage', v_usage,
      'remaining', null
    );
  END IF;

  -- Check if usage is within limit
  IF v_usage >= v_limit THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Usage limit reached',
      'limit', v_limit,
      'usage', v_usage,
      'remaining', 0
    );
  END IF;

  -- Feature is available and within limits
  RETURN jsonb_build_object(
    'available', true,
    'reason', 'Available',
    'limit', v_limit,
    'usage', v_usage,
    'remaining', v_limit - v_usage
  );
END;
$$;

-- Create function to increment feature usage
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
BEGIN
  -- Check if feature is available
  v_availability := check_feature_availability(p_business_id, p_feature_code);
  
  IF NOT (v_availability->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', v_availability->>'reason',
      'availability', v_availability
    );
  END IF;

  -- Get subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id
  AND status = 'active';

  -- Calculate reset date based on billing cycle
  v_reset_at := CASE
    WHEN v_subscription.billing_cycle = 'monthly' THEN
      v_subscription.current_period_end
    ELSE
      (date_trunc('month', now()) + interval '1 month')::date
  END;

  -- Get or create usage record
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
      p_increment,
      v_reset_at
    )
    RETURNING * INTO v_usage;
  ELSE
    -- Update usage
    UPDATE subscription_usage
    SET 
      usage_count = usage_count + p_increment,
      updated_at = now()
    WHERE id = v_usage.id
    RETURNING * INTO v_usage;
  END IF;

  -- Return updated usage
  RETURN jsonb_build_object(
    'success', true,
    'usage', v_usage.usage_count,
    'limit', (v_availability->>'limit')::integer,
    'remaining', 
      CASE 
        WHEN (v_availability->>'limit')::integer IS NULL THEN NULL
        ELSE (v_availability->>'limit')::integer - v_usage.usage_count
      END
  );
END;
$$;

-- Create function to get business subscription details
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
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE business_id = p_business_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_subscription', false
    );
  END IF;

  -- Get plan
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = v_subscription.plan_id;

  -- Get usage for all features
  SELECT jsonb_object_agg(feature_code, usage_count)
  INTO v_usage
  FROM subscription_usage
  WHERE business_id = p_business_id;

  -- Return subscription details
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
      'price', CASE 
        WHEN v_subscription.billing_cycle = 'monthly' THEN v_plan.monthly_price
        ELSE v_plan.yearly_price
      END
    ),
    'usage', COALESCE(v_usage, '{}'::jsonb)
  );
END;
$$;

-- Grant permissions
GRANT ALL ON subscription_plans TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON subscription_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_feature_availability TO authenticated;
GRANT EXECUTE ON FUNCTION increment_feature_usage TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_subscription TO authenticated;