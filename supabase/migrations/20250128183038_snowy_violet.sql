-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create registration_steps table to track progress
CREATE TABLE IF NOT EXISTS auth.registration_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  step integer NOT NULL DEFAULT 1,
  business_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create function to update step timestamp
CREATE OR REPLACE FUNCTION auth.update_registration_step_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
CREATE TRIGGER update_registration_step_timestamp
  BEFORE UPDATE ON auth.registration_steps
  FOR EACH ROW
  EXECUTE FUNCTION auth.update_registration_step_timestamp();

-- Create enhanced function to handle new user registration
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  business_name text;
  user_phone text;
BEGIN
  -- Get data from raw_user_meta_data
  business_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'העסק של ' || split_part(NEW.email, '@', 1));
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');

  -- Step 1: Create initial registration record
  INSERT INTO auth.registration_steps (
    user_id,
    metadata
  ) VALUES (
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'business_name', business_name,
      'phone', user_phone
    )
  );

  -- Step 2: Create basic user record
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
      'phone', user_phone
    )
  );

  -- Update step to indicate user creation is complete
  UPDATE auth.registration_steps
  SET 
    step = 2,
    metadata = metadata || jsonb_build_object('user_created_at', now())
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle business creation
CREATE OR REPLACE FUNCTION auth.create_business_for_user(user_id uuid)
RETURNS uuid AS $$
DECLARE
  new_business_id uuid;
  reg_data auth.registration_steps;
BEGIN
  -- Get registration data
  SELECT * INTO reg_data
  FROM auth.registration_steps
  WHERE user_id = user_id
  FOR UPDATE;

  IF reg_data.step != 2 THEN
    RAISE EXCEPTION 'Invalid registration step';
  END IF;

  -- Create business
  INSERT INTO public.businesses (
    name,
    booking_link,
    settings
  )
  VALUES (
    reg_data.metadata->>'business_name',
    lower(regexp_replace(split_part(reg_data.metadata->>'email', '@', 1), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    jsonb_build_object(
      'theme', 'light',
      'notifications', true,
      'language', 'he'
    )
  )
  RETURNING id INTO new_business_id;

  -- Update user with business_id
  UPDATE public.users
  SET 
    business_id = new_business_id,
    metadata = metadata || jsonb_build_object(
      'business_id', new_business_id,
      'business_name', reg_data.metadata->>'business_name'
    )
  WHERE id = user_id;

  -- Update registration step
  UPDATE auth.registration_steps
  SET 
    step = 3,
    business_id = new_business_id,
    metadata = metadata || jsonb_build_object(
      'business_created_at', now(),
      'business_id', new_business_id
    )
  WHERE user_id = user_id;

  RETURN new_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle branch creation
CREATE OR REPLACE FUNCTION auth.create_branch_for_business(business_id uuid)
RETURNS uuid AS $$
DECLARE
  new_branch_id uuid;
BEGIN
  -- Create default branch
  INSERT INTO public.branches (
    business_id,
    name,
    location
  ) VALUES (
    business_id,
    'סניף ראשי',
    jsonb_build_object(
      'address', '',
      'city', '',
      'country', 'IL'
    )
  )
  RETURNING id INTO new_branch_id;

  -- Update registration step
  UPDATE auth.registration_steps
  SET 
    step = 4,
    metadata = metadata || jsonb_build_object(
      'branch_created_at', now(),
      'branch_id', new_branch_id
    )
  WHERE business_id = business_id;

  RETURN new_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle service creation
CREATE OR REPLACE FUNCTION auth.create_service_for_business(business_id uuid)
RETURNS uuid AS $$
DECLARE
  new_service_id uuid;
BEGIN
  -- Create default service
  INSERT INTO public.services (
    business_id,
    name,
    name_he,
    price,
    duration
  ) VALUES (
    business_id,
    'Basic Service',
    'שירות בסיסי',
    100,
    interval '30 minutes'
  )
  RETURNING id INTO new_service_id;

  -- Update registration step
  UPDATE auth.registration_steps
  SET 
    step = 5,
    metadata = metadata || jsonb_build_object(
      'service_created_at', now(),
      'service_id', new_service_id
    )
  WHERE business_id = business_id;

  RETURN new_service_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle business hours creation
CREATE OR REPLACE FUNCTION auth.create_hours_for_business(business_id uuid)
RETURNS uuid AS $$
DECLARE
  new_hours_id uuid;
BEGIN
  -- Create default business hours
  INSERT INTO public.business_hours (
    business_id,
    regular_hours,
    special_dates
  ) VALUES (
    business_id,
    jsonb_build_object(
      'sunday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'monday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'tuesday',   jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'wednesday', jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'thursday',  jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'friday',    jsonb_build_object('is_active', true, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb),
      'saturday',  jsonb_build_object('is_active', false, 'start_time', '09:00', 'end_time', '17:00', 'breaks', '[]'::jsonb)
    ),
    '[]'::jsonb
  )
  RETURNING id INTO new_hours_id;

  -- Update registration step
  UPDATE auth.registration_steps
  SET 
    step = 6,
    metadata = metadata || jsonb_build_object(
      'hours_created_at', now(),
      'hours_id', new_hours_id
    )
  WHERE business_id = business_id;

  RETURN new_hours_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON auth.registration_steps TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.create_business_for_user TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.create_branch_for_business TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.create_service_for_business TO postgres, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.create_hours_for_business TO postgres, authenticated, service_role;