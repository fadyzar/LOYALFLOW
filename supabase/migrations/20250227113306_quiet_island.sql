-- Add password column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS password text;

-- Add function to hash passwords
CREATE OR REPLACE FUNCTION hash_password(password text)
RETURNS text AS $$
BEGIN
  -- בהמשך נחליף את זה בהצפנה אמיתית
  -- כרגע זה רק לצורך הדגמה
  RETURN password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to automatically hash passwords
CREATE OR REPLACE FUNCTION hash_customer_password()
RETURNS trigger AS $$
BEGIN
  IF NEW.password IS NOT NULL THEN
    NEW.password := hash_password(NEW.password);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS hash_customer_password_trigger ON customers;

-- Create trigger
CREATE TRIGGER hash_customer_password_trigger
  BEFORE INSERT OR UPDATE OF password ON customers
  FOR EACH ROW
  EXECUTE FUNCTION hash_customer_password();

-- Grant execute permission on hash_password function
GRANT EXECUTE ON FUNCTION hash_password TO authenticated;

-- Grant anonymous access to customers table for registration
GRANT INSERT ON customers TO anon;