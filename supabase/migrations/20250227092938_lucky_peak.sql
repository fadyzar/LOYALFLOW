-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their business customers" ON customers;
DROP POLICY IF EXISTS "Users can manage their business customers" ON customers;

-- Create new simplified policy
CREATE POLICY "Enable all access for authenticated users"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON customers TO authenticated;