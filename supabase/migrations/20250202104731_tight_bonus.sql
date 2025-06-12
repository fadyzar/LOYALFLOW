-- Add more detailed logging to update_registration_step function
CREATE OR REPLACE FUNCTION update_registration_step(
  p_user_id uuid,
  p_step integer,
  p_data jsonb
) RETURNS registration_steps AS $$
DECLARE
  v_registration registration_steps;
BEGIN
  -- Log start of step update
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    p_user_id,
    p_step,
    'update_step',
    'started',
    p_data
  );

  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Log error
    INSERT INTO registration_log (
      user_id,
      step,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      p_step,
      'update_step',
      'error',
      jsonb_build_object(
        'error', 'Registration not found',
        'user_id', p_user_id
      )
    );
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Validate current step
  IF p_step != v_registration.current_step THEN
    -- Log error
    INSERT INTO registration_log (
      user_id,
      step,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      p_step,
      'update_step',
      'error',
      jsonb_build_object(
        'error', 'Invalid step',
        'expected', v_registration.current_step,
        'received', p_step
      )
    );
    RAISE EXCEPTION 'Invalid step';
  END IF;

  -- Update step data
  UPDATE registration_steps
  SET
    steps_data = jsonb_set(steps_data, ARRAY[p_step::text], p_data),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_registration;

  -- Log data update
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    p_user_id,
    p_step,
    'update_step',
    'updated',
    jsonb_build_object(
      'step_data', p_data
    )
  );

  -- Validate step completion
  IF validate_step_completion(p_user_id, p_step) THEN
    -- Update step status
    UPDATE registration_steps
    SET
      completed_steps = array_append(completed_steps, p_step),
      current_step = 
        CASE 
          WHEN type = 'business' AND p_step = 4 THEN p_step  -- Last step for business
          WHEN type = 'staff' AND p_step = 2 THEN p_step     -- Last step for staff
          ELSE p_step + 1
        END,
      completed_at = 
        CASE 
          WHEN (type = 'business' AND p_step = 4) OR (type = 'staff' AND p_step = 2)
          THEN now()
          ELSE null
        END
    WHERE user_id = p_user_id
    RETURNING * INTO v_registration;

    -- Log step completion
    INSERT INTO registration_log (
      user_id,
      step,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      p_step,
      'complete_step',
      'completed',
      jsonb_build_object(
        'next_step', v_registration.current_step,
        'completed_steps', v_registration.completed_steps,
        'is_registration_completed', v_registration.completed_at IS NOT NULL
      )
    );
  END IF;

  RETURN v_registration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to get registration progress
CREATE OR REPLACE FUNCTION get_registration_progress(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_registration registration_steps;
  v_log_entries jsonb;
BEGIN
  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', 'Registration not found',
      'user_id', p_user_id
    );
  END IF;

  -- Get log entries
  SELECT jsonb_agg(
    jsonb_build_object(
      'step', step,
      'action', action,
      'status', status,
      'created_at', created_at,
      'details', details
    )
    ORDER BY created_at DESC
  )
  INTO v_log_entries
  FROM registration_log
  WHERE user_id = p_user_id;

  -- Return progress details
  RETURN jsonb_build_object(
    'type', v_registration.type,
    'current_step', v_registration.current_step,
    'completed_steps', v_registration.completed_steps,
    'steps_data', v_registration.steps_data,
    'created_at', v_registration.created_at,
    'updated_at', v_registration.updated_at,
    'completed_at', v_registration.completed_at,
    'log_entries', COALESCE(v_log_entries, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_registration_progress TO authenticated;