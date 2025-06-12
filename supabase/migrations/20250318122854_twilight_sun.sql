-- Create function to set customer password
CREATE OR REPLACE FUNCTION set_customer_password(
  p_phone text,
  p_password text,
  p_business_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update customer password
  UPDATE customers
  SET 
    password = encode(digest(p_password, 'sha256'), 'hex'),
    updated_at = NOW()
  WHERE 
    phone = p_phone 
    AND business_id = p_business_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION set_customer_password TO authenticated;
GRANT EXECUTE ON FUNCTION set_customer_password TO anon;