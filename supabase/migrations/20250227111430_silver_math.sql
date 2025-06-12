-- Create policy for public access to business booking links
CREATE POLICY "Allow public access to business booking links"
  ON businesses
  FOR SELECT 
  TO public
  USING (true);

-- Create policy for public access to business hours
CREATE POLICY "Allow public access to business hours"
  ON business_hours
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON businesses TO anon;
GRANT SELECT ON business_hours TO anon;