-- Add updated_at column to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger function to update timestamp
CREATE OR REPLACE FUNCTION update_customer_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_updated_at();

-- Update existing records to set initial updated_at value
UPDATE customers 
SET updated_at = created_at 
WHERE updated_at IS NULL;