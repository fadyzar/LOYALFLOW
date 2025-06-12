-- Drop all existing functions and triggers
DROP TRIGGER IF EXISTS hash_customer_password_trigger ON customers;
DROP FUNCTION IF EXISTS hash_customer_password();
DROP FUNCTION IF EXISTS authenticate_customer(text, text, uuid);
DROP FUNCTION IF EXISTS set_customer_password(text, text, uuid);

-- Create function to hash password consistently
CREATE OR REPLACE FUNCTION hash_customer_password_v2(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(digest(p_password, 'sha256'), 'hex');
END;
$$;

-- Create trigger function for password hashing
CREATE OR REPLACE FUNCTION hash_customer_password_trigger_v2()
RETURNS trigger AS $$
BEGIN
  IF NEW.password IS NOT NULL AND 
     (OLD IS NULL OR OLD.password IS NULL OR NEW.password != OLD.password) THEN
    NEW.password := hash_customer_password_v2(NEW.password);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password hashing
CREATE TRIGGER hash_customer_password_trigger
  BEFORE INSERT OR UPDATE OF password ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password_trigger_v2();

-- Create function to authenticate customer
CREATE OR REPLACE FUNCTION authenticate_customer(
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
  v_hashed_password text;
  v_log_id uuid;
BEGIN
  -- Get customer by phone and business
  SELECT * INTO v_customer
  FROM customers
  WHERE phone = p_phone 
  AND business_id = p_business_id;

  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'לקוח לא נמצא';
  END IF;

  -- Hash the provided password using the shared function
  v_hashed_password := hash_customer_password_v2(p_password);

  -- Log authentication attempt
  INSERT INTO customer_password_logs (
    customer_id,
    business_id,
    action,
    status,
    details
  ) VALUES (
    v_customer.id,
    p_business_id,
    'authenticate',
    'started',
    jsonb_build_object(
      'phone', p_phone,
      'has_password', v_customer.password IS NOT NULL
    )
  ) RETURNING id INTO v_log_id;

  -- Check if password matches
  IF v_customer.password IS NULL OR v_customer.password != v_hashed_password THEN
    -- Log failed attempt
    UPDATE customer_password_logs
    SET 
      status = 'error',
      details = details || jsonb_build_object(
        'error', 'Invalid credentials',
        'error_detail', 'Password mismatch',
        'provided_hash', v_hashed_password,
        'stored_hash', v_customer.password
      )
    WHERE id = v_log_id;

    RAISE EXCEPTION 'סיסמה שגויה';
  END IF;

  -- Update last login
  UPDATE customers 
  SET last_login = now()
  WHERE id = v_customer.id;

  -- Log successful authentication
  UPDATE customer_password_logs
  SET 
    status = 'completed',
    details = details || jsonb_build_object(
      'completed_at', now()
    )
  WHERE id = v_log_id;

  -- Return customer data
  RETURN jsonb_build_object(
    'success', true,
    'customer_id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'business_id', v_customer.business_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Log error if we have a log entry
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

  -- Re-raise the exception
  RAISE;
END;
$$;

-- Create function to set customer password
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
  v_hashed_password text;
  v_log_id uuid;
BEGIN
  -- Get customer details
  SELECT * INTO v_customer
  FROM customers
  WHERE phone = p_phone 
  AND business_id = p_business_id;

  IF v_customer.id IS NULL THEN
    RAISE EXCEPTION 'לקוח לא נמצא';
  END IF;

  -- Hash the password using the shared function
  v_hashed_password := hash_customer_password_v2(p_password);

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
    password = v_hashed_password,
    updated_at = NOW()
  WHERE id = v_customer.id;

  -- Log success
  UPDATE customer_password_logs
  SET 
    status = 'completed',
    details = details || jsonb_build_object(
      'completed_at', now(),
      'password_hash', v_hashed_password
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
GRANT EXECUTE ON FUNCTION hash_customer_password_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_customer TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_customer TO anon;
GRANT EXECUTE ON FUNCTION set_customer_password TO authenticated;
GRANT EXECUTE ON FUNCTION set_customer_password TO anon;