-- Drop existing trigger and function
DROP TRIGGER IF EXISTS update_appointment_status_trigger ON appointments;
DROP FUNCTION IF EXISTS update_appointment_status();

-- Create function to update status timestamps and log changes
CREATE OR REPLACE FUNCTION update_appointment_status()
RETURNS trigger AS $$
DECLARE
  v_user_name text;
BEGIN
  -- Get user name
  SELECT name INTO v_user_name
  FROM users
  WHERE id = auth.uid();

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
        'reason', NEW.metadata->>'status_change_reason',
        'user_name', v_user_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER update_appointment_status_trigger
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status();