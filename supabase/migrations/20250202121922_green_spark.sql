-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  business_name text;
  user_phone text;
BEGIN
  -- Get data from raw_user_meta_data with defaults
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'העסק של ' || split_part(NEW.email, '@', 1));
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Create user record first
  INSERT INTO public.users (
    id,
    email,
    phone,
    role,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    user_phone,
    'admin',
    jsonb_build_object(
      'email', NEW.email,
      'phone', user_phone,
      'created_at', now()
    )
  );

  -- Create registration record
  INSERT INTO registration_steps (
    user_id,
    type,
    steps_data
  ) VALUES (
    NEW.id,
    'business',
    jsonb_build_object(
      '1', jsonb_build_object(
        'email', NEW.email,
        'phone', user_phone
      )
    )
  );

  -- Add registration log entry
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    NEW.id,
    1,
    'create_user',
    'completed',
    jsonb_build_object(
      'email', NEW.email,
      'phone', user_phone
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Create function to validate registration data
CREATE OR REPLACE FUNCTION validate_registration_data(
  p_user_id uuid,
  p_step integer,
  p_data jsonb
) RETURNS boolean AS $$
BEGIN
  -- Log validation attempt
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    p_user_id,
    p_step,
    'validate',
    'started',
    p_data
  );

  -- Validate based on step
  CASE p_step
    WHEN 1 THEN -- Basic info
      IF NOT (
        p_data->>'email' IS NOT NULL AND
        p_data->>'password' IS NOT NULL
      ) THEN
        RETURN false;
      END IF;

    WHEN 2 THEN -- Business details
      IF NOT (
        p_data->>'name' IS NOT NULL AND
        p_data->>'phone' IS NOT NULL
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
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    p_user_id,
    p_step,
    'validate',
    'completed',
    p_data
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update registration step
CREATE OR REPLACE FUNCTION update_registration_step(
  p_user_id uuid,
  p_step integer,
  p_data jsonb
) RETURNS registration_steps AS $$
DECLARE
  v_registration registration_steps;
BEGIN
  -- Get registration record
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Validate step data
  IF NOT validate_registration_data(p_user_id, p_step, p_data) THEN
    RAISE EXCEPTION 'Invalid step data';
  END IF;

  -- Update step data
  UPDATE registration_steps
  SET
    steps_data = jsonb_set(steps_data, ARRAY[p_step::text], p_data),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO v_registration;

  -- Log step update
  INSERT INTO registration_log (
    user_id,
    step,
    action,
    status,
    details
  ) VALUES (
    p_user_id,
    p_step,
    'update',
    'completed',
    p_data
  );

  RETURN v_registration;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_registration_data TO authenticated;
GRANT EXECUTE ON FUNCTION update_registration_step TO authenticated;