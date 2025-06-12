-- Create policy for public access to appointments
CREATE POLICY "Allow public access to appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions
GRANT SELECT ON appointments TO anon;