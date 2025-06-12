-- Add status tracking columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS no_show_at timestamptz;

-- Add metadata column for additional data
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create appointment_logs table
CREATE TABLE IF NOT EXISTS appointment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  action text NOT NULL,
  old_status text,
  new_status text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_at ON appointments(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_confirmed_at ON appointments(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_completed_at ON appointments(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_no_show_at ON appointments(no_show_at) WHERE no_show_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointment_logs_appointment ON appointment_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_user ON appointment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_logs_created ON appointment_logs(created_at);

-- Enable RLS
ALTER TABLE appointment_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Grant permissions
GRANT ALL ON appointment_logs TO authenticated;

-- Create function to update status timestamps and log changes
CREATE OR REPLACE FUNCTION update_appointment_status()
RETURNS trigger AS $$
BEGIN
  -- Update status timestamp
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    NEW.cancelled_at = now();
  ELSIF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = now();
  ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    NEW.no_show_at = now();
  END IF;
  
  -- Log status change
  IF NEW.status != OLD.status THEN
    INSERT INTO appointment_logs (
      appointment_id,
      user_id,
      action,
      old_status,
      new_status,
      details
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      OLD.status,
      NEW.status,
      jsonb_build_object(
        'timestamp', now(),
        'reason', NEW.metadata->>'status_change_reason'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
DROP TRIGGER IF EXISTS update_appointment_status_trigger ON appointments;
CREATE TRIGGER update_appointment_status_trigger
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status();