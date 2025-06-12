-- Drop existing function
DROP FUNCTION IF EXISTS set_customer_password(text, text, uuid);

-- Create customer_password_logs table
CREATE TABLE IF NOT EXISTS customer_password_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  business_id uuid REFERENCES businesses(id),
  action text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_password_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing logs
CREATE POLICY "Users can view their business password logs"
  ON customer_password_logs
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create function to set customer password with logging
CREATE OR REPLACE FUNCTION set_customer_password(
  p_phone text,
  p_password text,
  p_business_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer customers;
  v_log_id uuid;
BEGIN
  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE phone = p_phone 
  AND business_id = p_business_id;

  -- Log attempt
  INSERT INTO customer_password_logs (
    customer_id,
    business_id,
    action,
    status,
    details
  ) VALUES (
    v_customer.id,
    p_business_id,
    'set_password',
    'started',
    jsonb_build_object(
      'phone', p_phone,
      'has_existing_password', v_customer.password IS NOT NULL
    )
  ) RETURNING id INTO v_log_id;

  -- Update customer password
  UPDATE customers
  SET 
    password = encode(digest(p_password, 'sha256'), 'hex'),
    updated_at = NOW()
  WHERE id = v_customer.id;

  -- Log success
  UPDATE customer_password_logs
  SET 
    status = 'completed',
    details = details || jsonb_build_object(
      'completed_at', now()
    )
  WHERE id = v_log_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer.id,
    'log_id', v_log_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error
  IF v_log_id IS NOT NULL THEN
    UPDATE customer_password_logs
    SET 
      status = 'error',
      details = details || jsonb_build_object(
        'error', SQLERRM,
        'error_detail', SQLSTATE
      )
    WHERE id = v_log_id;
  END IF;

  -- Return error response
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT ALL ON customer_password_logs TO authenticated;
GRANT EXECUTE ON FUNCTION set_customer_password TO authenticated;
GRANT EXECUTE ON FUNCTION set_customer_password TO anon;