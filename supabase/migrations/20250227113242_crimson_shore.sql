-- Drop existing policies
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON customers;

-- Create new policies
CREATE POLICY "Allow public registration"
  ON customers
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public login"
  ON customers
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT, INSERT ON customers TO anon;