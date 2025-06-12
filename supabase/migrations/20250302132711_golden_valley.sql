-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their business services" ON services;
DROP POLICY IF EXISTS "Users can manage their business services" ON services;

-- Create new policies
CREATE POLICY "Allow public access to business services"
  ON services
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON services TO anon;