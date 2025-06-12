-- יצירת פונקציה לעדכון סטטוס תור
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
  v_user_id uuid;
BEGIN
  -- קבלת התור
  SELECT * INTO v_appointment
  FROM appointments
  WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'התור לא נמצא'
    );
  END IF;

  -- וולידציה של הסטטוס
  IF p_status NOT IN ('booked', 'confirmed', 'completed', 'canceled', 'no_show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'סטטוס לא חוקי'
    );
  END IF;

  -- קבלת פרטי המשתמש
  v_user_id := auth.uid();
  
  SELECT name INTO v_user_name
  FROM users
  WHERE id = v_user_id;

  -- עדכון סטטוס התור
  UPDATE appointments
  SET 
    status = p_status,
    metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{status_change_reason}',
      to_jsonb(COALESCE(p_reason, 'עדכון סטטוס ידני'))
    ),
    updated_at = now(),
    -- עדכון שדות זמן לפי הסטטוס
    confirmed_at = CASE WHEN p_status = 'confirmed' THEN now() ELSE confirmed_at END,
    completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN p_status = 'canceled' THEN now() ELSE cancelled_at END,
    no_show_at = CASE WHEN p_status = 'no_show' THEN now() ELSE no_show_at END
  WHERE id = p_appointment_id;

  -- הוספת לוג לשינוי הסטטוס
  INSERT INTO appointment_logs (
    appointment_id,
    user_id,
    action,
    old_status,
    new_status,
    details
  ) VALUES (
    p_appointment_id,
    v_user_id,
    'status_change',
    v_appointment.status,
    p_status,
    jsonb_build_object(
      'timestamp', now(),
      'reason', COALESCE(p_reason, 'עדכון סטטוס ידני'),
      'user_name', v_user_name
    )
  );

  -- החזרת תשובה חיובית
  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', p_appointment_id,
    'old_status', v_appointment.status,
    'new_status', p_status
  );
END;
$$;

-- הענקת הרשאות הפעלה
GRANT EXECUTE ON FUNCTION update_appointment_status_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_status_v2 TO anon;