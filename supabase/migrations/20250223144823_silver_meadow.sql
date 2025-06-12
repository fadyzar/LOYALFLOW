-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can view their business appointment logs" ON appointment_logs;
DROP POLICY IF EXISTS "Users can insert appointment logs" ON appointment_logs;

-- Create policies for appointment_logs
CREATE POLICY "Users can view their business appointment logs"
  ON appointment_logs
  FOR SELECT
  TO authenticated
  USING (
    appointment_id IN (
      SELECT id FROM appointments WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert appointment logs"
  ON appointment_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    appointment_id IN (
      SELECT id FROM appointments WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Grant permissions
GRANT ALL ON appointment_logs TO authenticated;