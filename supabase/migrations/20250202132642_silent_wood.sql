-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create simplified function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Step 1: Create user record first
  INSERT INTO public.users (
    id,
    email,
    role,
    metadata
  ) VALUES (
    NEW.id,
    NEW.email,
    'admin',
    jsonb_build_object(
      'email', NEW.email,
      'phone', COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      'created_at', now()
    )
  );

  -- Step 2: Create registration record
  INSERT INTO registration_steps (
    user_id,
    type,
    current_step,
    steps_data
  ) VALUES (
    NEW.id,
    'business',
    1,
    jsonb_build_object(
      '1', jsonb_build_object(
        'email', NEW.email,
        'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
      )
    )
  );

  -- Log registration start
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
      'phone', COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Update complete_registration function to handle business creation
CREATE OR REPLACE FUNCTION complete_registration(
  p_user_id uuid
) RETURNS uuid AS $$
DECLARE
  v_registration registration_steps;
  v_business_id uuid;
  v_business_name text;
BEGIN
  -- Get registration data
  SELECT * INTO v_registration
  FROM registration_steps
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Get business name from step 2 data
  v_business_name := v_registration.steps_data->'2'->>'name';
  IF v_business_name IS NULL THEN
    v_business_name := 'העסק של ' || (SELECT email FROM users WHERE id = p_user_id);
  END IF;

  -- Start transaction
  BEGIN
    -- Step 1: Create business
    INSERT INTO businesses (
      name,
      booking_link,
      settings
    ) VALUES (
      v_business_name,
      lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
      jsonb_build_object(
        'theme', 'light',
        'notifications', true,
        'language', 'he',
        'type', v_registration.steps_data->'2'->>'type'
      )
    )
    RETURNING id INTO v_business_id;

    -- Step 2: Update user with business_id
    UPDATE users
    SET 
      business_id = v_business_id,
      metadata = metadata || jsonb_build_object(
        'business_id', v_business_id,
        'business_name', v_business_name
      )
    WHERE id = p_user_id;

    -- Step 3: Create default branch
    INSERT INTO branches (
      business_id,
      name,
      location
    ) VALUES (
      v_business_id,
      'סניף ראשי',
      jsonb_build_object(
        'address', '',
        'city', '',
        'country', 'IL'
      )
    );

    -- Step 4: Create default service
    INSERT INTO services (
      business_id,
      name,
      name_he,
      price,
      duration
    ) VALUES (
      v_business_id,
      'Basic Service',
      'שירות בסיסי',
      100,
      interval '30 minutes'
    );

    -- Step 5: Create business hours
    INSERT INTO business_hours (
      business_id,
      regular_hours,
      special_dates
    ) VALUES (
      v_business_id,
      COALESCE(
        v_registration.steps_data->'3'->'hours',
        jsonb_build_object(
          'sunday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'monday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'tuesday',   jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'wednesday', jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'thursday',  jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'friday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
          'saturday',  jsonb_build_object('is_active', false, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb)
        )
      ),
      '[]'::jsonb
    );

    -- Step 6: Update registration record
    UPDATE registration_steps
    SET 
      business_id = v_business_id,
      completed_at = now()
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