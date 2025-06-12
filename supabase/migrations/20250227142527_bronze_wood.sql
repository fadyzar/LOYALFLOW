-- Add password and auth fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password text,
ADD COLUMN IF NOT EXISTS auth_id text UNIQUE,
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS hash_customer_password_trigger ON customers;

-- Add function to hash passwords
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS trigger AS $$
BEGIN
  IF NEW.password IS NOT NULL AND 
     (OLD IS NULL OR OLD.password IS NULL OR NEW.password != OLD.password) THEN
    -- בהמשך נשתמש בהצפנה חזקה יותר
    NEW.password := encode(digest(NEW.password, 'sha256'), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for password hashing
CREATE TRIGGER hash_customer_password_trigger
  BEFORE INSERT OR UPDATE OF password ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password();

-- Create function to authenticate customer
CREATE OR REPLACE FUNCTION authenticate_customer(
  p_phone text,
  p_password text,
  p_business_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_customer customers;
  v_hashed_password text;
BEGIN
  -- Hash the provided password
  v_hashed_password := encode(digest(p_password, 'sha256'), 'hex');

  -- Get customer by phone and business
  SELECT * INTO v_customer
  FROM customers
  WHERE phone = p_phone 
  AND business_id = p_business_id;

  -- Check if customer exists and password matches
  IF v_customer.id IS NULL OR 
     v_customer.password != v_hashed_password THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;

  -- Update last login
  UPDATE customers 
  SET last_login = now()
  WHERE id = v_customer.id;

  -- Return customer data as jsonb
  RETURN jsonb_build_object(
    'id', v_customer.id,
    'name', v_customer.name,
    'phone', v_customer.phone,
    'business_id', v_customer.business_id
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION authenticate_customer TO authenticated;
GRANT EXECUTE ON FUNCTION authenticate_customer TO anon;
