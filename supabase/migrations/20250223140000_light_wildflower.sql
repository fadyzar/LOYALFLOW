-- Add status tracking columns to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS completed_at timestamptz,
ADD COLUMN IF NOT EXISTS no_show_at timestamptz;

-- Add metadata column for additional data
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for status tracking columns
CREATE INDEX IF NOT EXISTS idx_appointments_cancelled_at ON appointments(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_confirmed_at ON appointments(confirmed_at) WHERE confirmed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_completed_at ON appointments(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_no_show_at ON appointments(no_show_at) WHERE no_show_at IS NOT NULL;

-- Create function to update status timestamps
CREATE OR REPLACE FUNCTION update_appointment_status_timestamp()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'canceled' AND OLD.status != 'canceled' THEN
    NEW.cancelled_at = now();
  ELSIF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    NEW.confirmed_at = now();
  ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
    NEW.no_show_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status timestamp updates
CREATE TRIGGER update_appointment_status_timestamp
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status_timestamp();