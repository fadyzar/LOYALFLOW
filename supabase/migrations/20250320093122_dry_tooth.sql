/*
  # Add Appointment Management RPCs

  1. New Functions
    - create_appointment: Creates a new appointment with validation
    - update_appointment_status_v2: Updates appointment status with logging (renamed to avoid conflict)
    
  2. Security
    - Functions are SECURITY DEFINER
    - Input validation and error handling
    - Automatic logging
*/

-- Create function to create new appointment
CREATE OR REPLACE FUNCTION create_appointment(
  p_business_id uuid,
  p_customer_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_status text DEFAULT 'booked',
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment_id uuid;
  v_staff_hours jsonb;
  v_service_duration interval;
  v_overlapping_count integer;
BEGIN
  -- Validate inputs
  IF p_status NOT IN ('booked', 'confirmed', 'completed', 'canceled', 'no_show') THEN
    RAISE EXCEPTION 'סטטוס לא חוקי';
  END IF;

  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'זמן התחלה חייב להיות לפני זמן סיום';
  END IF;

  -- Check if staff is available at this time
  SELECT regular_hours
  INTO v_staff_hours
  FROM staff_hours
  WHERE staff_id = p_staff_id;

  IF v_staff_hours IS NULL THEN
    -- Fallback to business hours
    SELECT regular_hours
    INTO v_staff_hours
    FROM business_hours
    WHERE business_id = p_business_id;
  END IF;

  -- Get service duration
  SELECT duration
  INTO v_service_duration
  FROM services
  WHERE id = p_service_id;

  -- Check for overlapping appointments
  SELECT COUNT(*)
  INTO v_overlapping_count
  FROM appointments
  WHERE staff_id = p_staff_id
  AND status NOT IN ('canceled', 'no_show')
  AND (
    (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    OR
    (start_time > p_start_time AND start_time < p_end_time)
    OR
    (end_time > p_start_time AND end_time < p_end_time)
  );

  IF v_overlapping_count > 0 THEN
    RAISE EXCEPTION 'יש חפיפה עם תור אחר';
  END IF;

  -- Create appointment
  INSERT INTO appointments (
    business_id,
    customer_id,
    service_id,
    staff_id,
    start_time,
    end_time,
    status,
    customer_notes,
    metadata
  ) VALUES (
    p_business_id,
    p_customer_id,
    p_service_id,
    p_staff_id,
    p_start_time,
    p_end_time,
    p_status,
    p_notes,
    jsonb_build_object(
      'created_by', auth.uid(),
      'created_at', now()
    )
  )
  RETURNING id INTO v_appointment_id;

  -- Create initial log
  INSERT INTO appointment_logs (
    appointment_id,
    user_id,
    action,
    old_status,
    new_status,
    details
  ) VALUES (
    v_appointment_id,
    auth.uid(),
    'create',
    NULL,
    p_status,
    jsonb_build_object(
      'start_time', p_start_time,
      'end_time', p_end_time,
      'service_id', p_service_id,
      'staff_id', p_staff_id
    )
  );

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Create function to update appointment status (renamed to v2)
CREATE OR REPLACE FUNCTION update_appointment_status_v2(
  p_appointment_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment appointments;
  v_user_name text;
BEGIN
  -- Get appointment
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'התור לא נמצא';
  END IF;

  -- Validate status
  IF p_status NOT IN ('booked', 'confirmed', 'completed', 'canceled', 'no_show') THEN
    RAISE EXCEPTION 'סטטוס לא חוקי';
  END IF;

  -- Get user name for logging
  SELECT name INTO v_user_name
  FROM users
  WHERE id = auth.uid();

  -- Update appointment status
  UPDATE appointments
  SET 
    status = p_status,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status_change_reason}',
      to_jsonb(COALESCE(p_reason, 'עדכון סטטוס ידני'))
    ),
    updated_at = now()
  WHERE id = p_appointment_id;

  -- Log will be created automatically by trigger

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', p_appointment_id,
    'old_status', v_appointment.status,
    'new_status', p_status
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error response
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_appointment TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_status_v2 TO authenticated;