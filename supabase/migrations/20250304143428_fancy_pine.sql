-- Drop existing policy if exists
DROP POLICY IF EXISTS "Allow public access to appointments" ON appointments;

-- Create policy for public access to appointments
CREATE POLICY "Allow public access to appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (true);

-- Grant permissions if not already granted
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants 
    WHERE grantee = 'anon' 
    AND table_name = 'appointments'
    AND privilege_type = 'SELECT'
  ) THEN
    GRANT SELECT ON appointments TO anon;
  END IF;
END $$;