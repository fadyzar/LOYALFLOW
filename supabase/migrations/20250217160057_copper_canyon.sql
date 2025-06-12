-- Enable RLS for appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policy for viewing appointments
CREATE POLICY "Users can view their business appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Create policy for managing appointments
CREATE POLICY "Users can manage their business appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON appointments TO authenticated;