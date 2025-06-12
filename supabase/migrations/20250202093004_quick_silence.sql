-- Create registration_log table for debugging
CREATE TABLE IF NOT EXISTS registration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  step integer NOT NULL,
  action text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create function to validate step data
CREATE OR REPLACE FUNCTION validate_registration_step(
  p_user_id uuid,
  p_step integer,
  p_data jsonb
) RETURNS boolean AS $$
DECLARE
  v_registration registration_steps;
BEGIN
  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Log validation attempt
  INSERT INTO registration_log (user_id, step, action, status, details)
  VALUES (p_user_id, p_step, 'validate', 'started', p_data);

  -- Validate based on step
  CASE p_step
    WHEN 1 THEN -- Basic info
      IF NOT (
        p_data->>'email' IS NOT NULL AND
        p_data->>'password' IS NOT NULL AND
        p_data->>'name' IS NOT NULL AND
        p_data->>'phone' IS NOT NULL
      ) THEN
        RETURN false;
      END IF;

    WHEN 2 THEN -- Business details
      IF NOT (
        p_data->>'name' IS NOT NULL AND
        p_data->>'type' IS NOT NULL
      ) THEN
        RETURN false;
      END IF;

    WHEN 3 THEN -- Business hours
      IF NOT (
        p_data->>'hours' IS NOT NULL AND
        jsonb_typeof(p_data->'hours') = 'object'
      ) THEN
        RETURN false;
      END IF;

    WHEN 4 THEN -- Services
      IF NOT (
        p_data->>'services' IS NOT NULL AND
        jsonb_typeof(p_data->'services') = 'array' AND
        jsonb_array_length(p_data->'services') > 0
      ) THEN
        RETURN false;
      END IF;

    ELSE
      RETURN false;
  END CASE;

  -- Log successful validation
  UPDATE registration_log
  SET status = 'completed'
  WHERE user_id = p_user_id AND step = p_step AND status = 'started';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to complete registration
CREATE OR REPLACE FUNCTION complete_registration(
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_registration registration_steps;
  v_business_id uuid;
BEGIN
  -- Get registration data
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Start transaction
  BEGIN
    -- Create business
    INSERT INTO businesses (
      name,
      booking_link,
      settings
    ) VALUES (
      v_registration.steps_data->'2'->>'name',
      lower(regexp_replace(v_registration.steps_data->'2'->>'name', '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
      jsonb_build_object(
        'theme', 'light',
        'notifications', true,
        'language', 'he',
        'type', v_registration.steps_data->'2'->>'type'
      )
    )
    RETURNING id INTO v_business_id;

    -- Update user
    UPDATE users
    SET 
      business_id = v_business_id,
      role = 'admin'
    WHERE id = p_user_id;

    -- Create business hours
    INSERT INTO business_hours (
      business_id,
      regular_hours,
      special_dates
    ) VALUES (
      v_business_id,
      v_registration.steps_data->'3'->'hours',
      '[]'::jsonb
    );

    -- Create services
    INSERT INTO services (
      business_id,
      name,
      name_he,
      price,
      duration
    )
    SELECT
      v_business_id,
      service->>'name',
      service->>'name_he',
      (service->>'price')::decimal,
      (service->>'duration' || ' minutes')::interval
    FROM jsonb_array_elements(v_registration.steps_data->'4'->'services') as service;

    -- Mark registration as completed
    UPDATE registration_steps
    SET 
      completed_at = now(),
      business_id = v_business_id
    WHERE user_id = p_user_id;

    -- Log completion
    INSERT INTO registration_log (
      user_id,
      step,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      5,
      'complete',
      'completed',
      jsonb_build_object(
        'business_id', v_business_id
      )
    );

    RETURN v_business_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log error
    INSERT INTO registration_log (
      user_id,
      step,
      action,
      status,
      details
    ) VALUES (
      p_user_id,
      5,
      'complete',
      'error',
      jsonb_build_object(
        'error', SQLERRM,
        'state', SQLSTATE
      )
    );
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON registration_log TO authenticated;
GRANT EXECUTE ON FUNCTION validate_registration_step TO authenticated;
GRANT EXECUTE ON FUNCTION complete_registration TO authenticated;