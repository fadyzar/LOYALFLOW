-- Drop existing policies if exist
DROP POLICY IF EXISTS "Allow public access to appointments" ON appointments;
DROP POLICY IF EXISTS "Allow public to insert appointments" ON appointments;

-- Create policies for appointments
CREATE POLICY "Allow public access to appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public to insert appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON appointments TO anon;