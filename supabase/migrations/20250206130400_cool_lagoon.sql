-- Add loyalty program fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS diamonds integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_level text DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS loyalty_stats jsonb DEFAULT jsonb_build_object(
  'total_visits', 0,
  'consecutive_visits', 0,
  'last_visit', null,
  'referrals', 0,
  'total_spent', 0,
  'achievements', '[]'::jsonb
),
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for loyalty level and points
CREATE INDEX IF NOT EXISTS idx_customers_loyalty_level ON customers(loyalty_level);
CREATE INDEX IF NOT EXISTS idx_customers_points ON customers(points);
CREATE INDEX IF NOT EXISTS idx_customers_diamonds ON customers(diamonds);

-- Add check constraint for loyalty level
ALTER TABLE customers
ADD CONSTRAINT valid_loyalty_level
CHECK (loyalty_level IN ('bronze', 'silver', 'gold', 'diamond', 'vip'));

-- Create function to update loyalty level based on diamonds
CREATE OR REPLACE FUNCTION update_loyalty_level()
RETURNS trigger AS $$
BEGIN
  NEW.loyalty_level := 
    CASE
      WHEN NEW.diamonds >= 50 THEN 'vip'
      WHEN NEW.diamonds >= 30 THEN 'diamond'
      WHEN NEW.diamonds >= 20 THEN 'gold'
      WHEN NEW.diamonds >= 10 THEN 'silver'
      ELSE 'bronze'
    END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update loyalty level
CREATE TRIGGER update_customer_loyalty_level
  BEFORE INSERT OR UPDATE OF diamonds ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_level();

-- Add RLS policies
CREATE POLICY "Users can view their business customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );