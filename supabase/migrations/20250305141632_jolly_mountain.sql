/*
  # Add cancel_appointment function

  1. New Functions
    - cancel_appointment: Function to safely cancel an appointment and update related fields
  
  2. Security
    - Function is accessible to public role
    - Validates customer ownership before cancellation
*/

-- Create function to cancel appointments
CREATE OR REPLACE FUNCTION public.cancel_appointment(
  appointment_id uuid,
  reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_phone text;
BEGIN
  -- Get the customer phone from the JWT claims
  v_phone := current_setting('request.jwt.claims', true)::json->>'phone';
  
  -- Get the customer ID for the phone
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = v_phone;

  -- Update the appointment only if it belongs to the customer
  UPDATE appointments
  SET 
    status = 'canceled',
    cancelled_at = NOW(),
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status_change_reason}',
      to_jsonb(COALESCE(reason, 'ביטול תור'))
    )
  WHERE 
    id = appointment_id
    AND customer_id = v_customer_id
    AND status NOT IN ('canceled', 'completed');

  -- Throw an error if no rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'לא ניתן לבטל את התור';
  END IF;
END;
$$;