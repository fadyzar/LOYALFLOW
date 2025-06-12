-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their business staff services" ON staff_services;
DROP POLICY IF EXISTS "Users can manage their business staff services" ON staff_services;

-- Create new policies
CREATE POLICY "Allow public access to staff services"
  ON staff_services
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON staff_services TO anon;