/*
  # Update business hours schema

  1. Changes
    - Drop existing policy if exists
    - Create new policy with a different name
*/

-- Drop existing policy if exists
DROP POLICY IF EXISTS "enable_all_access" ON business_hours;

-- Create new policy with a different name
CREATE POLICY "allow_business_hours_access"
  ON business_hours
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_business_hours_business'
  ) THEN
    CREATE INDEX idx_business_hours_business ON business_hours(business_id);
  END IF;
END $$;