-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their business users" ON users;
DROP POLICY IF EXISTS "Users can manage their business users" ON users;

-- Create new policies
CREATE POLICY "Allow public access to business staff"
  ON users
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON users TO anon;