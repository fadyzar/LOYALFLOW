/*
  # Update cancel_appointment function

  1. Changes
    - Update function to handle appointment logs without user_id
    - Add better error handling and validation
  
  2. Security
    - Function remains accessible to public role
    - Validates customer ownership before cancellation
*/

CREATE OR REPLACE FUNCTION public.cancel_appointment(
  appointment_id uuid,
  customer_phone text,
  reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_appointment appointments;
BEGIN
  -- Get the customer ID for the phone
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = customer_phone;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'לקוח לא נמצא';
  END IF;

  -- Get appointment details
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = appointment_id
  AND customer_id = v_customer_id
  AND status NOT IN ('canceled', 'completed')
  FOR UPDATE;

  IF v_appointment IS NULL THEN
    RAISE EXCEPTION 'לא ניתן לבטל את התור';
  END IF;

  -- Update the appointment
  UPDATE appointments
  SET 
    status = 'canceled',
    cancelled_at = NOW(),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status_change_reason}',
      to_jsonb(COALESCE(reason, 'ביטול תור'))
    )
  WHERE id = appointment_id;

  -- Create appointment log
  INSERT INTO appointment_logs (
    appointment_id,
    action,
    old_status,
    new_status,
    details
  ) VALUES (
    appointment_id,
    'status_change',
    v_appointment.status,
    'canceled',
    jsonb_build_object(
      'reason', COALESCE(reason, 'ביטול תור'),
      'timestamp', NOW()
    )
  );

END;
$$;